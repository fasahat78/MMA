# Claude Code Specification: Maze Mates Adventure (v2)

> Revision of the original spec. Changes from v1 are summarised in §0. This version is standalone and ready to hand to Claude Code as-is.

## 0. What changed from v1

1. **Accessories are now fully specified** — real `accessories.ts` data (24 items across 6 categories) with costs, and a corrected equip model (one item per category, not a flat array).
2. **Gem economy is now an explicit, stated design decision** — with the income/cost math shown (§9) and a clear pacing intent. A small replay bonus was added; `noMistakeBonus` was removed.
3. **`noMistakeBonus` removed** — it was undefined and contradicted "no enemies / no timer / no lives."
4. **Phaser↔React bridge is now specified** (§12.1) — the event contract between the Phaser scene and the React store.
5. **Save schema versioning added** (§11) — `version` field + migration shim so future updates don't break existing saves.
6. **Maze generation rules tightened** (§12) — guaranteed-solvable generator, gems only on reachable tiles.
7. **Single source of truth for gem counts** — `difficultySettings` is canonical; `mazeGemCounts` removed.
8. **Final-map win edge case handled** (§5.4) and an accessibility baseline added (§14).

---

## 1. Project Overview

Build a colourful maze adventure game called **Maze Mates Adventure**.

The player moves through themed mazes, collects gems, unlocks characters, unlocks accessories, and eventually unlocks secret maps.

The game should feel:

* fun
* colourful
* child-friendly
* playful
* simple to understand
* rewarding without being stressful

Build it first as a **mobile-friendly web app MVP**.

## 2. Recommended Tech Stack

* Vite
* React
* TypeScript
* Tailwind CSS
* Phaser 3 for the actual maze gameplay
* localStorage for saving player progress
* No backend for MVP
* No real payments for MVP
* Mock premium purchases with a fake purchase confirmation screen

Folder structure:

```
/src
  /components
  /game
    MazeScene.ts
    gameConfig.ts
    mazeGenerator.ts      // NEW: solvable maze generation
    gameBridge.ts         // NEW: Phaser <-> React contract
  /data
    maps.ts
    characters.ts
    accessories.ts
  /screens
    HomeScreen.tsx
    MapSelectScreen.tsx
    GameScreen.tsx
    WinScreen.tsx
    CharacterShopScreen.tsx
    AccessoriesScreen.tsx
    SecretMapsScreen.tsx
    SettingsScreen.tsx
    ParentGateScreen.tsx
  /store
    progressStore.ts
    migrations.ts         // NEW: save-schema migrations
  /types
    game.ts
  App.tsx
  main.tsx
```

## 3. Core Game Loop

1. Open the game.
2. Choose a character.
3. Choose an unlocked maze.
4. Move through the maze.
5. Collect gems.
6. Reach the exit.
7. See a win screen.
8. Earn gems.
9. Unlock new maps, characters, and accessories.
10. Complete all 12 main maps.
11. Unlock access to 5 secret maps.

## 4. MVP Scope

Build:

* Home screen
* Map select screen
* Basic maze gameplay
* Gem collection
* Win screen
* Character shop
* Accessories screen
* Secret maps screen
* Local saved progress
* Mock premium unlocks

Do not build real payments yet.

## 5. Game Screens

### 5.1 Home Screen

Show:

* Game title: Maze Mates Adventure
* Current selected character (with equipped accessories rendered if practical)
* Total gems
* Buttons: Play, Characters, Accessories, Secret Maps, Settings

### 5.2 Map Select Screen

Show 12 main maps in a grid. Each map card shows:

* map name
* theme icon or emoji
* locked/unlocked state
* completion state
* difficulty stars

Locked maps show: `Complete the previous maze to unlock.`

### 5.3 Game Screen

Includes:

* maze area (Phaser canvas)
* player character
* gems inside the maze
* exit tile
* gem counter (live, driven by the Phaser bridge — see §12.1)
* pause button
* back button

Player movement:

* desktop: arrow keys or WASD
* mobile: on-screen directional buttons

The player wins when they reach the exit.

### 5.4 Win Screen

Show:

