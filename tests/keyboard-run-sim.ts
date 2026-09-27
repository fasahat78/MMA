// Keyboard Run physics + rules tests (no browser). Run with:
//   node tests/keyboard-run-sim.ts
// Covers brief §36: ground, jump, sprint, moving platform, lift, checkpoint,
// fall respawn, finish-once, restart timer, treadmill.
import RAPIER from "@dimforge/rapier3d-compat";
import { Simulation, type SimEvent } from "../src/keyboard-run/game/sim/Simulation.ts";
import { NO_INPUT, type SimInput } from "../src/keyboard-run/game/sim/playerMotion.ts";
import { sandboxStage } from "../src/keyboard-run/data/stages/sandbox.ts";
import { playerMovement, SIM_STEP_SEC } from "../src/keyboard-run/data/movement.ts";
import { layoutStage, pingPongOffset } from "../src/keyboard-run/game/stageLayout.ts";

await RAPIER.init();

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const fresh = () => new Simulation(RAPIER, sandboxStage);
const input = (over: Partial<SimInput> = {}): SimInput => ({ ...NO_INPUT, ...over });

function run(sim: Simulation, seconds: number, inp: SimInput | ((t: number) => SimInput) = NO_INPUT): SimEvent[] {
  const events: SimEvent[] = [];
  const steps = Math.round(seconds / SIM_STEP_SEC);
  for (let i = 0; i < steps; i++) {
    sim.step(typeof inp === "function" ? inp(i * SIM_STEP_SEC) : inp);
    events.push(...sim.drainEvents());
  }
  return events;
}

const fmt = (n: number) => n.toFixed(2);

// Positions come from the stage data, so these checks survive course edits.
const PARTS = layoutStage(sandboxStage);
const part = (id: string) => {
  const p = PARTS.find((x) => x.id === id);
  if (!p) throw new Error(`No stage part "${id}"`);
  return p;
};
/** The point on top of a part (feet position), at its centre. */
const onTop = (id: string): [number, number, number] => {
  const p = part(id);
  return [p.center[0], p.center[1] + p.size[1] / 2, p.center[2]];
};
/** A zone's floor point (where respawns put your feet). */
const zoneFloor = (id: string): [number, number, number] => {
  const p = part(id);
  return [p.center[0], p.center[1] - p.size[1] / 2, p.center[2]];
};

// --- Stage data --------------------------------------------------------------
{
  const parts = layoutStage(sandboxStage);
  const ids = new Set(parts.map((p) => p.id));
  check("Stage part ids are unique", ids.size === parts.length);
  check("Keyboard run expands to 12 labelled keys", parts.filter((p) => p.id.startsWith("keys-") && p.label).length === 12);
  const motion = { axis: 2 as const, distance: 10, speed: 2, pauseSec: 1 };
  check(
    "Ping-pong: rests, travels, rests, returns",
    pingPongOffset(0.5, motion) === 0 && pingPongOffset(3.5, motion) === 5 && pingPongOffset(6.5, motion) === 10 && pingPongOffset(9.5, motion) === 5,
  );
}

// --- Ground ------------------------------------------------------------------
{
  const sim = fresh();
  run(sim, 3);
  check("Player lands and rests on the start road", sim.grounded && Math.abs(sim.feetY) < 0.1, `feetY=${fmt(sim.feetY)}`);
  check("Standing still does not start the timer", !sim.runStarted && sim.runTimeMs === 0);
  run(sim, 0.25, input({ moveZ: -1 }));
  run(sim, 0.5);
  check("Walking backward stays on the ground (no fall-through)", sim.grounded && Math.abs(sim.feetY) < 0.1, `feetY=${fmt(sim.feetY)}`);
}

