Claude Code Specification: Maze Mates Adventure

1. Project Overview

Build a colourful maze adventure game called Maze Mates Adventure.

The player moves through themed mazes, collects gems, unlocks characters, unlocks accessories, and eventually unlocks secret maps.

The game should feel:

* fun
* colourful
* child-friendly
* playful
* simple to understand
* rewarding without being stressful

The game should be built first as a mobile-friendly web app MVP.

2. Recommended Tech Stack

Use:

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

/src
  /components
  /game
    MazeScene.ts
    gameConfig.ts
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
  /types
    game.ts
  App.tsx
  main.tsx

3. Core Game Loop

The player should:

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

4. MVP Scope

For the first playable version, build:

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

5. Game Screens

5.1 Home Screen

Show:

* Game title: Maze Mates Adventure
* Current selected character
* Total gems
* Buttons:
    * Play
    * Characters
    * Accessories
    * Secret Maps
    * Settings

5.2 Map Select Screen

Show 12 main maps in a grid.

Each map card should show:

* map name
* theme icon or emoji
* locked/unlocked state
* completion state
* difficulty stars

Locked maps should show:

Complete the previous maze to unlock.

5.3 Game Screen

The gameplay screen should include:

* maze area
* player character
* gems inside the maze
* exit tile
* gem counter
* pause button
* back button

Player movement:

* desktop: arrow keys or WASD
* mobile: on-screen directional buttons

The player wins when they reach the exit.

5.4 Win Screen

Show:

* “Maze Complete!”
* gems collected
* bonus gems
* total gems
* next map unlocked message
* buttons:
    * Next Maze
    * Replay
    * Map Select
    * Character Shop

5.5 Character Shop

Show 12 characters.

Each character card should show:

* character name
* emoji or simple image placeholder
* rarity
* gem cost
* locked/unlocked state
* select button if unlocked
* unlock button if locked

If the player does not have enough gems, show:

Not enough gems. Collect more gems in mazes.

Also show a mock button:

Ask a grown-up to unlock faster

This should open the Parent Gate screen.

5.6 Accessories Screen

Allow player to customise the selected character.

Accessory categories:

* Hats
* Glasses
* Backpacks
* Shoes
* Trails
* Sparkles

Each accessory has:

* name
* category
* gem cost
* locked/unlocked state
* equip button

5.7 Secret Maps Screen

Before all 12 main maps are complete, show:

Secret maps are hidden. Complete all 12 main mazes to discover them.

After all 12 main maps are complete, show 5 secret maps.

Secret maps can be unlocked with lots of gems.

Also show mock premium unlock option behind Parent Gate.

5.8 Parent Gate Screen

For MVP, this should be a mock safety screen.

Show:

Ask a grown-up before unlocking premium items.

Simple parent gate challenge:

Type the word PARENT to continue.

After success, show mock purchase screen:

This is a demo. No real money will be charged.

Then allow mock unlock.

6. Main Maps

Create 12 main maps.

const mainMaps = [
  {
    id: "jungle",
    name: "Jungle Maze",
    theme: "jungle",
    emoji: "🌴",
    difficulty: 1,
    unlockType: "starter"
  },
  {
    id: "ice_cream",
    name: "Ice Cream Maze",
    theme: "ice_cream",
    emoji: "🍦",
    difficulty: 1,
    unlockType: "complete_previous"
  },
  {
    id: "chocolate",
    name: "Chocolate Maze",
    theme: "chocolate",
    emoji: "🍫",
    difficulty: 2,
    unlockType: "complete_previous"
  },
  {
    id: "candy",
    name: "Candy Maze",
    theme: "candy",
    emoji: "🍭",
    difficulty: 2,
    unlockType: "complete_previous"
  },
  {
    id: "marshmallow",
    name: "Marshmallow Maze",
    theme: "marshmallow",
    emoji: "☁️",
    difficulty: 2,
    unlockType: "complete_previous"
  },
  {
    id: "donut",
    name: "Donut Maze",
    theme: "donut",
    emoji: "🍩",
    difficulty: 3,
    unlockType: "complete_previous"
  },
  {
    id: "gem_cave",
    name: "Gem Cave Maze",
    theme: "gems",
    emoji: "💎",
    difficulty: 3,
    unlockType: "complete_previous"
  },
  {
    id: "animal",
    name: "Animal Maze",
    theme: "animals",
    emoji: "🐾",
    difficulty: 3,
    unlockType: "complete_previous"
  },
  {
    id: "forest",
    name: "Forest Maze",
    theme: "forest",
    emoji: "🌲",
    difficulty: 4,
    unlockType: "complete_previous"
  },
  {
    id: "beach",
    name: "Beach Maze",
    theme: "beach",
    emoji: "🏖️",
    difficulty: 4,
    unlockType: "complete_previous"
  },
  {
    id: "snow",
    name: "Snow Maze",
    theme: "snow",
    emoji: "❄️",
    difficulty: 5,
    unlockType: "complete_previous"
  },
  {
    id: "rainbow",
    name: "Rainbow Maze",
    theme: "rainbow",
    emoji: "🌈",
    difficulty: 5,
    unlockType: "complete_previous"
  }
];

