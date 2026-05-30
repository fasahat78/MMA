# Maze Mates Adventure

A colourful, child-friendly maze game MVP. Move through 12 themed mazes, collect
gems, unlock characters and accessories, and discover 5 secret maps. Built per
[SPEC-v2.md](./SPEC-v2.md).

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- Phaser 3 for maze gameplay (lazy-loaded — only fetched when a maze opens)
- localStorage for saved progress (no backend, no real payments)

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

## Build & preview

```bash
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

## Tests

```bash
npm run test:logic   # maze solvability + gem economy (Node, runs TS directly)
npm run test:smoke   # headless Playwright: boot, navigation, maze load,
                     # parent gate, localStorage persistence
npm run test:win     # headless Playwright: solves the first maze end-to-end and
                     # verifies Win screen, gems earned, save, next-map unlock
```

The Playwright tests expect a server on `http://localhost:4317` (run
`npm run preview -- --port 4317` first), or set `BASE_URL`.

`test:win` drives movement through a guarded `window.__MMA_E2E__` seam in
`MazeScene` that exposes the BFS solution path. The seam is inert in normal play
(it only activates when that flag is set before load).

## Architecture notes

- **React owns navigation + all progress** (`src/store/progressStore.ts`); Phaser
  owns only the maze and reports events through a typed `GameBridge`
  (`src/game/gameBridge.ts`). They never share mutable state directly.
- **Saves are versioned** (`src/store/migrations.ts`) with a migration shim, so
  adding fields later won't corrupt existing players.
- **Mazes are generated** with a recursive backtracker
  (`src/game/mazeGenerator.ts`) that guarantees a path from start to exit; gems
  are placed only on reachable path tiles.
- **Accessories** equip one item per category (no double hats).
- **Premium purchases are mocked** behind a Parent Gate (type `PARENT`); no real
  payment integration. See the spec's COPPA note before shipping real
  monetisation to children.

## Folder structure

```
src/
  components/ui/   shared Button, GemCounter, ScreenShell
  data/            maps, characters, accessories, gem economy
  game/            Phaser scene, generator, config, React<->Phaser bridge
  hooks/           useReducedMotion
  screens/         one component per screen
  store/           progress store + save migrations
  types/           domain + navigation types
```