// --- Jump --------------------------------------------------------------------
{
  const heights: number[] = [];
  const sim = fresh();
  run(sim, 1);
  for (let j = 0; j < 3; j++) {
    let peak = -Infinity;
    sim.step(input({ jumpPressed: true, jumpHeld: true }));
    for (let i = 0; i < 90; i++) {
      sim.step(input({ jumpHeld: true }));
      peak = Math.max(peak, sim.feetY);
    }
    heights.push(peak);
  }
  // Rising uses plain gravity (the fall multiplier only applies on the way down).
  const expected = playerMovement.jumpForce ** 2 / (2 * playerMovement.gravity);
  check("Jump reaches the expected height", Math.abs(heights[0] - expected) < 0.25, `peak=${fmt(heights[0])} expected≈${fmt(expected)}`);
  check("Jumps are consistent", Math.max(...heights) - Math.min(...heights) < 0.02, heights.map(fmt).join(", "));
  check("Player lands again after jumping", sim.grounded);

  // Tapping Space gives a shorter hop than holding it.
  const tap = fresh();
  run(tap, 1);
  tap.step(input({ jumpPressed: true, jumpHeld: true }));
  let tapPeak = -Infinity;
  for (let i = 0; i < 90; i++) {
    tap.step(NO_INPUT);
    tapPeak = Math.max(tapPeak, tap.feetY);
  }
  check("Tapping jump gives a shorter hop", tapPeak < heights[0] - 0.4, `tap=${fmt(tapPeak)} hold=${fmt(heights[0])}`);

  // Coyote time: jump pressed just after walking off an edge still fires.
  const edge = fresh();
  const roadHalfWidth = part("start-road").size[0] / 2;
  edge.placeAt([roadHalfWidth - 0.3, 0, 0]);
  run(edge, 0.5);
  let t = 0;
  while (edge.grounded && t < 2) {
    edge.step(input({ moveZ: 0, moveX: -1 }));
    t += SIM_STEP_SEC;
  }
  edge.step(input({ jumpPressed: true, jumpHeld: true }));
  check("Coyote time allows a jump just after leaving a ledge", edge.motion.vy > playerMovement.jumpForce * 0.8, `vy=${fmt(edge.motion.vy)}`);
}

// --- Sprint ------------------------------------------------------------------
{
  const sim = fresh();
  run(sim, 1);
  run(sim, 0.5, input({ moveZ: 1 }));
  const walk = Math.hypot(sim.motion.vx, sim.motion.vz);
  run(sim, 0.4, input({ moveZ: 1, sprint: true }));
  const sprint = Math.hypot(sim.motion.vx, sim.motion.vz);
  run(sim, 0.4, input({ moveZ: 1 }));
  const back = Math.hypot(sim.motion.vx, sim.motion.vz);
  const base = playerMovement.baseSpeed;
  check("Walking reaches base speed", Math.abs(walk - base) < 0.01, fmt(walk));
  check("Sprint engages", Math.abs(sprint - base * playerMovement.sprintMultiplier) < 0.01, fmt(sprint));
  check("Sprint disengages", Math.abs(back - base) < 0.01, fmt(back));
  check("Moving starts the run timer", sim.runStarted);
}

// --- Moving platform ---------------------------------------------------------
{
  const sim = fresh();
  const mover = sim.dynamicPart("mover")!;
  // Stand on the platform while it rests at the near end.
  sim.placeAt([mover.position[0], mover.position[1] + 0.3, mover.position[2]]);
  run(sim, 0.3);
  const startZ = sim.position[2];
  const moverStart = mover.position[2];
  run(sim, 4.5);
  const carried = sim.position[2] - startZ;
  const moved = mover.position[2] - moverStart;
  check("Moving platform moved", moved > 5, fmt(moved));
  check("Moving platform carries the player", Math.abs(carried - moved) < 0.3 && sim.groundPartId === "mover", `player ${fmt(carried)} vs platform ${fmt(moved)}`);
}

// --- Lift --------------------------------------------------------------------
{
  const sim = fresh();
  const lift = sim.dynamicPart("lift")!;
  sim.placeAt([lift.position[0], lift.position[1] + 0.3, lift.position[2]]);
  let maxFeet = -Infinity;
  let minOffset = Infinity;
  let maxOffset = -Infinity;
  run(sim, 9, () => NO_INPUT);
  // Sample a full cycle, checking the rider stays on the deck both ways.
  for (let i = 0; i < 9 / SIM_STEP_SEC; i++) {
    sim.step(NO_INPUT);
    maxFeet = Math.max(maxFeet, sim.feetY);
    const offset = sim.feetY - (lift.position[1] + 0.3);
    minOffset = Math.min(minOffset, offset);
    maxOffset = Math.max(maxOffset, offset);
  }
  check("Lift carries the player up", maxFeet > 7.3, `max feet ${fmt(maxFeet)}`);
  check("Rider stays on the lift going up and down", minOffset > -0.1 && maxOffset < 0.15, `offset ${fmt(minOffset)}..${fmt(maxOffset)}`);
}

