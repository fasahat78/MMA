import { winsForStage } from "../economy.ts";
import type { StageDefinition } from "../../types/stage";
import { course } from "./courseBuilder.ts";
import { sandboxStage } from "./sandbox.ts";

// World 1: five stages, each harder than the last (brief §10–11). Stage 3
// is the V0.1 course Zoya already knows. Recommended levels are placeholders
// until player levels exist; the direction (1, then 8, then higher) is hers.
//
// Jump reference: ~1.8 m high, ~5 m across walking, ~8 m sprinting.
// Stages 1–2 are beginner stages: stepping stones sit about one jump apart,
// so holding forward and jumping lands on the next stone. Later stages ask
// for control (easing off mid-air), like Roblox obbies.

const meta = (n: number, recommendedLevel: number) => ({
  id: `w1-s${n}`,
  worldId: "world-1",
  stageNumber: n,
  recommendedLevel,
  winReward: winsForStage(n),
});

// Stage 1 — first steps: walkable stairs, small hops, a wide SPACE bar.
const stage1 = course()
  .platform(14)
  .keys({ rows: 3, columns: 3, stepUp: 0.4, labels: ["Q", "W", "E", "A", "RUN", "D", "Z", "X", "C"] })
  .platform(5)
  .hop({ gap: 2.2, keySize: 2.6, offsets: [0, 0.8, -0.8, 0.8, 0], labels: ["B", "L", "O", "C", "K"] })
  .gap(2.2)
  .platform(5)
  .checkpoint()
  .spacebar(10, 2.4)
  .platform(4)
  .keys({ rows: 3, columns: 3, stepUp: 0.4, labels: ["1", "2", "3", "4", "KEEP GOING", "6", "7", "8", "9"] })
  .finish()
  .build(meta(1, 1));

// Stage 2 — things that move: mover, speed pad + treadmill, lift.
const stage2 = course()
  .platform(14)
  .keys({ rows: 4, columns: 3, stepUp: 0.4, labels: ["T", "Y", "U", "G", "RUN", "J", "B", "N", "M", "???", "SPACE", "!"] })
  .gap(2.5)
  .platform(5)
  .mover(9, { speed: 2.5 })
  .platform(6)
  .speedPad()
  .treadmill(10, 4)
  .platform(5)
  .checkpoint()
  .lift(5)
  .platform(5)
  .hop({ gap: 2.1, keySize: 2.4, offsets: [0, 1.2, -1.2, 1.2, 0], labels: ["D", "A", "S", "H", "!"] })
  .gap(2.1)
  .platform(4)
  .checkpoint()
  .falling({ delaySec: 0.9, labels: ["WRONG WAY", "404", "RUN"] })
  .gap(0.6)
  .platform(4)
  .finish()
  .build(meta(2, 8));

// Stage 3 — the V0.1 course Zoya has played.
const stage3: StageDefinition = { ...sandboxStage, ...meta(3, 16) };

// Stage 4 — harder: jump-up climb, rising stones, two fast movers, a long
// belt, quick falling keys, a narrow SPACE bar.
const stage4 = course()
  .platform(14)
  .keys({ rows: 5, columns: 2, stepUp: 0.6, labels: ["↑", "↑", "ESCAPE", "↑", "↑", "WHO PRESSED THIS?", "↑", "↑", "404", "↑"] })
  .gap(3)
  .platform(4)
  .hop({ gap: 1.8, rise: 0.3, offsets: [0, 1.8, -1.8, 1.8, -1.8, 1.8, 0], labels: ["F", "I", "N", "D", "?", "?", "!"] })
  .gap(1.8)
  .platform(5)
  .checkpoint()
  .mover(10, { speed: 3.5, pauseSec: 0.4 })
  .platform(3)
  .mover(12, { speed: 3.5, pauseSec: 0.4 })
  .platform(6)
  .checkpoint()
  .speedPad()
  .treadmill(14, 5.5)
  .platform(4)
  .falling({ delaySec: 0.6, labels: ["NOT THIS KEY", "WRONG WAY", "DON'T TURN AROUND", "404", "???", "RUN"] })
  .gap(0.6)
  .platform(5)
  .checkpoint()
  .spacebar(14, 1.4)
  .platform(4)
  .finish()
  .build(meta(4, 24));

// Stage 5 — hardest: big rising hops, fast falling keys, a very narrow
// SPACE bar high up, a fast long mover, a tall climb.
const stage5 = course()
  .platform(14)
  .hop({ gap: 2.2, rise: 0.4, offsets: [0, 2, -2, 2, -2, 2, -2, 0], labels: ["E", "S", "C", "A", "P", "E", "!", "!"] })
  .gap(2.2)
  .platform(5)
  .checkpoint()
  .falling({ delaySec: 0.5, labels: ["RUN", "WRONG WAY", "NOT THIS KEY", "404", "???", "KEEP GOING"] })
  .gap(0.6)
  .platform(4)
  .lift(6, { speed: 3 })
  .platform(4)
  .spacebar(16, 1.2)
  .platform(5)
  .checkpoint()
  .mover(13, { speed: 4, pauseSec: 0.3 })
  .platform(4)
  .keys({ rows: 6, columns: 2, stepUp: 0.7, labels: ["↑", "↑", "↑", "↑", "FIND THE EXIT", "↑", "↑", "↑", "↑", "DON'T TURN AROUND", "↑", "↑"] })
  .gap(0.3)
  .platform(4)
  .checkpoint()
  .falling({ delaySec: 0.45, labels: ["WHO PRESSED THIS?", "404", "WRONG WAY", "RUN", "???"] })
  .gap(0.6)
  .platform(3)
  .hop({ gap: 2.4, offsets: [0, 2.2, -2.2, 2.2, -2.2, 0], labels: ["E", "X", "I", "T", "!", "!"] })
  .gap(2.4)
  .platform(3)
  .finish()
  .build(meta(5, 40));

export const world1 = {
  id: "world-1",
  name: "World 1",
  stages: [stage1, stage2, stage3, stage4, stage5],
} as const;

export function findStage(id: string): StageDefinition | undefined {
  return world1.stages.find((s) => s.id === id);
}