7. Secret Maps

Secret maps only appear after all 12 main maps are complete.

const secretMaps = [
  {
    id: "food_aisle",
    name: "Food Aisle Maze",
    emoji: "🛒",
    difficulty: 5,
    gemCost: 750
  },
  {
    id: "junk_food",
    name: "Junk Food Maze",
    emoji: "🍟",
    difficulty: 5,
    gemCost: 1000
  },
  {
    id: "restaurant",
    name: "Restaurant Maze",
    emoji: "🍽️",
    difficulty: 6,
    gemCost: 1250
  },
  {
    id: "dessert_palace",
    name: "Dessert Palace Maze",
    emoji: "🧁",
    difficulty: 6,
    gemCost: 1500
  },
  {
    id: "mega_mix",
    name: "Mega Mix Maze",
    emoji: "🌴🍭🍫🍦💎",
    difficulty: 7,
    gemCost: 3000,
    requirement: "complete_all_other_secret_maps"
  }
];

The Mega Mix Maze should combine all map themes:

* jungle
* candy
* chocolate
* ice cream
* gems
* beach
* animals
* forest
* rainbow

8. Characters

There should be 12 characters.

The first character is free.

const characters = [
  {
    id: "penguin",
    name: "Penguin",
    emoji: "🐧",
    rarity: "starter",
    gemCost: 0
  },
  {
    id: "bird",
    name: "Bird",
    emoji: "🐦",
    rarity: "common",
    gemCost: 100
  },
  {
    id: "bunny",
    name: "Bunny",
    emoji: "🐰",
    rarity: "common",
    gemCost: 150
  },
  {
    id: "cat",
    name: "Cat",
    emoji: "🐱",
    rarity: "common",
    gemCost: 200
  },
  {
    id: "dog",
    name: "Dog",
    emoji: "🐶",
    rarity: "common",
    gemCost: 200
  },
  {
    id: "monkey",
    name: "Monkey",
    emoji: "🐵",
    rarity: "rare",
    gemCost: 300
  },
  {
    id: "panda",
    name: "Panda",
    emoji: "🐼",
    rarity: "rare",
    gemCost: 400
  },
  {
    id: "fox",
    name: "Fox",
    emoji: "🦊",
    rarity: "rare",
    gemCost: 450
  },
  {
    id: "bear",
    name: "Bear",
    emoji: "🐻",
    rarity: "rare",
    gemCost: 500
  },
  {
    id: "unicorn",
    name: "Unicorn",
    emoji: "🦄",
    rarity: "epic",
    gemCost: 750
  },
  {
    id: "robot",
    name: "Robot",
    emoji: "🤖",
    rarity: "epic",
    gemCost: 900
  },
  {
    id: "explorer",
    name: "Explorer",
    emoji: "🧑‍🚀",
    rarity: "legendary",
    gemCost: 1200
  }
];

9. Gem Economy

Gems are the main reward currency.

Players collect gems during maze gameplay.

Gem Rewards

const gemRewards = {
  gemPickup: 1,
  finishMaze: 20,
  firstTimeCompletionBonus: 50,
  collectAllGemsBonus: 30,
  noMistakeBonus: 10
};

Maze Gem Counts

Each maze should contain gems.

const mazeGemCounts = {
  difficulty1: 30,
  difficulty2: 40,
  difficulty3: 50,
  difficulty4: 60,
  difficulty5: 75,
  difficulty6: 90,
  difficulty7: 120
};

10. Progression Rules