* "Maze Complete!"
* gems collected this run
* bonus gems (itemised: finish, first-time, collect-all)
* total gems
* **next-step message (handles the final map):**
  * If a next main map exists: `New maze unlocked: {nextMapName}!`
  * If this was the **12th** main map: `You finished all 12 mazes! Secret maps are now unlocked!`
  * If this was a secret map: `Secret maze complete!`
* buttons: Next Maze (hidden/disabled when there is no next map), Replay, Map Select, Character Shop

### 5.5 Character Shop

Show 12 characters. Each card shows:

* character name
* emoji or simple image placeholder
* rarity
* gem cost
* locked/unlocked state
* select button if unlocked
* unlock button if locked

If not enough gems: `Not enough gems. Collect more gems in mazes.`

Also show a mock button: `Ask a grown-up to unlock faster` → opens Parent Gate.

### 5.6 Accessories Screen

Customise the selected character. **One accessory may be equipped per category at a time** (equipping a new hat replaces the old hat). An equipped accessory can be unequipped (set back to none).

Categories: Hats, Glasses, Backpacks, Shoes, Trails, Sparkles.

Each accessory card shows:

* name
* category
* gem cost
* locked/unlocked state
* equip / equipped / unequip button (unlocked only)
* unlock button (locked)

Full accessory data is in §8.1.

### 5.7 Secret Maps Screen

Before all 12 main maps are complete: `Secret maps are hidden. Complete all 12 main mazes to discover them.`

After all 12 main maps complete: show 5 secret maps. Secret maps unlock with gems. Mega Mix Maze is locked until the other 4 secret maps are completed.

Also show mock premium unlock behind Parent Gate.

### 5.8 Parent Gate Screen

A mock safety screen for MVP.

Show: `Ask a grown-up before unlocking premium items.`

Challenge: `Type the word PARENT to continue.` (case-insensitive accepted)

After success, show mock purchase screen: `This is a demo. No real money will be charged.` Then allow mock unlock.

> **Production note (not MVP):** "type PARENT" is *not* a compliant parental gate. Before shipping real purchases to children, address COPPA / GDPR-K (verifiable parental consent, no behavioural ads, data-minimisation). Out of scope for MVP, but do not ship monetisation without it.

## 6. Main Maps

```ts
const mainMaps = [
  { id: "jungle",      name: "Jungle Maze",      theme: "jungle",     emoji: "🌴",  difficulty: 1, unlockType: "starter" },
  { id: "ice_cream",   name: "Ice Cream Maze",   theme: "ice_cream",  emoji: "🍦",  difficulty: 1, unlockType: "complete_previous" },
  { id: "chocolate",   name: "Chocolate Maze",   theme: "chocolate",  emoji: "🍫",  difficulty: 2, unlockType: "complete_previous" },
  { id: "candy",       name: "Candy Maze",       theme: "candy",      emoji: "🍭",  difficulty: 2, unlockType: "complete_previous" },
  { id: "marshmallow", name: "Marshmallow Maze", theme: "marshmallow",emoji: "☁️",  difficulty: 2, unlockType: "complete_previous" },
  { id: "donut",       name: "Donut Maze",       theme: "donut",      emoji: "🍩",  difficulty: 3, unlockType: "complete_previous" },
  { id: "gem_cave",    name: "Gem Cave Maze",    theme: "gems",       emoji: "💎",  difficulty: 3, unlockType: "complete_previous" },
  { id: "animal",      name: "Animal Maze",      theme: "animals",    emoji: "🐾",  difficulty: 3, unlockType: "complete_previous" },
  { id: "forest",      name: "Forest Maze",      theme: "forest",     emoji: "🌲",  difficulty: 4, unlockType: "complete_previous" },
  { id: "beach",       name: "Beach Maze",       theme: "beach",      emoji: "🏖️",  difficulty: 4, unlockType: "complete_previous" },
  { id: "snow",        name: "Snow Maze",        theme: "snow",       emoji: "❄️",  difficulty: 5, unlockType: "complete_previous" },
  { id: "rainbow",     name: "Rainbow Maze",     theme: "rainbow",    emoji: "🌈",  difficulty: 5, unlockType: "complete_previous" }
];
```

