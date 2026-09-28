import { runnerPrices } from "./economy.ts";

// Runners: block-style versions of the Maze Mates animals (src/data/characters.ts),
// bought with Wins. Every runner shares the same block body; a look is its
// colours plus a few extra boxes ("bits") stuck onto the head. The head is a
// 0.56 m cube centred on (0, 0, 0); its face points at +Z.

type V3 = readonly [number, number, number];

export interface HeadBit {
  size: V3;
  pos: V3;
  color: string;
  /** Tilt around X, Y, Z in radians. */
  rot?: V3;
}

export interface RunnerLook {
  body: string;
  legs: string;
  shoes: string;
  head: string;
  hands: string;
  eyes: string;
  /** Null hides the cheeks (for faces that have a snout or beak there). */
  cheeks: string | null;
  bits: readonly HeadBit[];
}

export interface Runner {
  id: string;
  name: string;
  emoji: string;
  /** Price in Wins; 0 = free from the start. */
  cost: number;
  look: RunnerLook;
}

const FACE = 0.28;
const TOP = 0.28;

const bit = (size: V3, pos: V3, color: string, rot?: V3): HeadBit => ({ size, pos, color, rot });
const pair = (make: (side: 1 | -1) => HeadBit): HeadBit[] => [make(1), make(-1)];

const roundEars = (color: string, inner?: string) =>
  pair((s) => bit([0.18, 0.18, 0.1], [s * 0.24, TOP + 0.06, -0.04], color)).concat(
    inner ? pair((s) => bit([0.1, 0.1, 0.02], [s * 0.24, TOP + 0.06, 0.02], inner)) : [],
  );
const pointyEars = (color: string, inner: string) =>
  pair((s) => bit([0.16, 0.2, 0.08], [s * 0.19, TOP + 0.08, 0], color, [0, 0, s * -0.35])).concat(
    pair((s) => bit([0.08, 0.1, 0.02], [s * 0.19, TOP + 0.07, 0.05], inner, [0, 0, s * -0.35])),
  );
const longEars = (color: string, inner: string) =>
  pair((s) => bit([0.12, 0.46, 0.08], [s * 0.13, TOP + 0.22, -0.04], color, [0, 0, s * -0.12])).concat(
    pair((s) => bit([0.06, 0.34, 0.02], [s * 0.13, TOP + 0.2, 0.01], inner, [0, 0, s * -0.12])),
  );
const floppyEars = (color: string) => pair((s) => bit([0.1, 0.34, 0.24], [s * 0.32, 0.02, -0.02], color, [0, 0, s * 0.15]));
const snout = (color: string, nose = "#1d1b33") => [
  bit([0.24, 0.16, 0.12], [0, -0.1, FACE + 0.05], color),
  bit([0.08, 0.06, 0.03], [0, -0.05, FACE + 0.12], nose),
];
const beak = (color: string) => [bit([0.16, 0.08, 0.16], [0, -0.06, FACE + 0.07], color)];
const facePatch = (color: string) => [bit([0.42, 0.34, 0.02], [0, -0.04, FACE + 0.005], color)];

