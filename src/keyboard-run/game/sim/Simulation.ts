import type RAPIER from "@dimforge/rapier3d-compat";
import type { Collider, KinematicCharacterController, RigidBody, World } from "@dimforge/rapier3d-compat";
import { playerBody, playerMovement, SIM_STEP_SEC, type PlayerMovementConfig } from "../../data/movement.ts";
import type { StageDefinition, Vec3 } from "../../types/stage";
import { layoutStage, type Part } from "../stageLayout.ts";
import { DynamicPart } from "./dynamicParts.ts";
import { nextMotion, NO_INPUT, RESTING, type MotionState, type SimInput } from "./playerMotion.ts";

// The game world with no rendering: physics, obstacles, checkpoints, timer.
// Runs at a fixed step so behaviour is identical on every machine, and is
// driven the same way by the browser loop and by the Node tests.

type Rapier = typeof RAPIER;
type Vec = [number, number, number];

export type SimEvent =
  | { type: "run-start" }
  | { type: "checkpoint"; index: number; total: number }
  | { type: "finish"; timeMs: number }
  | { type: "fell" }
  | { type: "respawn"; reason: "fell" | "manual" }
  | { type: "run-reset" };

// Offsets from the capsule centre.
const FEET_TO_CENTER = playerBody.halfHeight + playerBody.radius;
const SPAWN_CLEARANCE = 0.05;
/** Keeps a grounded player pressed onto the floor so contact is never lost. */
const GROUND_STICK = -0.02;
const GROUND_PROBE = FEET_TO_CENTER + 0.2;
const FACING_MIN_SPEED = 0.5;

export class Simulation {
  readonly parts: readonly Part[];
  readonly checkpointCount: number;

  // Player state, read by the renderer and tests.
  readonly position: Vec = [0, 0, 0];
  readonly prevPosition: Vec = [0, 0, 0];
  motion: MotionState = RESTING;
  grounded = false;
  groundPartId: string | null = null;
  facingYaw = 0;
  lastInput: SimInput = NO_INPUT;

  // Run state.
  runTimeMs = 0;
  runStarted = false;
  finished = false;
  activeCheckpoint = 0;
  respawnTimerSec = 0;
  speedBoostSec = 0;
  private speedBoost = 1;

  private readonly R: Rapier;
  private readonly stage: StageDefinition;
  private readonly cfg: PlayerMovementConfig;
  private readonly world: World;
  private readonly controller: KinematicCharacterController;
  private readonly body: RigidBody;
  private readonly collider: Collider;
  private readonly dynamic = new Map<string, DynamicPart>();
  private readonly colliderToPart = new Map<number, string>();
  private readonly partToCollider = new Map<string, number>();
  private readonly partMap: Map<string, Part>;
  private readonly zones: Part[];
  private readonly checkpointSpawns: Vec3[];
  private clockSec = 0;
  private events: SimEvent[] = [];

  constructor(R: Rapier, stage: StageDefinition, cfg: PlayerMovementConfig = playerMovement) {
    this.R = R;
    this.stage = stage;
    this.cfg = cfg;
    this.parts = layoutStage(stage);
    this.partMap = new Map(this.parts.map((p) => [p.id, p]));
    this.zones = this.parts.filter((p) => p.kind === "zone");

    const checkpoints = this.zones.filter((p) => p.zone?.role === "checkpoint");
    this.checkpointCount = checkpoints.length;
    this.checkpointSpawns = [stage.spawn, ...checkpoints.map((p) => [p.center[0], p.center[1] - p.size[1] / 2, p.center[2]] as const)];

    // Gravity is applied by our own movement code, not the engine.
    this.world = new R.World({ x: 0, y: 0, z: 0 });
    this.world.timestep = SIM_STEP_SEC;
    for (const part of this.parts) this.addPart(part);

    this.body = this.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased());
    this.collider = this.world.createCollider(R.ColliderDesc.capsule(playerBody.halfHeight, playerBody.radius), this.body);

    this.controller = this.world.createCharacterController(0.02);
    this.controller.enableAutostep(playerBody.maxStepHeight, 0.2, false);
    this.controller.enableSnapToGround(playerBody.snapToGroundDistance);
    this.controller.setMaxSlopeClimbAngle((playerBody.maxSlopeDeg * Math.PI) / 180);
    this.controller.setApplyImpulsesToDynamicBodies(false);