Use these rules:

1. Player starts with:
    * 0 gems
    * Penguin unlocked
    * Jungle Maze unlocked
2. Completing a main map unlocks the next main map.
3. A map is marked complete when the player reaches the exit.
4. Collected gems are added to total gems at the end of the maze.
5. Characters can be unlocked with gems.
6. Accessories can be unlocked with gems.
7. Secret maps are hidden until all 12 main maps are complete.
8. Secret maps require large gem amounts.
9. Mega Mix Maze is locked until the first 4 secret maps are complete.
10. Premium unlocks are mocked in MVP.

11. Local Save Data

Use localStorage.

Create this save structure:

type PlayerProgress = {
  totalGems: number;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  unlockedAccessoryIds: string[];
  equippedAccessoryIds: string[];
  completedMapIds: string[];
  unlockedSecretMapIds: string[];
  completedSecretMapIds: string[];
  soundEnabled: boolean;
  musicEnabled: boolean;
};

Default state:

const defaultProgress: PlayerProgress = {
  totalGems: 0,
  selectedCharacterId: "penguin",
  unlockedCharacterIds: ["penguin"],
  unlockedAccessoryIds: [],
  equippedAccessoryIds: [],
  completedMapIds: [],
  unlockedSecretMapIds: [],
  completedSecretMapIds: [],
  soundEnabled: true,
  musicEnabled: true
};

12. Maze Gameplay Requirements

Use Phaser 3.

For MVP, generate simple grid-based mazes.

Each maze should have:

* walls
* paths
* player start position
* exit tile
* gems placed on path tiles
* themed background colour
* themed decorative tiles

Tile types:

type TileType = "wall" | "path" | "gem" | "exit" | "start";

Player rules:

* Player cannot move through walls.
* Player can move on path tiles.
* Player collects gem when stepping on gem tile.
* Player wins when stepping on exit tile.

No enemies in MVP.

No timer in MVP.

No lives in MVP.

Keep it simple and fun first.

13. Maze Difficulty

Difficulty should affect:

* maze size
* number of turns
* number of gems
* path complexity

Example:

const difficultySettings = {
  1: { rows: 9, cols: 9, gems: 30 },
  2: { rows: 11, cols: 11, gems: 40 },
  3: { rows: 13, cols: 13, gems: 50 },
  4: { rows: 15, cols: 15, gems: 60 },
  5: { rows: 17, cols: 17, gems: 75 },
  6: { rows: 19, cols: 19, gems: 90 },
  7: { rows: 21, cols: 21, gems: 120 }
};

14. Visual Style

Use a bright, soft, child-friendly style.

UI style:

* rounded cards
* large buttons
* big emojis or placeholder icons
* pastel gradients
* simple readable font
* clear locked/unlocked states
* satisfying gem animations

Do not use scary visuals.

Do not use pressure-based purchase language.

Avoid wording like:

* “Buy now before it disappears”
* “You are missing out”
* “Only premium players can win”

Use fair wording like:

* “Collect gems to unlock”
* “Unlock faster with grown-up help”
* “Keep playing to earn more gems”

15. Premium Unlock Mock

For MVP, do not integrate Stripe, Apple Pay, Google Pay, or real in-app purchases.

Create mock premium options:

const premiumOptions = [
  {
    id: "small_gem_pack",
    name: "Small Gem Pack",
    description: "Get 500 gems",
    mockPrice: "$2"
  },
  {
    id: "character_unlock",
    name: "Unlock One Character",
    description: "Choose one locked character",
    mockPrice: "$2"
  },
  {
    id: "secret_map_unlock",
    name: "Unlock One Secret Map",
    description: "Choose one available secret map",
    mockPrice: "$2"
  }
];

Before mock purchase, show Parent Gate.

After mock purchase, update localStorage.

16. Acceptance Criteria

The MVP is complete when:

1. Player can open the home screen.
2. Player can select Play.
3. Player can see 12 maps.
4. Only the first map is unlocked at the start.
5. Player can enter the first maze.
6. Player can move around the maze.
7. Player cannot walk through walls.
8. Player can collect gems.
9. Player can reach the exit.
10. Win screen shows collected gems.
11. Completed map unlocks the next map.
12. Gems are saved in localStorage.
13. Character shop shows 12 characters.
14. Player can unlock a character using gems.
15. Player can select an unlocked character.
16. Accessories screen exists.
17. Secret maps screen stays hidden/locked until all 12 main maps are complete.
18. Parent Gate appears before mock premium unlock.
19. Settings screen allows reset progress.
20. Game works on desktop and mobile screen sizes.

