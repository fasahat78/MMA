// Core domain types for Maze Mates Adventure.
// See spec v2 §11 (save data) and §12 (gameplay).

export type Rarity = "starter" | "common" | "rare" | "epic" | "legendary";

export type AccessoryCategory =
  | "hat"
  | "glasses"
  | "backpack"
  | "shoes"
  | "trail"
  | "sparkle";

export type MapUnlockType = "starter" | "complete_previous";

// Play difficulty mode chosen per run (added after MVP at user request).
// easy = no chaser; medium = a slow chaser; hard = a fast, agile chaser.
export type GameMode = "easy" | "medium" | "hard";

export interface MainMap {
  id: string;
  name: string;
  theme: string;
  emoji: string;
  difficulty: number;
  unlockType: MapUnlockType;
}

export interface SecretMap {
  id: string;
  name: string;
  emoji: string;
  difficulty: number;
  gemCost: number;
  requirement?: "complete_all_other_secret_maps";
}

export interface Character {
  id: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  gemCost: number;
}

export interface Accessory {
  id: string;
  name: string;
  category: AccessoryCategory;
  emoji: string;
  gemCost: number;
}

export interface PremiumOption {
  id: string;
  name: string;
  description: string;
  mockPrice: string;
}

export interface DifficultySetting {
  rows: number;
  cols: number;
  gems: number;
}

// Equipped accessories: at most one per category (spec v2 §11 fix).
export type EquippedAccessories = Record<AccessoryCategory, string | null>;

export interface PlayerProgress {
  version: number;
  totalGems: number;
  gameMode: GameMode;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  unlockedAccessoryIds: string[];
  equippedAccessories: EquippedAccessories;
  completedMapIds: string[];
  unlockedSecretMapIds: string[];
  completedSecretMapIds: string[];
  // Which modes each map has been cleared in (for the map-card badges).
  completedMapModes: Record<string, GameMode[]>;
  completedSecretMapModes: Record<string, GameMode[]>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  musicTrackId: string;
}

// Tiles produced by the maze generator (spec v2 §12).
export type TileType = "wall" | "path" | "gem" | "exit" | "start";

// Result reported by Phaser back to React when a run ends (spec v2 §12.1).
export interface MazeRunResult {
  mapId: string;
  gemsCollected: number;
  totalGemsInMaze: number;
}

// Navigation surfaces.
export type Screen =
  | "home"
  | "mapSelect"
  | "game"
  | "win"
  | "characters"
  | "accessories"
  | "secretMaps"
  | "settings";
