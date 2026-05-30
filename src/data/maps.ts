import type { DifficultySetting, MainMap, SecretMap } from "../types/game";

// Spec v2 §6
export const mainMaps: MainMap[] = [
  { id: "jungle", name: "Jungle Maze", theme: "jungle", emoji: "🌴", difficulty: 1, unlockType: "starter" },
  { id: "ice_cream", name: "Ice Cream Maze", theme: "ice_cream", emoji: "🍦", difficulty: 1, unlockType: "complete_previous" },
  { id: "chocolate", name: "Chocolate Maze", theme: "chocolate", emoji: "🍫", difficulty: 2, unlockType: "complete_previous" },
  { id: "candy", name: "Candy Maze", theme: "candy", emoji: "🍭", difficulty: 2, unlockType: "complete_previous" },
  { id: "marshmallow", name: "Marshmallow Maze", theme: "marshmallow", emoji: "☁️", difficulty: 2, unlockType: "complete_previous" },
  { id: "donut", name: "Donut Maze", theme: "donut", emoji: "🍩", difficulty: 3, unlockType: "complete_previous" },
  { id: "gem_cave", name: "Gem Cave Maze", theme: "gems", emoji: "💎", difficulty: 3, unlockType: "complete_previous" },
  { id: "animal", name: "Animal Maze", theme: "animals", emoji: "🐾", difficulty: 3, unlockType: "complete_previous" },
  { id: "forest", name: "Forest Maze", theme: "forest", emoji: "🌲", difficulty: 4, unlockType: "complete_previous" },
  { id: "beach", name: "Beach Maze", theme: "beach", emoji: "🏖️", difficulty: 4, unlockType: "complete_previous" },
  { id: "snow", name: "Snow Maze", theme: "snow", emoji: "❄️", difficulty: 5, unlockType: "complete_previous" },
  { id: "rainbow", name: "Rainbow Maze", theme: "rainbow", emoji: "🌈", difficulty: 5, unlockType: "complete_previous" },
];

// Spec v2 §7. Mega Mix is gated on completing the other four.
export const secretMaps: SecretMap[] = [
  { id: "food_aisle", name: "Food Aisle Maze", emoji: "🛒", difficulty: 5, gemCost: 750 },
  { id: "junk_food", name: "Junk Food Maze", emoji: "🍟", difficulty: 5, gemCost: 1000 },
  { id: "restaurant", name: "Restaurant Maze", emoji: "🍽️", difficulty: 6, gemCost: 1250 },
  { id: "dessert_palace", name: "Dessert Palace Maze", emoji: "🧁", difficulty: 6, gemCost: 1500 },
  {
    id: "mega_mix",
    name: "Mega Mix Maze",
    emoji: "🌈",
    difficulty: 7,
    gemCost: 3000,
    requirement: "complete_all_other_secret_maps",
  },
];

// Spec v2 §13 — single source of truth for maze size + gem count.
export const difficultySettings: Record<number, DifficultySetting> = {
  1: { rows: 9, cols: 9, gems: 30 },
  2: { rows: 11, cols: 11, gems: 40 },
  3: { rows: 13, cols: 13, gems: 50 },
  4: { rows: 15, cols: 15, gems: 60 },
  5: { rows: 17, cols: 17, gems: 75 },
  6: { rows: 19, cols: 19, gems: 90 },
  7: { rows: 21, cols: 21, gems: 120 },
};

// Themed background colours for the Phaser canvas (hex for Phaser).
export const themeColors: Record<string, { bg: number; wall: number; path: number }> = {
  jungle: { bg: 0x2f7d4f, wall: 0x1f5235, path: 0xa7e8bd },
  ice_cream: { bg: 0xffd9ec, wall: 0xe6a6c7, path: 0xfff2f8 },
  chocolate: { bg: 0x5b3a29, wall: 0x3d2519, path: 0xc8a07a },
  candy: { bg: 0xff8fc7, wall: 0xd45a9a, path: 0xffe0f0 },
  marshmallow: { bg: 0xeaf2ff, wall: 0xc4d4ee, path: 0xffffff },
  donut: { bg: 0xf6c6a0, wall: 0xd99a6c, path: 0xfff0e2 },
  gems: { bg: 0x3a2f6b, wall: 0x241d47, path: 0x9b8cf0 },
  animals: { bg: 0xc9e8a0, wall: 0x99c46a, path: 0xeefbd6 },
  forest: { bg: 0x274d2f, wall: 0x16331d, path: 0x8fd09a },
  beach: { bg: 0xffe9a8, wall: 0xe6c574, path: 0xfff7df },
  snow: { bg: 0xdcefff, wall: 0xb3d4f0, path: 0xffffff },
  rainbow: { bg: 0xfbe6ff, wall: 0xd9a6ee, path: 0xfff4ff },
  // Secret maps reuse pleasant defaults keyed by id-as-theme fallback below.
};

export function colorsForTheme(theme: string) {
  return themeColors[theme] ?? { bg: 0xfde8ff, wall: 0xc9a6e0, path: 0xfff6ff };
}

export function getMainMap(id: string): MainMap | undefined {
  return mainMaps.find((m) => m.id === id);
}

export function getSecretMap(id: string): SecretMap | undefined {
  return secretMaps.find((m) => m.id === id);
}
