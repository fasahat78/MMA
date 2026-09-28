// World 1 stage checks (no browser). Run with: node tests/block-dash-stages.ts
// For every stage: it loads, the spawn is safe, every gap is jumpable (or
// bridged by a mover/lift), every stepping stone and climb step can really be
// jumped in the physics sim, and every checkpoint respawns you safely.
import RAPIER from "@dimforge/rapier3d-compat";
import { Simulation } from "../src/keyboard-run/game/sim/Simulation.ts";
import { NO_INPUT, type SimInput } from "../src/keyboard-run/game/sim/playerMotion.ts";
import { layoutStage, type Part } from "../src/keyboard-run/game/stageLayout.ts";
import { world1 } from "../src/keyboard-run/data/stages/world1.ts";
import { winsForStage } from "../src/keyboard-run/data/economy.ts";
import { playerMovement, SIM_STEP_SEC } from "../src/keyboard-run/data/movement.ts";
import type { StageDefinition } from "../src/keyboard-run/types/stage.ts";
import { defaultProgress, isStageUnlocked, migrateProgress, recordFinish } from "../src/keyboard-run/state/progress.ts";

await RAPIER.init();

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
const fmt = (n: number) => n.toFixed(2);

// What a walking jump can clear (see data/movement.ts); kept a little under the real limits.
const JUMP_HEIGHT = playerMovement.jumpForce ** 2 / (2 * playerMovement.gravity);
const MAX_RISE = JUMP_HEIGHT - 0.25;
const MAX_GAP = 4.5;

function run(sim: Simulation, seconds: number, inp: SimInput = NO_INPUT) {
  for (let i = 0; i < Math.round(seconds / SIM_STEP_SEC); i++) sim.step(inp);
}

const topOf = (p: Part) => p.center[1] + p.size[1] / 2;

/** Air braking available (m/s²): ground acceleration × air control. */
const AIR_DECEL = playerMovement.groundAcceleration * playerMovement.airControl;

/**
 * Runs from the top of one part toward another, jumps, and returns what it
 * landed on. A "beginner" holds forward the whole time (what a kid does
 * first); a "skilled" player eases off mid-air so they stop over the target.
 */
function hop(stage: StageDefinition, from: Part, to: Part, player: "beginner" | "skilled" = "skilled"): string | null {
  const sim = new Simulation(RAPIER, stage);
  sim.placeAt([from.center[0], topOf(from), from.center[2]]);
  run(sim, 0.3);
  const yaw = Math.atan2(to.center[0] - from.center[0], to.center[2] - from.center[2]);
  const go: SimInput = { ...NO_INPUT, moveZ: 1, yaw };
  const brake: SimInput = { ...NO_INPUT, moveZ: -1, yaw };
  run(sim, 0.1, go);
  sim.step({ ...go, jumpPressed: true, jumpHeld: true });
  for (let i = 0; i < 120 && !(sim.grounded && sim.motion.vy === 0 && i > 5); i++) {
    // Signed distance along the jump: past the target it goes negative, so the player keeps braking.
    const left = (to.center[0] - sim.position[0]) * Math.sin(yaw) + (to.center[2] - sim.position[2]) * Math.cos(yaw);
    const speed = Math.hypot(sim.motion.vx, sim.motion.vz);
    const stopping = speed ** 2 / (2 * AIR_DECEL);
    const input = player === "skilled" && !sim.grounded && stopping >= left ? brake : go;
    sim.step({ ...input, jumpHeld: true });
  }
  const landed = sim.groundPartId;
  sim.dispose();
  return landed;
}

/** Beginner stages must work for a kid who just holds forward. */
const BEGINNER_STAGES = new Set([1, 2]);

/**
 * The course as solid bands along Z, each with the heights you can stand at.
 * Movers count for their whole travel; lifts for their whole ride.
 */
