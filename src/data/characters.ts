import type { Character } from "../types/game";

// Spec v2 §8. Penguin is free; the rest cost gems.
export const characters: Character[] = [
  { id: "penguin", name: "Penguin", emoji: "🐧", rarity: "starter", gemCost: 0 },
  { id: "bird", name: "Bird", emoji: "🐦", rarity: "common", gemCost: 100 },
  { id: "bunny", name: "Bunny", emoji: "🐰", rarity: "common", gemCost: 150 },
  { id: "cat", name: "Cat", emoji: "🐱", rarity: "common", gemCost: 200 },
  { id: "dog", name: "Dog", emoji: "🐶", rarity: "common", gemCost: 200 },
  { id: "monkey", name: "Monkey", emoji: "🐵", rarity: "rare", gemCost: 300 },
  { id: "panda", name: "Panda", emoji: "🐼", rarity: "rare", gemCost: 400 },
  { id: "fox", name: "Fox", emoji: "🦊", rarity: "rare", gemCost: 450 },
  { id: "bear", name: "Bear", emoji: "🐻", rarity: "rare", gemCost: 500 },
  { id: "unicorn", name: "Unicorn", emoji: "🦄", rarity: "epic", gemCost: 750 },
  { id: "robot", name: "Robot", emoji: "🤖", rarity: "epic", gemCost: 900 },
  { id: "explorer", name: "Explorer", emoji: "🧑‍🚀", rarity: "legendary", gemCost: 1200 },
];

export const rarityStyles: Record<string, { label: string; ring: string; chip: string }> = {
  starter: { label: "Starter", ring: "ring-slate-300", chip: "bg-slate-100 text-slate-600" },
  common: { label: "Common", ring: "ring-emerald-300", chip: "bg-emerald-100 text-emerald-700" },
  rare: { label: "Rare", ring: "ring-sky-300", chip: "bg-sky-100 text-sky-700" },
  epic: { label: "Epic", ring: "ring-fuchsia-300", chip: "bg-fuchsia-100 text-fuchsia-700" },
  legendary: { label: "Legendary", ring: "ring-amber-300", chip: "bg-amber-100 text-amber-700" },
};

export function getCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}