17. Suggested Claude Code Prompt

Paste this into Claude Code:

Build a mobile-friendly web game called Maze Mates Adventure using Vite, React, TypeScript, Tailwind CSS, and Phaser 3.
The game is a colourful child-friendly maze adventure. The player completes 12 themed mazes, collects gems, unlocks characters, unlocks accessories, and eventually unlocks 5 secret maps.
Use localStorage for all saved progress. Do not use a backend. Do not implement real payments. Premium purchases must be mocked behind a Parent Gate screen.
Implement the following screens:
- HomeScreen
- MapSelectScreen
- GameScreen
- WinScreen
- CharacterShopScreen
- AccessoriesScreen
- SecretMapsScreen
- SettingsScreen
- ParentGateScreen
Use Phaser 3 for the maze gameplay. The maze should be grid-based. The player can move with keyboard on desktop and on-screen directional controls on mobile. The player cannot move through walls. The player collects gems by walking over gem tiles. The player wins by reaching the exit tile.
Create data files:
- maps.ts
- characters.ts
- accessories.ts
Create progress state in:
- progressStore.ts
Use this save structure:
{
  totalGems: number;
  selectedCharacterId: string;
  unlockedCharacterIds: string[];
  unlockedAccessoryIds: string[];
  equippedAccessoryIds: string[];
  completedMapIds: string[];
  unlockedSecretMapIds: string[];
  completedSecretMapIds: string[];
  soundEnabled: boolean;
  musicEnabled: boolean;
}
Starting progress:
- 0 gems
- Penguin unlocked
- Jungle Maze unlocked
- no accessories
- no completed maps
Main maps:
1. Jungle Maze
2. Ice Cream Maze
3. Chocolate Maze
4. Candy Maze
5. Marshmallow Maze
6. Donut Maze
7. Gem Cave Maze
8. Animal Maze
9. Forest Maze
10. Beach Maze
11. Snow Maze
12. Rainbow Maze
Completing one main map unlocks the next main map.
Secret maps:
1. Food Aisle Maze - 750 gems
2. Junk Food Maze - 1000 gems
3. Restaurant Maze - 1250 gems
4. Dessert Palace Maze - 1500 gems
5. Mega Mix Maze - 3000 gems
Secret maps are hidden until all 12 main maps are completed. Mega Mix Maze is locked until the other 4 secret maps are completed.
Characters:
1. Penguin - free
2. Bird - 100 gems
3. Bunny - 150 gems
4. Cat - 200 gems
5. Dog - 200 gems
6. Monkey - 300 gems
7. Panda - 400 gems
8. Fox - 450 gems
9. Bear - 500 gems
10. Unicorn - 750 gems
11. Robot - 900 gems
12. Explorer - 1200 gems
Gem reward rules:
- each gem pickup = 1 gem
- finish maze = 20 gems
- first-time completion bonus = 50 gems
- collect all gems bonus = 30 gems
Visual style:
- bright
- colourful
- soft rounded cards
- child-friendly
- playful
- emoji placeholders are acceptable for MVP
- large buttons
- responsive mobile layout
Important:
- Do not create real in-app purchases.
- Use a mock premium unlock flow.
- Before mock premium unlock, show ParentGateScreen.
- ParentGateScreen should ask the user to type PARENT before continuing.
- After parent gate, show a demo purchase confirmation saying no real money will be charged.
Acceptance criteria:
- The game must run locally.
- All screens must be reachable.
- Player progress must persist after page refresh.
- Player can complete mazes and unlock new maps.
- Player can collect gems and spend gems.
- Player can unlock and select characters.
- Secret maps unlock only after all 12 main maps are complete.
- Settings screen must include reset progress.

18. Best First Build Order

Ask Claude Code to build in this order:

1. App shell and navigation
2. Game data files
3. localStorage progress store
4. Home screen
5. Map select screen
6. Phaser maze scene
7. Gem collection and win logic
8. Character shop
9. Secret maps
10. Accessories
11. Parent gate
12. Polish and mobile responsiveness

This is now ready for a first Claude Code build.