export const runners: readonly Runner[] = [
  {
    id: "blocky",
    name: "Blocky",
    emoji: "🟦",
    cost: 0,
    look: { body: "#2ec4b6", legs: "#3d5a80", shoes: "#ffffff", head: "#ffd7b5", hands: "#ffd7b5", eyes: "#1d1b33", cheeks: "#ff8fb1", bits: [] },
  },
  {
    id: "penguin",
    name: "Penguin",
    emoji: "🐧",
    cost: runnerPrices.penguin,
    look: {
      body: "#2b2d42", legs: "#2b2d42", shoes: "#ff9f1c", head: "#2b2d42", hands: "#2b2d42", eyes: "#1d1b33", cheeks: "#ff8fb1",
      bits: [...facePatch("#ffffff"), ...beak("#ff9f1c")],
    },
  },
  {
    id: "bird",
    name: "Bird",
    emoji: "🐦",
    cost: runnerPrices.bird,
    look: {
      body: "#4cc9f0", legs: "#f4a261", shoes: "#f4a261", head: "#4cc9f0", hands: "#4cc9f0", eyes: "#1d1b33", cheeks: null,
      bits: [...beak("#ffd23f"), bit([0.08, 0.2, 0.18], [0, TOP + 0.1, -0.02], "#3a86ff", [0.3, 0, 0])],
    },
  },
  {
    id: "bunny",
    name: "Bunny",
    emoji: "🐰",
    cost: runnerPrices.bunny,
    look: {
      body: "#f1faee", legs: "#e0e1dd", shoes: "#ffafcc", head: "#f8f9fa", hands: "#f8f9fa", eyes: "#1d1b33", cheeks: "#ffafcc",
      bits: [...longEars("#f8f9fa", "#ffafcc"), bit([0.08, 0.06, 0.03], [0, -0.06, FACE + 0.01], "#ff8fab")],
    },
  },
  {
    id: "cat",
    name: "Cat",
    emoji: "🐱",
    cost: runnerPrices.cat,
    look: {
      body: "#f4a261", legs: "#e76f51", shoes: "#ffffff", head: "#f4a261", hands: "#ffffff", eyes: "#1d1b33", cheeks: "#ff8fb1",
      bits: [...pointyEars("#f4a261", "#ffafcc"), bit([0.08, 0.06, 0.03], [0, -0.06, FACE + 0.01], "#ff8fab")],
    },
  },
  {
    id: "dog",
    name: "Dog",
    emoji: "🐶",
    cost: runnerPrices.dog,
    look: {
      body: "#c8a27a", legs: "#8d6346", shoes: "#ffffff", head: "#e3c099", hands: "#e3c099", eyes: "#1d1b33", cheeks: null,
      bits: [...floppyEars("#8d6346"), ...snout("#fff1e0")],
    },
  },
  {
    id: "monkey",
    name: "Monkey",
    emoji: "🐵",
    cost: runnerPrices.monkey,
    look: {
      body: "#8d6346", legs: "#6f4e37", shoes: "#6f4e37", head: "#8d6346", hands: "#e8c9a0", eyes: "#1d1b33", cheeks: null,
      bits: [...roundEars("#8d6346", "#e8c9a0"), ...facePatch("#e8c9a0"), ...snout("#e8c9a0", "#6f4e37")],
    },
  },
  {
    id: "panda",
    name: "Panda",
    emoji: "🐼",
    cost: runnerPrices.panda,
    look: {
      body: "#1d1b33", legs: "#1d1b33", shoes: "#1d1b33", head: "#ffffff", hands: "#1d1b33", eyes: "#ffffff", cheeks: "#ffafcc",
      bits: [...roundEars("#1d1b33"), ...pair((s) => bit([0.16, 0.2, 0.02], [s * 0.12, 0.03, FACE + 0.002], "#1d1b33")), bit([0.08, 0.06, 0.03], [0, -0.08, FACE + 0.01], "#1d1b33")],
    },
  },
  {
    id: "fox",
    name: "Fox",
    emoji: "🦊",
    cost: runnerPrices.fox,
    look: {
      body: "#f3722c", legs: "#1d1b33", shoes: "#1d1b33", head: "#f3722c", hands: "#1d1b33", eyes: "#1d1b33", cheeks: null,
      bits: [...pointyEars("#f3722c", "#1d1b33"), ...snout("#ffffff")],
    },
  },
  {
    id: "bear",
    name: "Bear",
    emoji: "🐻",
    cost: runnerPrices.bear,
    look: {
      body: "#9c6644", legs: "#7f5539", shoes: "#7f5539", head: "#9c6644", hands: "#9c6644", eyes: "#1d1b33", cheeks: null,
      bits: [...roundEars("#9c6644", "#e6ccb2"), ...snout("#e6ccb2")],
    },
  },
  {
    id: "unicorn",
    name: "Unicorn",
    emoji: "🦄",
    cost: runnerPrices.unicorn,
    look: {
      body: "#ffffff", legs: "#e0c3fc", shoes: "#c77dff", head: "#ffffff", hands: "#ffffff", eyes: "#1d1b33", cheeks: "#ffafcc",
      bits: [
        bit([0.08, 0.3, 0.08], [0, TOP + 0.12, 0.14], "#ffd23f", [0.35, 0, 0]),
        ...pointyEars("#ffffff", "#ffafcc"),
        bit([0.1, 0.14, 0.4], [0, TOP + 0.02, -0.1], "#ff70a6"),
        bit([0.1, 0.34, 0.1], [0, 0, -FACE - 0.04], "#70d6ff"),
      ],
    },
  },
  {
    id: "robot",
    name: "Robot",
    emoji: "🤖",
    cost: runnerPrices.robot,
    look: {
      body: "#adb5bd", legs: "#6c757d", shoes: "#495057", head: "#ced4da", hands: "#6c757d", eyes: "#4cc9f0", cheeks: null,
      bits: [
        bit([0.44, 0.16, 0.02], [0, 0.04, FACE + 0.004], "#1d1b33"),
        bit([0.04, 0.2, 0.04], [0, TOP + 0.1, 0], "#6c757d"),
        bit([0.1, 0.1, 0.1], [0, TOP + 0.22, 0], "#ff4fa3"),
        ...pair((s) => bit([0.06, 0.18, 0.18], [s * 0.3, 0, 0], "#6c757d")),
      ],
    },
  },
  {
    id: "explorer",
    name: "Explorer",
    emoji: "🧑‍🚀",
    cost: runnerPrices.explorer,
    look: {
      body: "#f8f9fa", legs: "#dee2e6", shoes: "#ff6b35", head: "#ffd7b5", hands: "#f8f9fa", eyes: "#1d1b33", cheeks: "#ff8fb1",
      bits: [
        // Helmet shell with the face showing through the visor.
        bit([0.66, 0.1, 0.66], [0, TOP + 0.05, 0], "#f8f9fa"),
        ...pair((s) => bit([0.06, 0.62, 0.66], [s * 0.31, 0, 0], "#f8f9fa")),
        bit([0.66, 0.62, 0.06], [0, 0, -0.31], "#f8f9fa"),
        bit([0.66, 0.08, 0.06], [0, 0.31, 0.31], "#4361ee"),
        bit([0.14, 0.14, 0.06], [0, 0.1, -0.36], "#ff6b35"),
      ],
    },
  },
];

export const DEFAULT_RUNNER_ID = "blocky";

export function getRunner(id: string): Runner {
  return runners.find((r) => r.id === id) ?? runners[0];
}