## 7. Secret Maps

Secret maps only appear after all 12 main maps are complete.

```ts
const secretMaps = [
  { id: "food_aisle",     name: "Food Aisle Maze",     emoji: "🛒", difficulty: 5, gemCost: 750 },
  { id: "junk_food",      name: "Junk Food Maze",      emoji: "🍟", difficulty: 5, gemCost: 1000 },
  { id: "restaurant",     name: "Restaurant Maze",     emoji: "🍽️", difficulty: 6, gemCost: 1250 },
  { id: "dessert_palace", name: "Dessert Palace Maze", emoji: "🧁", difficulty: 6, gemCost: 1500 },
  { id: "mega_mix",       name: "Mega Mix Maze",       emoji: "🌴🍭🍫🍦💎", difficulty: 7, gemCost: 3000, requirement: "complete_all_other_secret_maps" }
];
```

The Mega Mix Maze combines all themes: jungle, candy, chocolate, ice cream, gems, beach, animals, forest, rainbow.

## 8. Characters

12 characters. The first is free.

```ts
const characters = [
  { id: "penguin",  name: "Penguin",  emoji: "🐧",   rarity: "starter",   gemCost: 0 },
  { id: "bird",     name: "Bird",     emoji: "🐦",   rarity: "common",    gemCost: 100 },
  { id: "bunny",    name: "Bunny",    emoji: "🐰",   rarity: "common",    gemCost: 150 },
  { id: "cat",      name: "Cat",      emoji: "🐱",   rarity: "common",    gemCost: 200 },
  { id: "dog",      name: "Dog",      emoji: "🐶",   rarity: "common",    gemCost: 200 },
  { id: "monkey",   name: "Monkey",   emoji: "🐵",   rarity: "rare",      gemCost: 300 },
  { id: "panda",    name: "Panda",    emoji: "🐼",   rarity: "rare",      gemCost: 400 },
  { id: "fox",      name: "Fox",      emoji: "🦊",   rarity: "rare",      gemCost: 450 },
  { id: "bear",     name: "Bear",     emoji: "🐻",   rarity: "rare",      gemCost: 500 },
  { id: "unicorn",  name: "Unicorn",  emoji: "🦄",   rarity: "epic",      gemCost: 750 },
  { id: "robot",    name: "Robot",    emoji: "🤖",   rarity: "epic",      gemCost: 900 },
  { id: "explorer", name: "Explorer", emoji: "🧑‍🚀", rarity: "legendary", gemCost: 1200 }
];
```

### 8.1 Accessories (NEW — was missing in v1)

Six categories, four items each (24 total). The first item in each category is **free (0 gems)** so every player can customise immediately. Costs scale with how "showy" the category is: cosmetic effects (Trails, Sparkles) cost more than basic items (Hats, Glasses).

`category` values are a closed set used by the equip model in §11.