    this.placeAt(stage.spawn);
    this.world.step();
  }

  private addPart(part: Part): void {
    if (part.kind === "zone") return;
    const R = this.R;
    const [x, y, z] = part.center;
    const bodyDesc = part.kind === "static" ? R.RigidBodyDesc.fixed() : R.RigidBodyDesc.kinematicPositionBased();
    const body = this.world.createRigidBody(bodyDesc.setTranslation(x, y, z));
    const collider = this.world.createCollider(R.ColliderDesc.cuboid(part.size[0] / 2, part.size[1] / 2, part.size[2] / 2), body);
    this.colliderToPart.set(collider.handle, part.id);
    this.partToCollider.set(part.id, collider.handle);
    if (part.kind !== "static") this.dynamic.set(part.id, new DynamicPart(part, body));
  }

  /** Advances one fixed step. */
  step(rawInput: SimInput): void {
    const dt = SIM_STEP_SEC;
    this.clockSec += dt;
    const input = this.finished || this.respawnTimerSec > 0 ? { ...NO_INPUT, yaw: rawInput.yaw } : rawInput;
    this.lastInput = input;

    const ground = this.groundPartId ? this.dynamic.get(this.groundPartId) : undefined;
    ground?.notifyStoodOn();
    for (const part of this.dynamic.values()) part.step(this.clockSec, dt, this.cfg.gravity);

    if (this.respawnTimerSec > 0) {
      this.respawnTimerSec -= dt;
      if (this.respawnTimerSec <= 0) this.respawnNow("fell");
      else this.holdStill();
      this.world.step();
      return;
    }

    this.maybeStartRun(input);
    this.movePlayer(input, dt);
    this.world.step();
    this.detectGround();
    this.checkZones();
    if (this.runStarted && !this.finished) this.runTimeMs += dt * 1000;
    this.speedBoostSec = Math.max(0, this.speedBoostSec - dt);

    if (this.position[1] - FEET_TO_CENTER < this.stage.killPlaneY) {
      this.respawnTimerSec = this.cfg.respawnDelayMs / 1000;
      this.events.push({ type: "fell" });
    }
  }

  private maybeStartRun(input: SimInput): void {
    if (this.runStarted || this.finished) return;
    if (input.moveX !== 0 || input.moveZ !== 0 || input.jumpPressed) {
      this.runStarted = true;
      this.events.push({ type: "run-start" });
    }
  }

  private movePlayer(input: SimInput, dt: number): void {
    const { state } = nextMotion(
      this.motion,
      input,
      { grounded: this.grounded, speedMultiplier: this.speedBoostSec > 0 ? this.speedBoost : 1, dt },
      this.cfg,
    );
    this.motion = state;

    // Ride whatever we stand on: moving platforms carry, belts push.
    const groundPart = this.groundPartId ? this.partById(this.groundPartId) : undefined;
    // While riding a moving part we carry the player ourselves and hide that
    // part from the collision check: the engine only sees its previous pose
    // (a descending lift would block its own rider), and its built-in
    // platform carry fires on some steps but not others.
    const riding = groundPart?.kind === "moving" && state.vy <= 0 ? this.partToCollider.get(groundPart.id) : undefined;
    const carry = riding !== undefined ? this.dynamic.get(groundPart!.id)!.delta : [0, 0, 0];
    const belt = groundPart?.belt ?? [0, 0, 0];
    const stick = this.grounded && state.vy === 0 && riding === undefined ? GROUND_STICK : 0;

    const desired = {
      x: (state.vx + belt[0]) * dt + carry[0],
      y: (state.vy + belt[1]) * dt + carry[1] + stick,
      z: (state.vz + belt[2]) * dt + carry[2],
    };
    this.controller.computeColliderMovement(
      this.collider,
      desired,
      this.R.QueryFilterFlags.EXCLUDE_SENSORS,
      undefined,
      riding === undefined ? undefined : (c) => c.handle !== riding,
    );
    const moved = this.controller.computedMovement();

    // Bumped a ceiling on the way up: stop rising.
    if (state.vy > 0 && moved.y < desired.y - 1e-4) this.motion = { ...this.motion, vy: 0, jumpRising: false };

    // The ridden part was hidden from the check above, so the engine can't
    // see it underfoot — but we know we're on it. `detectGround` re-checks
    // after the step, so walking off the edge still ends the ride.
    this.grounded = riding !== undefined || this.controller.computedGrounded();
    this.prevPosition[0] = this.position[0];
    this.prevPosition[1] = this.position[1];
    this.prevPosition[2] = this.position[2];
    this.position[0] += moved.x;
    this.position[1] += moved.y;
    this.position[2] += moved.z;
    this.body.setNextKinematicTranslation({ x: this.position[0], y: this.position[1], z: this.position[2] });

    if (Math.hypot(state.vx, state.vz) > FACING_MIN_SPEED) this.facingYaw = Math.atan2(state.vx, state.vz);
  }

  /** Which part are we standing on? Probes the centre, then the capsule rim. */
  private detectGround(): void {
    this.groundPartId = null;
    if (!this.grounded) return;
    const r = playerBody.radius * 0.75;
    const offsets = [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]];
    for (const [ox, oz] of offsets) {
      const ray = new this.R.Ray(
        { x: this.position[0] + ox, y: this.position[1], z: this.position[2] + oz },
        { x: 0, y: -1, z: 0 },
      );
      const hit = this.world.castRay(ray, GROUND_PROBE, true, this.R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, this.collider);
      const id = hit ? this.colliderToPart.get(hit.collider.handle) : undefined;
      if (id) {
        this.groundPartId = id;
        return;
      }
    }
  }

  private checkZones(): void {
    const [px, py, pz] = this.position;
    const r = playerBody.radius;
    for (const zone of this.zones) {
      const [cx, cy, cz] = zone.center;
      const [sx, sy, sz] = zone.size;
      const inside =
        Math.abs(px - cx) <= sx / 2 + r &&
        Math.abs(pz - cz) <= sz / 2 + r &&
        py + FEET_TO_CENTER >= cy - sy / 2 &&
        py - FEET_TO_CENTER <= cy + sy / 2;
      if (inside) this.enterZone(zone);
    }
  }

  private enterZone(zone: Part): void {
    const role = zone.zone!;
    if (role.role === "checkpoint" && role.index > this.activeCheckpoint && !this.finished) {
      this.activeCheckpoint = role.index;
      this.events.push({ type: "checkpoint", index: role.index, total: this.checkpointCount });
    } else if (role.role === "finish" && !this.finished) {
      this.finished = true;
      this.events.push({ type: "finish", timeMs: this.runTimeMs });
    } else if (role.role === "speed-pad" && this.grounded) {
      this.speedBoost = role.boost;
      this.speedBoostSec = role.durationSec;
    }
  }

  /** R key: straight back to the last checkpoint. */
  respawnNow(reason: "fell" | "manual" = "manual"): void {
    this.respawnTimerSec = 0;
    this.speedBoostSec = 0;
    this.placeAt(this.checkpointSpawns[this.activeCheckpoint]);
    this.events.push({ type: "respawn", reason });
  }

  /** Back to the start with the clock at zero. */
  restartRun(): void {
    this.runTimeMs = 0;
    this.runStarted = false;
    this.finished = false;
    this.activeCheckpoint = 0;
    this.respawnTimerSec = 0;
    this.speedBoostSec = 0;
    for (const part of this.dynamic.values()) if (part.part.fall) part.reset();
    this.placeAt(this.stage.spawn);
    this.events.push({ type: "run-reset" });
  }

  /** Puts the player's feet at `feet`, at rest. Also used by the e2e seam. */
  placeAt(feet: Vec3): void {
    const center: Vec = [feet[0], feet[1] + FEET_TO_CENTER + SPAWN_CLEARANCE, feet[2]];
    for (let i = 0; i < 3; i++) {
      this.position[i] = center[i];
      this.prevPosition[i] = center[i];
    }
    const pos = { x: center[0], y: center[1], z: center[2] };
    this.body.setTranslation(pos, true);
    this.body.setNextKinematicTranslation(pos);
    this.world.propagateModifiedBodyPositionsToColliders();
    this.motion = RESTING;
    this.grounded = false;
    this.groundPartId = null;
  }

  /** Returns and clears everything that happened since the last call. */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  partById(id: string): Part | undefined {
    return this.partMap.get(id);
  }

  private holdStill(): void {
    for (let i = 0; i < 3; i++) this.prevPosition[i] = this.position[i];
  }

  dynamicPart(id: string): DynamicPart | undefined {
    return this.dynamic.get(id);
  }

  get feetY(): number {
    return this.position[1] - FEET_TO_CENTER;
  }

  get isSprinting(): boolean {
    return this.lastInput.sprint && (this.lastInput.moveX !== 0 || this.lastInput.moveZ !== 0);
  }

  dispose(): void {
    this.world.free();
  }
}
