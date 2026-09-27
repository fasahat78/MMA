import type { StageDefinition } from "../../types/stage";

// V0 movement sandbox (brief §34). One of each obstacle, in order along +Z.
// Surface heights: ground floor at 0, mid level at 1.6, upper deck at 7.6.
// Platforms are 1 m thick, so centre y = surface - 0.5.

export const sandboxStage: StageDefinition = {
  id: "sandbox",
  worldId: "sandbox",
  stageNumber: 0,
  recommendedLevel: 1,
  winReward: 0,
  stageType: "standard",
  spawn: [0, 0, -5],
  killPlaneY: -12,
  obstacles: [
    { type: "platform", id: "start-road", style: "road", position: [0, -0.5, 0], size: [7, 1, 16] },

    // Keycap staircase: 4 rows stepping up 0.4 m each, z 8.3 → 17.2, top 1.6.
    {
      type: "keyboard-run",
      id: "keys",
      origin: [0, 0, 8.3],
      columns: 3,
      rows: 4,
      keySize: 2,
      keyHeight: 1,
      gap: 0.3,
      stepUp: 0.4,
      labels: [
        "Q", "RUN", "E",
        "A", "S", "WHO PRESSED THIS?",
        "SHIFT", "???", "D",
        "KEEP GOING", "SPACE", "404",
      ],
    },

    // 3 m gap jump from the top row onto the landing.
    { type: "platform", id: "gap-landing", style: "landing", position: [0, 1.1, 22.2], size: [5, 1, 4] },

    { type: "bridge", id: "bridge", position: [0, 1.1, 30.2], size: [1.8, 1, 12] },

    { type: "platform", id: "checkpoint-1-deck", style: "landing", position: [0, 1.1, 39.2], size: [6, 1, 6] },
    { type: "checkpoint", id: "checkpoint-1", position: [0, 3.6, 39.2], size: [6, 4, 2] },

    // Carries the player across a 13 m drop.
    {
      type: "moving-platform",
      id: "mover",
      position: [0, 1.3, 43.9],
      size: [3, 0.6, 3],
      axis: "z",
      distance: 9.6,
      speed: 2.4,
      pauseSec: 0.8,
    },

    { type: "platform", id: "pad-landing", style: "landing", position: [0, 1.1, 58.2], size: [6, 1, 6] },
    { type: "speed-pad", id: "speed-pad", position: [0, 1.85, 57.5], size: [3, 0.5, 2], boost: 1.5, durationSec: 1.8 },

    // Belt pushes back toward the start: walking crosses slowly, sprinting is quicker.
    { type: "treadmill", id: "treadmill", position: [0, 1.1, 66.2], size: [4, 1, 10], beltVelocity: [0, 0, -3.5] },

    { type: "platform", id: "checkpoint-2-deck", style: "landing", position: [0, 1.1, 73.2], size: [5, 1, 4] },
    { type: "checkpoint", id: "checkpoint-2", position: [0, 3.6, 73.2], size: [5, 4, 2] },

    { type: "lift", id: "lift", position: [0, 1.3, 77], size: [3.2, 0.6, 3.2], height: 6, speed: 2, pauseSec: 1.2 },

    { type: "platform", id: "upper-deck", style: "deck", position: [0, 7.1, 81.8], size: [5, 1, 6] },

    // Keys drop half a second after you land on them — keep moving.
    {
      type: "falling-keys",
      id: "falling",
      origin: [0, 7.6, 85.4],
      count: 4,
      keyWidth: 2.4,
      keyDepth: 2,
      keyHeight: 1,
      gap: 0.7,
      fallDelaySec: 0.5,
      resetDelaySec: 3,
      labels: ["NOT THIS KEY", "WRONG WAY", "DON'T TURN AROUND", "FIND THE EXIT"],
    },

    { type: "platform", id: "finish-deck", style: "deck", position: [0, 7.1, 99.5], size: [7, 1, 7] },
    { type: "finish", id: "finish", position: [0, 10.1, 99], size: [7, 5, 1.5] },
  ],
};