```ts
type AccessoryCategory = "hat" | "glasses" | "backpack" | "shoes" | "trail" | "sparkle";

const accessories = [
  // Hats
  { id: "hat_cap",        name: "Cap",          category: "hat",      emoji: "🧢", gemCost: 0 },
  { id: "hat_party",      name: "Party Hat",    category: "hat",      emoji: "🎉", gemCost: 75 },
  { id: "hat_wizard",     name: "Wizard Hat",   category: "hat",      emoji: "🎩", gemCost: 150 },
  { id: "hat_crown",      name: "Crown",        category: "hat",      emoji: "👑", gemCost: 250 },

  // Glasses
  { id: "glasses_round",  name: "Round Specs",  category: "glasses",  emoji: "👓", gemCost: 0 },
  { id: "glasses_cool",   name: "Cool Shades",  category: "glasses",  emoji: "🕶️", gemCost: 75 },
  { id: "glasses_heart",  name: "Heart Glasses",category: "glasses",  emoji: "😍", gemCost: 125 },
  { id: "glasses_star",   name: "Star Glasses", category: "glasses",  emoji: "🤩", gemCost: 200 },

  // Backpacks
  { id: "pack_star",      name: "Star Pack",    category: "backpack", emoji: "🎒", gemCost: 0 },
  { id: "pack_treasure",  name: "Treasure Pack",category: "backpack", emoji: "💰", gemCost: 125 },
  { id: "pack_bug",       name: "Bug Pack",     category: "backpack", emoji: "🐞", gemCost: 175 },
  { id: "pack_rocket",    name: "Rocket Pack",  category: "backpack", emoji: "🚀", gemCost: 300 },

  // Shoes
  { id: "shoes_sneaker",  name: "Sneakers",     category: "shoes",    emoji: "👟", gemCost: 0 },
  { id: "shoes_boots",    name: "Boots",        category: "shoes",    emoji: "🥾", gemCost: 100 },
  { id: "shoes_skates",   name: "Roller Skates",category: "shoes",    emoji: "🛼", gemCost: 175 },
  { id: "shoes_flippers", name: "Flippers",     category: "shoes",    emoji: "🦶", gemCost: 225 },

  // Trails (cosmetic motion effect behind the player)
  { id: "trail_bubble",   name: "Bubble Trail", category: "trail",    emoji: "🫧", gemCost: 0 },
  { id: "trail_star",     name: "Star Trail",   category: "trail",    emoji: "⭐", gemCost: 150 },
  { id: "trail_heart",    name: "Heart Trail",  category: "trail",    emoji: "💕", gemCost: 200 },
  { id: "trail_rainbow",  name: "Rainbow Trail",category: "trail",    emoji: "🌈", gemCost: 300 },

  // Sparkles (cosmetic shimmer around the player)
  { id: "sparkle_blue",   name: "Blue Sparkle", category: "sparkle",  emoji: "🔵", gemCost: 0 },
  { id: "sparkle_pink",   name: "Pink Sparkle", category: "sparkle",  emoji: "💗", gemCost: 150 },
  { id: "sparkle_gold",   name: "Gold Sparkle", category: "sparkle",  emoji: "✨", gemCost: 250 },
  { id: "sparkle_confetti",name:"Confetti",     category: "sparkle",  emoji: "🎊", gemCost: 350 }
];
```

For MVP, accessories may be rendered as a small emoji badge overlaid near the character (Trails/Sparkles can be a simple particle/CSS effect). Full art is not required.

## 9. Gem Economy

Gems are the main reward currency. This section is now an **explicit design decision**, not just a table.

### 9.1 Gem rewards

```ts
const gemRewards = {
  gemPickup: 1,                  // per gem tile collected
  finishMaze: 20,                // reaching the exit
  firstTimeCompletionBonus: 50,  // first clear of a given map only
  collectAllGemsBonus: 30,       // collected every gem in the run
  replayCompletionBonus: 5       // NEW: small reward for replays so grinding isn't dead time
};
// NOTE: noMistakeBonus from v1 was REMOVED — there are no enemies/timer/lives, so "mistake" was undefined.
```

### 9.2 Design intent & balance math (read before tuning)

These numbers are deliberate. Decide consciously before changing them.

**First full playthrough income** (clear all 12 maps once, collecting every gem):

* Pickup gems: sum of gems across all 12 maps = **600** (see §13 — difficulties 1,1,2,2,2,3,3,3,4,4,5,5 → 30,30,40,40,40,50,50,50,60,60,75,75).
* Per-map first-clear bonus: `finishMaze(20) + firstTime(50) + collectAll(30)` = **100** × 12 = **1,200**.
* **First playthrough total ≈ 1,800 gems.**

**Intended pacing:**

* **Characters are reachable through normal play.** The first five (Bird→Monkey = 950 gems) are comfortably affordable inside one playthrough. The full roster (5,150 gems) takes the first playthrough plus light replaying — that's the core progression and it is meant to feel achievable.
* **Secret maps are an aspirational long-tail** (7,500 gems total). They are intentionally a grind, and they are the primary thing the **mock premium gem packs exist to accelerate**. This is by design: a kid who plays a lot can earn them; the "ask a grown-up" path shortcuts it.
* A difficulty-5 **replay** earns ≈ `75 pickups + 20 + 30 + 5` = **130 gems**, so secret-map grinding is slow but never zero.