function bands(parts: readonly Part[]) {
  const spans = parts
    .filter((p) => p.kind !== "zone")
    .map((p) => {
      const travel = p.motion?.axis === 2 ? p.motion.distance : 0;
      const rise = p.motion?.axis === 1 ? p.motion.distance : 0;
      return {
        z0: p.center[2] - p.size[2] / 2,
        z1: p.center[2] + p.size[2] / 2 + travel,
        lo: topOf(p),
        hi: topOf(p) + rise,
        ids: [p.id],
      };
    })
    .sort((a, b) => a.z0 - b.z0);
  const merged: typeof spans = [];
  for (const s of spans) {
    const prev = merged[merged.length - 1];
    if (prev && s.z0 <= prev.z1 + 0.35) {
      prev.z1 = Math.max(prev.z1, s.z1);
      prev.lo = Math.min(prev.lo, s.lo);
      prev.hi = Math.max(prev.hi, s.hi);
      prev.ids.push(...s.ids);
    } else {
      merged.push({ ...s, ids: [...s.ids] });
    }
  }
  return merged;
}

check("World 1 has 15 stages", world1.stages.length === 15);
check("Wins double stage to stage (1, 2, 4 … 16384)", world1.stages.every((s, i) => s.winReward === 2 ** i) && winsForStage(15) === 16384);
check("Recommended levels rise stage to stage", world1.stages.every((s, i, all) => i === 0 || s.recommendedLevel > all[i - 1].recommendedLevel));
// Obstacle courses get longer; the Stage 15 maze is compact on purpose (tests/block-dash-maze.ts).
const courses = world1.stages.filter((s) => s.stageType === "standard");
check("Courses get longer (stages 1–14)", courses.length === 14 && courses.every((s, i) => i === 0 || finishZ(s) > finishZ(courses[i - 1])));

function finishZ(s: StageDefinition) {
  return s.obstacles.find((o) => o.type === "finish")!.position[2];
}

for (const stage of world1.stages) {
  const tag = `Stage ${stage.stageNumber}`;
  const parts = layoutStage(stage);

  check(`${tag}: part ids are unique`, new Set(parts.map((p) => p.id)).size === parts.length);

  const sim = new Simulation(RAPIER, stage);
  run(sim, 1);
  check(`${tag}: spawns standing on the ground`, sim.grounded && Math.abs(sim.feetY - stage.spawn[1]) < 0.1, `feet ${fmt(sim.feetY)}`);
  sim.dispose();

  // Gaps and rises between consecutive sections.
  const b = bands(parts);
  const tooFar = b.slice(1).filter((s, i) => s.z0 - b[i].z1 > MAX_GAP).map((s) => s.ids[0]);
  const tooHigh = b.slice(1).filter((s, i) => s.lo - b[i].hi > MAX_RISE).map((s) => s.ids[0]);
  check(`${tag}: every gap is jumpable (≤ ${MAX_GAP} m)`, tooFar.length === 0, `too far before ${tooFar.join(", ")}`);
  check(`${tag}: every step up is jumpable (≤ ${fmt(MAX_RISE)} m)`, tooHigh.length === 0, `too high before ${tooHigh.join(", ")}`);

  // Stepping stones: each stone to the next, for real.
  const hopGroups = [...new Set(parts.filter((p) => /^hop-\d+-\d+$/.test(p.id)).map((p) => p.id.replace(/-\d+$/, "")))];
  for (const group of hopGroups) {
    const stones = parts.filter((p) => p.id.startsWith(`${group}-`));
    const missed = stones.slice(0, -1).filter((s, i) => hop(stage, s, stones[i + 1]) !== stones[i + 1].id).map((s) => s.id);
    check(`${tag}: ${group} — every stone can be jumped to`, missed.length === 0, `missed after ${missed.join(", ")}`);
    if (BEGINNER_STAGES.has(stage.stageNumber)) {
      const naive = stones.slice(0, -1).filter((s, i) => hop(stage, s, stones[i + 1], "beginner") !== stones[i + 1].id).map((s) => s.id);
      check(`${tag}: ${group} — holding forward + jump lands every stone (beginner)`, naive.length === 0, `missed after ${naive.join(", ")}`);
    }
  }

  // Climbs: keys whose rows step up more than you can walk. Jump up one column.
  const climbGroups = stage.obstacles.filter((o) => o.type === "keyboard-run" && o.stepUp > 0.45);
  for (const g of climbGroups) {
    if (g.type !== "keyboard-run") continue;
    const column = parts.filter((p) => p.id.startsWith(`${g.id}-`)).filter((_, i) => i % g.columns === 0);
    const stuck = column.slice(0, -1).filter((c) => {
      const landed = parts.find((p) => p.id === hop(stage, c, column[column.indexOf(c) + 1]));
      return !landed || topOf(landed) <= topOf(c);
    });
    check(`${tag}: ${g.id} climb — every step can be jumped up`, stuck.length === 0, `stuck on ${stuck.map((s) => s.id).join(", ")}`);
  }

  // Every checkpoint (and the start) respawns you standing up.
  const cps = parts.filter((p) => p.zone?.role === "checkpoint");
  const badCp = cps.filter((cp) => {
    const s = new Simulation(RAPIER, stage);
    s.placeAt([cp.center[0], cp.center[1] - cp.size[1] / 2, cp.center[2]]);
    run(s, 0.6);
    const ok = s.grounded && s.activeCheckpoint >= 1;
    s.dispose();
    return !ok;
  });
  check(`${tag}: ${cps.length} checkpoint(s), all safe to respawn on`, cps.length > 0 && badCp.length === 0, badCp.map((c) => c.id).join(", "));

  // The finish sits on the ENTER key and fires.
  const fin = parts.find((p) => p.id === "finish")!;
  const enter = parts.find((p) => p.id === "enter-0")!;
  const f = new Simulation(RAPIER, stage);
  f.placeAt([fin.center[0], topOf(enter), fin.center[2] - 2.5]);
  run(f, 0.2, { ...NO_INPUT, moveZ: 1 });
  run(f, 1, { ...NO_INPUT, moveZ: 1 });
  check(`${tag}: finish line fires on the ENTER key`, f.finished && Math.abs(fin.center[1] - fin.size[1] / 2 - topOf(enter)) < 0.01);
  f.dispose();
}