// --- Leaving moving parts ----------------------------------------------------
{
  const sim = fresh();
  const mover = sim.dynamicPart("mover")!;
  sim.placeAt([mover.position[0], mover.position[1] + 0.3, mover.position[2]]);
  run(sim, 1.5);
  const events = run(sim, 2.5, input({ moveX: 1 }));
  check("Walking off a moving platform ends the ride", events.some((e) => e.type === "fell"));

  const lift = fresh();
  const deck = lift.dynamicPart("lift")!;
  lift.placeAt([deck.position[0], deck.position[1] + 0.3, deck.position[2]]);
  run(lift, 2); // the lift is rising by now
  const before = lift.feetY;
  lift.step(input({ jumpPressed: true, jumpHeld: true }));
  run(lift, 0.25, input({ jumpHeld: true }));
  const above = lift.feetY - (deck.position[1] + 0.3);
  check("Jumping off a rising lift leaves its deck", above > 0.8 && lift.feetY > before, `above deck ${fmt(above)}`);
}

// --- Treadmill ---------------------------------------------------------------
{
  const sim = fresh();
  // Start near the far end: the belt pushes hard, and we measure for 1.5 s.
  const belt = onTop("treadmill");
  sim.placeAt([belt[0], belt[1], belt[2] + part("treadmill").size[2] / 2 - 1.5]);
  run(sim, 0.5);
  const z0 = sim.position[2];
  run(sim, 1);
  check("Standing on the treadmill pushes the player back", sim.position[2] - z0 < -3, fmt(sim.position[2] - z0));
  check("Treadmill is detected underfoot", sim.groundPartId === "treadmill");
  const z1 = sim.position[2];
  run(sim, 1, input({ moveZ: 1, sprint: true }));
  check("Sprinting beats the belt", sim.position[2] - z1 > 5, fmt(sim.position[2] - z1));
}

// --- Speed pad ---------------------------------------------------------------
{
  const sim = fresh();
  sim.placeAt(zoneFloor("speed-pad"));
  run(sim, 0.3);
  run(sim, 0.4, input({ moveZ: 1 }));
  const speed = Math.hypot(sim.motion.vx, sim.motion.vz);
  check("Speed pad boosts top speed", speed > playerMovement.baseSpeed * 1.2, fmt(speed));
}

// --- Falling keys ------------------------------------------------------------
{
  const sim = fresh();
  const key = sim.dynamicPart("falling-0")!;
  sim.placeAt([key.position[0], key.position[1] + 0.5, key.position[2]]);
  run(sim, 0.4);
  check("Falling key arms when stood on", key.fallPhase === "armed");
  const events = run(sim, 2.5);
  check("Falling key drops away and the player falls", key.fallPhase === "falling" && events.some((e) => e.type === "fell"));
  run(sim, 3);
  check("Falling key resets to its place", key.fallPhase === "idle" && Math.abs(key.position[1] - key.part.center[1]) < 1e-6);
}