**If you want a shorter game:** lower secret-map costs (e.g. halve them) and/or raise `replayCompletionBonus`. **If you want a longer one:** leave as-is. Do not silently drift — pick one.

## 10. Progression Rules

1. Player starts with: 0 gems, Penguin unlocked, Jungle Maze unlocked, the four free accessories (`hat_cap`, `glasses_round`, `pack_star`, `shoes_sneaker`, `trail_bubble`, `sparkle_blue`) unlocked and equipped.
2. Completing a main map unlocks the next main map.
3. A map is marked complete when the player reaches the exit.
4. Collected gems + bonuses are added to total gems at the end of the maze.
5. Characters can be unlocked with gems.
6. Accessories can be unlocked with gems; one equipped per category.
7. Secret maps are hidden until all 12 main maps are complete.
8. Secret maps require large gem amounts.
9. Mega Mix Maze is locked until the first 4 secret maps are complete.
10. Premium unlocks are mocked in MVP.

## 11. Local Save Data

Use localStorage under a single key, e.g. `mma:progress`. **The save is versioned** so future field additions don't corrupt existing players.

```ts
const SAVE_VERSION = 1;

type AccessoryCategory = "hat" | "glasses" | "backpack" | "shoes" | "trail" | "sparkle";

type PlayerProgress = {
  version: number;                  // NEW: schema version for migrations
  totalGems: number;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  unlockedAccessoryIds: string[];
  // CHANGED: one equipped accessory per category (was a flat string[] that allowed two hats)
  equippedAccessories: Record<AccessoryCategory, string | null>;
  completedMapIds: string[];
  unlockedSecretMapIds: string[];
  completedSecretMapIds: string[];
  soundEnabled: boolean;
  musicEnabled: boolean;
};

const defaultProgress: PlayerProgress = {
  version: SAVE_VERSION,
  totalGems: 0,
  selectedCharacterId: "penguin",
  unlockedCharacterIds: ["penguin"],
  unlockedAccessoryIds: [
    "hat_cap", "glasses_round", "pack_star", "shoes_sneaker", "trail_bubble", "sparkle_blue"
  ],
  equippedAccessories: {
    hat: "hat_cap",
    glasses: "glasses_round",
    backpack: "pack_star",
    shoes: "shoes_sneaker",
    trail: "trail_bubble",
    sparkle: "sparkle_blue"
  },
  completedMapIds: [],
  unlockedSecretMapIds: [],
  completedSecretMapIds: [],
  soundEnabled: true,
  musicEnabled: true
};
```

### 11.1 Migration shim (`migrations.ts`)

On load: parse the stored object, read `version`. If missing or `< SAVE_VERSION`, run migrations in order up to the current version, then persist. If the data is unparseable, fall back to `defaultProgress`. Always merge over `defaultProgress` so any newly-added field gets a default. Never trust the stored shape blindly (validate at the boundary).

```ts
function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem("mma:progress");
    if (!raw) return { ...defaultProgress };
    const parsed = JSON.parse(raw);
    const migrated = migrate(parsed);            // bump version field by field
    return { ...defaultProgress, ...migrated };  // backfill any missing keys
  } catch {
    return { ...defaultProgress };
  }
}
```

## 12. Maze Gameplay Requirements

Use Phaser 3. For MVP, generate **grid-based mazes procedurally** in `mazeGenerator.ts`.

Each maze must have: walls, paths, a player start, an exit tile, gems on path tiles, a themed background colour, and themed decorative tiles.

```ts
type TileType = "wall" | "path" | "gem" | "exit" | "start";
```

Generation rules (must hold every time):

* Use a **recursive-backtracker** (or equivalent) carve algorithm so the maze is **always fully connected** — there is always a path from `start` to `exit`.
* The `exit` is placed on a reachable path tile (e.g. the carve cell farthest from start).
* **Gems are placed only on reachable path tiles** (never inside walls, never on start/exit). If the maze has fewer free path tiles than the target gem count, place as many as fit.
* Player rules: cannot move through walls; moves on path tiles; collects a gem by stepping on a gem tile; wins by stepping on the exit tile.

