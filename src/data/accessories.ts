import type { Accessory, AccessoryCategory, PremiumOption } from "../types/game";

// Spec v2 §8.1. First item in each category is free (0 gems) so every
// player can customise from gem zero.
export const accessories: Accessory[] = [
  // Hats
  { id: "hat_cap", name: "Cap", category: "hat", emoji: "🧢", gemCost: 0 },
  { id: "hat_party", name: "Party Hat", category: "hat", emoji: "🎉", gemCost: 75 },
  { id: "hat_wizard", name: "Wizard Hat", category: "hat", emoji: "🎩", gemCost: 150 },
  { id: "hat_crown", name: "Crown", category: "hat", emoji: "👑", gemCost: 250 },

  // Glasses
  { id: "glasses_round", name: "Round Specs", category: "glasses", emoji: "👓", gemCost: 0 },
  { id: "glasses_cool", name: "Cool Shades", category: "glasses", emoji: "🕶️", gemCost: 75 },
  { id: "glasses_heart", name: "Heart Glasses", category: "glasses", emoji: "😍", gemCost: 125 },
  { id: "glasses_star", name: "Star Glasses", category: "glasses", emoji: "🤩", gemCost: 200 },

  // Backpacks
  { id: "pack_star", name: "Star Pack", category: "backpack", emoji: "🎒", gemCost: 0 },
  { id: "pack_treasure", name: "Treasure Pack", category: "backpack", emoji: "💰", gemCost: 125 },
  { id: "pack_bug", name: "Bug Pack", category: "backpack", emoji: "🐞", gemCost: 175 },
  { id: "pack_rocket", name: "Rocket Pack", category: "backpack", emoji: "🚀", gemCost: 300 },

  // Shoes
  { id: "shoes_sneaker", name: "Sneakers", category: "shoes", emoji: "👟", gemCost: 0 },
  { id: "shoes_boots", name: "Boots", category: "shoes", emoji: "🥾", gemCost: 100 },
  { id: "shoes_skates", name: "Roller Skates", category: "shoes", emoji: "🛼", gemCost: 175 },
  { id: "shoes_flippers", name: "Flippers", category: "shoes", emoji: "🦶", gemCost: 225 },

  // Trails
  { id: "trail_bubble", name: "Bubble Trail", category: "trail", emoji: "🫧", gemCost: 0 },
  { id: "trail_star", name: "Star Trail", category: "trail", emoji: "⭐", gemCost: 150 },
  { id: "trail_heart", name: "Heart Trail", category: "trail", emoji: "💕", gemCost: 200 },
  { id: "trail_rainbow", name: "Rainbow Trail", category: "trail", emoji: "🌈", gemCost: 300 },

  // Sparkles
  { id: "sparkle_blue", name: "Blue Sparkle", category: "sparkle", emoji: "🔵", gemCost: 0 },
  { id: "sparkle_pink", name: "Pink Sparkle", category: "sparkle", emoji: "💗", gemCost: 150 },
  { id: "sparkle_gold", name: "Gold Sparkle", category: "sparkle", emoji: "✨", gemCost: 250 },
  { id: "sparkle_confetti", name: "Confetti", category: "sparkle", emoji: "🎊", gemCost: 350 },
];

export const categoryOrder: AccessoryCategory[] = [
  "hat",
  "glasses",
  "backpack",
  "shoes",
  "trail",
  "sparkle",
];

export const categoryLabels: Record<AccessoryCategory, string> = {
  hat: "Hats",
  glasses: "Glasses",
  backpack: "Backpacks",
  shoes: "Shoes",
  trail: "Trails",
  sparkle: "Sparkles",
};

// The free starter accessories, unlocked + equipped on a fresh save (spec v2 §10).
export const freeAccessoryIds = accessories
  .filter((a) => a.gemCost === 0)
  .map((a) => a.id);

export function getAccessory(id: string): Accessory | undefined {
  return accessories.find((a) => a.id === id);
}

export function accessoriesByCategory(category: AccessoryCategory): Accessory[] {
  return accessories.filter((a) => a.category === category);
}

// Spec v2 §15 — mock premium options (no real payments).
export const premiumOptions: PremiumOption[] = [
  { id: "small_gem_pack", name: "Small Gem Pack", description: "Get 500 gems", mockPrice: "$2" },
  { id: "character_unlock", name: "Unlock One Character", description: "Choose one locked character", mockPrice: "$2" },
  { id: "secret_map_unlock", name: "Unlock One Secret Map", description: "Choose one available secret map", mockPrice: "$2" },
];
