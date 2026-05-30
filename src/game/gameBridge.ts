import type { EquippedAccessories, GameMode, MazeRunResult } from "../types/game";

// Spec v2 §12.1 — the only channel between Phaser and React. React builds the
// bridge and passes it into the scene; Phaser reports events and holds no
// progress state of its own.

// Scene key lives here (a Phaser-free module) so React can reference it
// without pulling Phaser into the main bundle.
export const MAZE_SCENE_KEY = "MazeScene";

// Remaining whole seconds for each active effect (0 = inactive).
export interface ActiveEffects {
  shieldSeconds: number;
  stunSeconds: number;
}

export interface GameBridge {
  onGemCollected: (runningCount: number) => void;
  onMazeComplete: (result: MazeRunResult) => void;
  onCaught: () => void;
  onEffectsChanged: (effects: ActiveEffects) => void;
  onExit: () => void;
}

export interface MazeSceneData {
  mapId: string;
  theme: string;
  difficulty: number;
  gemTarget: number;
  gameMode: GameMode;
  characterEmoji: string;
  equippedAccessories: EquippedAccessories;
  reducedMotion: boolean;
  bridge: GameBridge;
}