No enemies, no timer, no lives in MVP. Keep it simple and fun first.

### 12.1 Phaser ↔ React bridge (NEW — the key integration point)

React owns navigation, the gem store, and all non-game screens. Phaser owns only the maze. They communicate through a **typed bridge object** that React creates and passes into the scene. Phaser never imports the store directly.

`gameBridge.ts`:

```ts
export type MazeRunResult = {
  mapId: string;
  gemsCollected: number;   // gems picked up this run
  totalGemsInMaze: number; // for the collect-all bonus check
};

export interface GameBridge {
  onGemCollected: (runningCount: number) => void; // update the live HUD counter
  onMazeComplete: (result: MazeRunResult) => void; // player reached exit
  onExit: () => void;                              // player pressed back/pause-quit
}
```

Wiring (in `GameScreen.tsx`):

1. On mount, create the Phaser game in a `useEffect`, and start the scene with data:
   `game.scene.start("MazeScene", { mapId, difficulty, characterId, equippedAccessories, bridge })`.
2. The `bridge` is built in React. `onGemCollected` updates a local `useState` for the HUD only (no persistence mid-run). `onMazeComplete` computes bonuses, commits gems to `progressStore`, marks the map complete, unlocks the next map, then navigates to `WinScreen` with the result. `onExit` tears down and routes back to Map Select.
3. `MazeScene` calls `this.scene.settings.data.bridge.onGemCollected(n)` when a gem is picked up and `...onMazeComplete(result)` when the exit is reached. It holds no game-progress state of its own beyond the current run.
4. On unmount, `game.destroy(true)` to avoid leaks / duplicate canvases when re-entering.

Rationale: keep the source of truth (gems, unlocks, save) in React/`progressStore`; Phaser is a pure gameplay surface that reports events. This avoids the classic dual-state desync between engine and UI.

## 13. Maze Difficulty (single source of truth for size + gem count)