// --- Progress rules ------------------------------------------------------------
{
  const [s1, s2, s3] = world1.stages;
  let p = defaultProgress;
  check("New player: only Stage 1 is open, 0 Wins", isStageUnlocked(p, s1) && !isStageUnlocked(p, s2) && p.wins === 0);

  const r1 = recordFinish(p, s1, 42_000);
  check("Finishing Stage 1 pays 1 Win and opens Stage 2", r1.winsEarned === 1 && r1.progress.wins === 1 && r1.unlockedNext && isStageUnlocked(r1.progress, s2));
  check("First finish is a new best", r1.isNewBest && r1.firstClear && r1.progress.bestTimes[s1.id] === 42_000);
  check("Recording a finish doesn't change the old progress object", p.wins === 0 && p.unlockedStage === 1);
  p = r1.progress;

  const slower = recordFinish(p, s1, 50_000);
  check("Replaying pays Wins again (Roblox-style) but keeps the best time", slower.winsEarned === 1 && slower.progress.wins === 2 && !slower.isNewBest && slower.progress.bestTimes[s1.id] === 42_000);
  check("Replaying an old stage doesn't re-announce an unlock", !slower.unlockedNext && slower.progress.unlockedStage === 2);
  const faster = recordFinish(slower.progress, s1, 30_000);
  check("A faster finish becomes the new best", faster.isNewBest && faster.progress.bestTimes[s1.id] === 30_000);

  const r3 = recordFinish(faster.progress, s3, 90_000);
  check("Stage 3 pays 4 Wins", r3.winsEarned === 4);

  check("Broken saves fall back safely", migrateProgress("garbage").wins === 0 && migrateProgress({ wins: -5, unlockedStage: 0, bestTimes: { x: "fast" } }).unlockedStage === 1);
  check("A good save survives a save/load round trip", JSON.stringify(migrateProgress(JSON.parse(JSON.stringify(r3.progress)))) === JSON.stringify(r3.progress));
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll World 1 stage checks passed");
process.exit(failures ? 1 : 0);
