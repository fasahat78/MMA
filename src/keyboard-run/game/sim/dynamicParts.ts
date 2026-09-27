import type { RigidBody } from "@dimforge/rapier3d-compat";
import { pingPongOffset, type Part } from "../stageLayout.ts";

// Parts that move under script control: ping-pong platforms, lifts and
// falling keys. Each step they compute a target pose, hand it to the physics
// engine, and report how far they moved so riders can be carried.

type Vec = [number, number, number];

export type FallPhase = "idle" | "armed" | "falling";

export class DynamicPart {
  readonly part: Part;
  readonly body: RigidBody;
  /** Pose after the latest step, and before it (for render interpolation). */
  readonly position: Vec;
  readonly prevPosition: Vec;
  /** Movement during the latest step. */
  readonly delta: Vec = [0, 0, 0];
  fallPhase: FallPhase = "idle";
  /** Seconds spent in the current fall phase. */
  fallElapsed = 0;
  private fallVy = 0;

  constructor(part: Part, body: RigidBody) {
    this.part = part;
    this.body = body;
    this.position = [...part.center];
    this.prevPosition = [...part.center];
  }

  /** Called when the player is standing on this part. */
  notifyStoodOn(): void {
    if (this.part.fall && this.fallPhase === "idle") {
      this.fallPhase = "armed";
      this.fallElapsed = 0;
    }
  }

  step(clockSec: number, dt: number, gravity: number): void {
    this.prevPosition[0] = this.position[0];
    this.prevPosition[1] = this.position[1];
    this.prevPosition[2] = this.position[2];

    const next: Vec = [...this.part.center];
    if (this.part.motion) {
      next[this.part.motion.axis] += pingPongOffset(clockSec, this.part.motion);
    } else if (this.part.fall) {
      this.stepFall(next, dt, gravity);
    }

    for (let i = 0; i < 3; i++) this.delta[i] = next[i] - this.position[i];
    this.position[0] = next[0];
    this.position[1] = next[1];
    this.position[2] = next[2];
    this.body.setNextKinematicTranslation({ x: next[0], y: next[1], z: next[2] });
  }

  private stepFall(next: Vec, dt: number, gravity: number): void {
    const fall = this.part.fall!;
    this.fallElapsed += dt;
    if (this.fallPhase === "armed" && this.fallElapsed >= fall.delaySec) {
      this.fallPhase = "falling";
      this.fallElapsed = 0;
      this.fallVy = 0;
    }
    if (this.fallPhase === "falling") {
      if (this.fallElapsed >= fall.resetDelaySec) {
        this.reset();
        return;
      }
      this.fallVy -= gravity * dt;
      next[1] = this.position[1] + this.fallVy * dt;
    }
  }

  /** Back to the authored pose with no visible sweep between poses. */
  reset(): void {
    this.fallPhase = "idle";
    this.fallElapsed = 0;
    this.fallVy = 0;
    for (let i = 0; i < 3; i++) {
      this.position[i] = this.part.center[i];
      this.prevPosition[i] = this.part.center[i];
    }
    const [x, y, z] = this.part.center;
    this.body.setTranslation({ x, y, z }, true);
  }
}