`difficultySettings` is canonical. (v1's separate `mazeGemCounts` was removed to avoid two places drifting.)

```ts
const difficultySettings = {
  1: { rows: 9,  cols: 9,  gems: 30 },
  2: { rows: 11, cols: 11, gems: 40 },
  3: { rows: 13, cols: 13, gems: 50 },
  4: { rows: 15, cols: 15, gems: 60 },
  5: { rows: 17, cols: 17, gems: 75 },
  6: { rows: 19, cols: 19, gems: 90 },
  7: { rows: 21, cols: 21, gems: 120 }
};
```

Difficulty affects maze size, number of turns, gem count, and path complexity.

## 14. Visual Style & Accessibility

Bright, soft, child-friendly. UI: rounded cards, large buttons, big emojis/placeholder icons, pastel gradients, simple readable font, clear locked/unlocked states, satisfying gem animations. No scary visuals.

**Accessibility baseline (cheap, do it now):**

* Touch targets ≥ 44×44px (kids tap imprecisely).
* Text/background contrast meets WCAG AA; don't rely on colour alone for locked/unlocked (pair with a lock icon).
* Honour `prefers-reduced-motion`: tone down gem bursts, trails, and sparkles when set.

**Copy rules — no pressure-based purchase language.** Avoid: "Buy now before it disappears", "You are missing out", "Only premium players can win". Use fair wording: "Collect gems to unlock", "Unlock faster with grown-up help", "Keep playing to earn more gems".

## 15. Premium Unlock Mock

No Stripe / Apple Pay / Google Pay / real IAP. Mock options:

```ts
const premiumOptions = [
  { id: "small_gem_pack",   name: "Small Gem Pack",      description: "Get 500 gems",                 mockPrice: "$2" },
  { id: "character_unlock", name: "Unlock One Character",description: "Choose one locked character",  mockPrice: "$2" },
  { id: "secret_map_unlock",name: "Unlock One Secret Map",description:"Choose one available secret map",mockPrice: "$2" }
];
```

Before mock purchase, show Parent Gate. After mock purchase, update localStorage.

## 16. Acceptance Criteria

1. Player can open the home screen.
2. Player can select Play.
3. Player can see 12 maps.
4. Only the first map is unlocked at the start.
5. Player can enter the first maze.
6. Player can move around the maze.
7. Player cannot walk through walls.
8. Player can collect gems (HUD updates live via the bridge).
9. Player can reach the exit.
10. Win screen shows collected gems and itemised bonuses.
11. Completed map unlocks the next map; completing the 12th shows the secret-maps-unlocked message.
12. Gems and all progress are saved in localStorage and survive a refresh.
13. Save loads through the versioned migration shim without crashing on older/missing fields.
14. Character shop shows 12 characters; player can unlock with gems and select an unlocked one.
15. Accessories screen shows all 24 accessories; equipping a new item in a category replaces the old one (never two hats).
16. Secret maps screen stays hidden/locked until all 12 main maps are complete; Mega Mix locked until the other 4 secret maps are complete.
17. Parent Gate (type PARENT, case-insensitive) appears before any mock premium unlock.
18. Settings screen allows reset progress (restores `defaultProgress`).
19. Game works on desktop (keyboard) and mobile (on-screen controls) screen sizes.
20. No `noMistakeBonus` exists anywhere (removed).

## 17. Suggested Claude Code Prompt

> Build a mobile-friendly web game called **Maze Mates Adventure** using Vite, React, TypeScript, Tailwind CSS, and Phaser 3.
>
> Colourful, child-friendly maze adventure. The player completes 12 themed mazes, collects gems, unlocks characters and accessories, and eventually unlocks 5 secret maps. Use localStorage for all saved progress (versioned, with a migration shim). No backend. No real payments — mock premium purchases behind a Parent Gate (type PARENT, case-insensitive) followed by a "no real money will be charged" demo screen.
>
> Screens: HomeScreen, MapSelectScreen, GameScreen, WinScreen, CharacterShopScreen, AccessoriesScreen, SecretMapsScreen, SettingsScreen, ParentGateScreen.
>
> Gameplay in Phaser 3, grid-based mazes generated with a recursive-backtracker so they are always solvable; gems only on reachable path tiles. Keyboard on desktop, on-screen D-pad on mobile. Cannot move through walls. Collect gems by stepping on gem tiles. Win by reaching the exit.
>
> Phaser and React communicate ONLY through a typed `GameBridge` (`onGemCollected`, `onMazeComplete`, `onExit`) created in React and passed into the scene via scene data. React/`progressStore` is the single source of truth; Phaser holds no progress state. Destroy the Phaser game on unmount.
>
> Data files: maps.ts, characters.ts, accessories.ts (24 items, 6 categories, first item in each category free). Progress in progressStore.ts using the versioned PlayerProgress schema with `equippedAccessories: Record<category, id|null>` (one per category). Starting progress: 0 gems, Penguin unlocked, Jungle Maze unlocked, the 6 free accessories unlocked + equipped.
>
> Gem rewards: pickup 1, finishMaze 20, firstTimeCompletionBonus 50, collectAllGemsBonus 30, replayCompletionBonus 5. (No noMistakeBonus.) Secret maps cost 750/1000/1250/1500/3000; Mega Mix locked until the other 4 are complete; secret maps hidden until all 12 main maps complete.
>
> Use the maps, characters, accessories, difficultySettings, and acceptance criteria exactly as given in the spec. Bright, rounded, large-button visual style; touch targets ≥44px; honour prefers-reduced-motion; no pressure-based purchase language.

## 18. Best First Build Order

1. App shell and navigation
2. Game data files (maps, characters, accessories, difficultySettings)
3. localStorage progress store **+ versioned migration shim**
4. Home screen
5. Map select screen
6. `mazeGenerator.ts` (solvable maze + gem placement) — verify in isolation
7. Phaser maze scene **+ GameBridge contract**
8. Gem collection (HUD via bridge) and win logic (bonuses, unlock next, save)
9. Character shop
10. Accessories (equip-one-per-category model)
11. Secret maps
12. Parent gate + mock premium
13. Polish, accessibility pass, mobile responsiveness

This is ready for a first Claude Code build.