// --- The course can be cleared --------------------------------------------
/** Runs from the top of `fromId` toward `toId` (sprinting if asked), jumps, and reports where it lands. */
function hop(fromId: string, toId: string, opts: { sprint?: boolean; runUpSec?: number } = {}): string | null {
  const sim = fresh();
  const from = onTop(fromId);
  const to = onTop(toId);
  sim.placeAt(from);
  run(sim, 0.3);
  const yaw = Math.atan2(to[0] - from[0], to[2] - from[2]);
  const go = input({ moveZ: 1, yaw, sprint: opts.sprint ?? false });
  run(sim, opts.runUpSec ?? 0.1, go);
  sim.step({ ...go, jumpPressed: true, jumpHeld: true });
  // Hold forward until landed (or given up).
  for (let i = 0; i < 120 && !(sim.grounded && sim.motion.vy === 0 && i > 5); i++) sim.step({ ...go, jumpHeld: true });
  const landed = sim.groundPartId;
  sim.dispose();
  return landed;
}
{
  const stones = PARTS.filter((p) => p.id.startsWith("hop-")).map((p) => p.id);
  const failed = stones.slice(0, -1).filter((id, i) => hop(id, stones[i + 1]) !== stones[i + 1]);
  check("Every DASH stepping-stone hop lands on the next stone (walking)", failed.length === 0, `missed after: ${failed.join(", ")}`);

  const climb = PARTS.filter((p) => p.id.startsWith("climb-")).map((p) => p.id);
  // Row-major, 2 columns: climb-0 → climb-2 → climb-4 → climb-6 (same column, one row up each time).
  const col = climb.filter((_, i) => i % 2 === 0);
  // The jump is strong enough to skip a step, so "cleared" = landed on anything higher.
  const topOf = (id: string | null) => (id ? onTop(id)[1] : -Infinity);
  const climbFailed = col.slice(0, -1).filter((id, i) => topOf(hop(id, col[i + 1])) <= topOf(id));
  check("Every tall climb step can be jumped up", climbFailed.length === 0, `stuck on: ${climbFailed.join(", ")}`);

  const step = part("climb-2").center[1] - part("climb-0").center[1];
  check("Climb steps are too tall to just walk up", step > 0.45, fmt(step));
}

// --- Checkpoints + fall respawn ---------------------------------------------
{
  const sim = fresh();
  const cp1 = zoneFloor("checkpoint-1");
  sim.placeAt(cp1);
  const events = run(sim, 0.3);
  check("Checkpoint activates", sim.activeCheckpoint === 1 && events.some((e) => e.type === "checkpoint" && e.index === 1));
  // Walk off the side of the checkpoint deck.
  const fell = [...run(sim, 2, input({ moveX: 1 })), ...run(sim, 1.5)];
  check("Falling triggers a respawn", fell.some((e) => e.type === "fell") && fell.some((e) => e.type === "respawn" && e.reason === "fell"));
  check("Respawn lands on the checkpoint", Math.abs(sim.position[2] - cp1[2]) < 0.5 && Math.abs(sim.feetY - cp1[1]) < 0.1, `z=${fmt(sim.position[2])} feet=${fmt(sim.feetY)}`);

  // Respawn waits for the configured delay.
  const d = fresh();
  d.placeAt([0, -30, 0]);
  const quick = run(d, playerMovement.respawnDelayMs / 1000 - 0.1);
  check("Respawn waits for the delay", quick.some((e) => e.type === "fell") && !quick.some((e) => e.type === "respawn"));

  // Manual respawn (R) is instant and returns to the checkpoint.
  sim.placeAt([0, 0, 0]);
  sim.respawnNow();
  check("Manual respawn returns to the last checkpoint", Math.abs(sim.position[2] - cp1[2]) < 0.01);
}

// --- Finish + restart --------------------------------------------------------
{
  const sim = fresh();
  run(sim, 0.5, input({ moveZ: 1 }));
  const finish = zoneFloor("finish");
  sim.placeAt([finish[0], finish[1], finish[2] - 3]);
  const events = run(sim, 1, input({ moveZ: 1 }));
  const finishes = events.filter((e) => e.type === "finish");
  check("Finish fires", finishes.length === 1 && sim.finished);
  run(sim, 1, input({ moveZ: -1 }));
  run(sim, 1, input({ moveZ: 1 }));
  check("Finish fires only once", sim.drainEvents().filter((e) => e.type === "finish").length === 0 && sim.finished);
  const frozen = sim.runTimeMs;
  run(sim, 1);
  check("Timer stops at the finish", sim.runTimeMs === frozen && frozen > 0);

  sim.restartRun();
  check("Restart resets the timer and run", sim.runTimeMs === 0 && !sim.finished && !sim.runStarted && sim.activeCheckpoint === 0);
  check("Restart returns to the spawn", Math.abs(sim.position[2] - sandboxStage.spawn[2]) < 0.01);
  sim.dispose();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll keyboard-run sim checks passed");
process.exit(failures ? 1 : 0);
