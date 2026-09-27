import type { StageDefinition } from "../../types/stage";

// V0.1 sandbox, rebuilt after Zoya's first play-test: "too easy", "why so
// few keys", "bigger keys, harder stages". Mostly keys now, with sections
// that need jumps. Runs along +Z; platforms are 1 m thick, so a platform's
// centre y = its surface - 0.5.
//
// Surfaces: start 0 → mid level 1.6 → upper deck 7.6 → finish (ENTER) 10.

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
    { type: "platform", id: "start-road", style: "road", position: [0, -0.5, 0], size: [8, 1, 16] },

    // Warm-up: big keycap stairs, walkable (0.4 m steps). z 8.3 → 19.6, top 1.6.
    {
      type: "keyboard-run",
      id: "keys",
      origin: [0, 0, 8.3],
      columns: 3,
      rows: 4,
      keySize: 2.6,
      keyHeight: 1,
      gap: 0.3,
      stepUp: 0.4,
      labels: [
        "Q", "W", "E",
        "A", "RUN", "D",
        "SHIFT", "???", "SPACE",
        "KEEP GOING", "WHO PRESSED THIS?", "404",
      ],
    },

    // Zig-zag stepping stones spelling DASH — every hop is a jump. z 21.6 → 46.6.
    {
      type: "keyboard-run",
      id: "hop",
      origin: [0, 1.6, 21.6],
      columns: 1,
      rows: 7,
      keySize: 2.2,
      keyHeight: 1,
      gap: 1.6,
      stepUp: 0,
      rowOffsets: [0, 1.5, -1.5, 1.5, -1.5, 1.5, 0],
      labels: ["D", "A", "S", "H", "!", "→", "KEEP GOING"],
    },

    { type: "platform", id: "checkpoint-1-deck", style: "landing", position: [0, 1.1, 50.6], size: [6, 1, 4] },
    { type: "checkpoint", id: "checkpoint-1", position: [0, 3.6, 50.6], size: [6, 4, 2] },

    // One long, narrow SPACE bar across the drop. z 52.6 → 64.6.
    {
      type: "keyboard-run",
      id: "spacebar",
      origin: [0, 1.6, 52.6],
      columns: 1,
      rows: 1,
      keySize: 1.8,
      keyDepth: 12,
      keyHeight: 1,
      gap: 0,
      stepUp: 0,
      labels: ["SPACE"],
    },

    { type: "platform", id: "mover-dock", style: "landing", position: [0, 1.1, 66.6], size: [5, 1, 4] },

    {
      type: "moving-platform",
      id: "mover",
      position: [0, 1.3, 70.3],
      size: [3, 0.6, 3],
      axis: "z",
      distance: 11,
      speed: 3,
      pauseSec: 0.6,
    },

    { type: "platform", id: "pad-landing", style: "landing", position: [0, 1.1, 86], size: [6, 1, 6] },
    { type: "speed-pad", id: "speed-pad", position: [0, 1.85, 87.5], size: [3, 0.5, 2], boost: 1.5, durationSec: 1.8 },

    // Stronger belt: walking barely moves you — sprint or ride the speed-pad boost.
    { type: "treadmill", id: "treadmill", position: [0, 1.1, 95], size: [4, 1, 12], beltVelocity: [0, 0, -5] },

    { type: "platform", id: "checkpoint-2-deck", style: "landing", position: [0, 1.1, 103], size: [5, 1, 4] },
    { type: "checkpoint", id: "checkpoint-2", position: [0, 3.6, 103], size: [5, 4, 2] },

    { type: "lift", id: "lift", position: [0, 1.3, 106.8], size: [3.2, 0.6, 3.2], height: 6, speed: 2.5, pauseSec: 1 },

    // Checkpoint right before the falling keys (Zoya's least favourite).
    { type: "platform", id: "upper-deck", style: "deck", position: [0, 7.1, 110.6], size: [5, 1, 4] },
    { type: "checkpoint", id: "checkpoint-3", position: [0, 9.6, 110.6], size: [5, 4, 2] },

    // Fairer than V0: longer warning (they glow red and shake), then drop. z 113.2 → 126.6.
    {
      type: "falling-keys",
      id: "falling",
      origin: [0, 7.6, 113.2],
      count: 5,
      keyWidth: 2.6,
      keyDepth: 2.2,
      keyHeight: 1,
      gap: 0.6,
      fallDelaySec: 0.75,
      resetDelaySec: 3,
      labels: ["NOT THIS KEY", "WRONG WAY", "DON'T TURN AROUND", "404", "RUN"],
    },

    // Steps too tall to walk (0.6 m): jump up each one. z 127.2 → 138.5, top 10.
    {
      type: "keyboard-run",
      id: "climb",
      origin: [0, 7.6, 127.2],
      columns: 2,
      rows: 4,
      keySize: 2.6,
      keyHeight: 1,
      gap: 0.3,
      stepUp: 0.6,
      labels: ["↑", "↑", "ESCAPE", "↑", "↑", "FIND THE EXIT", "↑", "↑"],
    },

    // The finish line sits on a giant ENTER key. z 138.8 → 145.8.
    {
      type: "keyboard-run",
      id: "enter",
      origin: [0, 10, 138.8],
      columns: 1,
      rows: 1,
      keySize: 7,
      keyHeight: 1.5,
      gap: 0,
      stepUp: 0,
      labels: ["ENTER"],
    },
    { type: "finish", id: "finish", position: [0, 12.5, 142.5], size: [7, 5, 1.5] },
  ],
};
