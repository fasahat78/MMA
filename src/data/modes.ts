import type { GameMode } from "../types/game";

// Play modes (added after MVP at user request). Easy is the original
// experience; Medium/Hard add a chaser that pursues the player.
export interface GameModeInfo {
  id: GameMode;
  label: string;
  emoji: string;
  blurb: string;
}

export const gameModeList: GameModeInfo[] = [
  { id: "easy", label: "Easy", emoji: "🌼", blurb: "Just explore — no one chases you." },
  { id: "medium", label: "Medium", emoji: "🐌", blurb: "A slow snail creeps after you." },
  { id: "hard", label: "Hard", emoji: "👻", blurb: "A speedy ghost hunts you down!" },
];

export interface ChaserConfig {
  enabled: boolean;
  emoji: string;
  /** Milliseconds between chaser steps — smaller is faster. */
  stepMs: number;
  /** Head-start before the chaser begins moving. */
  graceMs: number;
}

export const chaserConfig: Record<GameMode, ChaserConfig> = {
  easy: { enabled: false, emoji: "", stepMs: 0, graceMs: 0 },
  medium: { enabled: true, emoji: "🐌", stepMs: 620, graceMs: 1200 },
  hard: { enabled: true, emoji: "👻", stepMs: 240, graceMs: 700 },
};

// Power-ups (chase modes only). Instant-on-pickup, 5-second effects.
export const POWERUPS = {
  shieldEmoji: "🛡️",
  stunEmoji: "⚡",
  stunnedChaserEmoji: "💫",
  durationMs: 5000,
} as const;

// Sparse placement: 1 of each on smaller mazes, 2 of each on the big ones.
export function powerUpCount(difficulty: number): number {
  return difficulty <= 4 ? 1 : 2;
}
