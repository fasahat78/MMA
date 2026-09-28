# Block Dash — V0.1 movement sandbox

A 3D keyboard obstacle course, built to answer one question: **does moving around feel fun?**
Open it from the **Block Dash** card on the vqvb.com home page, or go to `#/play/block-dash`.
The V0 address, `#/play/keyboard-run`, still works. The code folder keeps its working name, `keyboard-run/`.

## Play-test log

**V0 (2026-09-27).** Zoya's feedback:
- rated it 3/5 and retried on her own;
- running felt too slow, jumping too floaty, and the course too easy;
- "why so few keys?";
- never used sprint or the mouse;
- fell most on the falling keys, which were also her least favourite part.

**V0.1 changes:**
- **Faster movement:** base speed 6 → 8.
- **Snappier jump:** gravity 20 → 30, plus 1.6× gravity on the way down; jump force 8 → 10.5.
- **Course rebuilt around keys:** bigger keycaps, a zig-zag DASH hop, a SPACE-bar bridge, a jump-up climb and an ENTER finish.
- **Sprint hint:** shown until she first sprints.
- **Fairer falling keys:** a 0.75 s warning with a red glow, and a checkpoint just before them.
- **Renamed** to Block Dash.

## World 1

`#/play/block-dash` opens the **World 1 map**, and each stage lives at `#/play/block-dash/stage/w1-s<n>`.

- **Stages** (`data/stages/world1.ts`) are written with `courseBuilder.ts`, which lays sections end to end.
  - Stages 1–2 are beginner stages: holding forward and jumping lands every stepping stone.
  - Stage 3 is the V0.1 course.
  - Stages 4–5 expect some control in mid-air.
  - Stages 6–14 reuse the same parts, faster, narrower and longer, ending with the Stage 14 gauntlet.
  - Stage 15 (`data/stages/stage15.ts`) is the finale: a maze of tall wall keys with the **BOSS key**.
    - It sleeps in the maze's front-left corner until you step in, gives you a 3 s head start, then follows the shortest path to you (`game/sim/boss.ts`).
    - It's slower than walking (4.5 vs 8 m/s). On the best route it's still ~13 m behind at the exit, so the danger is dead ends.
    - Being caught sends you back to the maze checkpoint and the boss goes home to sleep.
    - The maze is plain text in `stage15.ts` (`#` wall, `.` floor, `B` boss home), so it can be edited by hand. `courseBuilder.maze()` refuses mazes that can't be solved.
- **Wins** (`data/economy.ts`): Stage *n* pays 2^(n−1), so 1, 2, 4 … 16,384 for Stage 15. They're paid on every finish, Roblox-style.
- **Runners** (`data/runners.ts`): block-style versions of the 12 Maze Mates animals, plus the original runner (Blocky).
  - Blocky and Penguin are free; the rest cost Wins (`runnerPrices` in `data/economy.ts`). Buy and choose them in the **Shop** on the map.
  - A look is colours plus a few boxes on the head (ears, snout, horn…), so a new animal is data only.
- **Teleports** (Zoya's V1 idea): bought in the Shop, each costing 3× the last (5, 15, 45 …; `teleportPricing` in `data/economy.ts`).
  - In a run, **T** or the ⚡ button jumps to the next checkpoint. It never skips past the last checkpoint, so the final stretch is always run for real.
  - A run that used a teleport still pays Wins and opens the next stage, but can't set a best time.
  - `wins` in the save is every Win ever earned; what's left to spend is worked out from the runners owned. So merging two open tabs never loses Wins or runners. Buying in both tabs at the same instant could, at worst, leave the wallet at 0.
- **Progress** (`state/`): Wins, the unlocked stage and best times are saved on the device in `localStorage` (`block-dash-progress`, versioned).
  - Finishing a stage opens the next one.
  - A locked stage's link falls back to the map.
- **Tests:** `npm run test:block-dash-maze` checks Stage 15 (solvable, boss wakes, the best route escapes, standing still gets caught). `npm run test:block-dash-runners` checks buying, choosing and old saves. `npm run test:block-dash-stages` checks every stage can be cleared. It checks gaps and step heights, jumps every stone and climb with a beginner and a skilled test player, and respawns on every checkpoint. `npm run test:block-dash-world` runs the map, unlock and Wins flow in a browser.

## Phones and tablets

Touch controls copy Roblox mobile, because that's what Zoya knows:
- **Left half of the screen:** touch anywhere and a stick appears under the thumb. Push further to run faster; a full push is top (sprint) speed, and there's no separate sprint control.
- **Right half:** drag to turn the camera. The stick moves the player in the direction the camera faces.
- **⬆ button** (bottom right): jump; hold it for a higher jump.
- **↺ and ⏸:** in the top bar, away from the thumbs.

Graphics drop to a lighter level on these devices (1024 shadow map, pixel ratio capped at 1.5).
`npm run test:block-dash-touch` emulates an iPad and an iPhone in WebKit and Chromium.

## Tuning

Almost every number that affects game feel lives in data, not in code:

| What | Where |
|---|---|
| Speed, sprint, jump, gravity, air control, respawn delay, coyote time | `data/movement.ts` → `playerMovement` |
| Camera distance, angle, mouse sensitivity | `data/movement.ts` → `cameraConfig` |
| The course: every obstacle, size, speed, gap | `data/stages/sandbox.ts` |
| Text allowed on keys (new words from 2026-09-28 await Zoya's OK) | `data/keyboardMessages.ts` |
| Stage 15 maze, boss speed and head start | `data/stages/stage15.ts` |
| Runner looks and prices | `data/runners.ts`, `data/economy.ts` |
| Colours | `game/render/palette.ts` |

Change a value, run `npm run dev`, and play.

## How it fits together

```
KeyboardRunScreen.tsx   React: HUD, pause/finish panels, loads the engine on demand
game/engine.ts          the loop: input → simulation (fixed 60 Hz) → rendering
game/sim/               physics + rules (Rapier), no rendering — runs in Node for tests
game/render/            three.js meshes, block character, follow camera
game/stageLayout.ts     expands stage data into parts that physics and rendering share
game/bridge.ts          the only channel from the game to React
```

- Three.js and Rapier are loaded only when this route opens, so the rest of the site stays light.
- The simulation never touches rendering, so the physics checks run without a browser.
- The player is a capsule moved by Rapier's kinematic character controller.
  - On moving platforms and lifts, the game carries the player itself.
  - Rapier's built-in carry only worked on some steps.

## Tests

```bash
npm run test:keyboard-run-sim                          # physics + rules, no browser
npm run build && npm run preview -- --port 4317 &
npm run test:keyboard-run                              # the brief's §37 checklist in headless Chromium
```

## Assumptions made for V0 (brief §3.1 — to confirm with Zoya)

1. **Treadmill = moving belt.** It pushes the player back toward the start. The "training treadmill" idea from §7 is not built yet.
2. **Timer starts on the first move or jump**, not on page load. It keeps running during the respawn delay.
3. **R respawns instantly.** Falling uses `respawnDelayMs` (800 ms).
4. **Holding Space jumps higher than tapping it.** Jump forgiveness is included:
   - a 0.1 s grace period after running off an edge;
   - a 0.12 s buffer for a jump pressed just before landing.
5. **Best time lasts only for the session.** Nothing is saved yet, as §27 says.
6. **The camera stays behind the player until the game is clicked.** Clicking captures the mouse for looking around, and Esc releases it and pauses.
7. **Phones and tablets see a "keyboard needed" message.**
8. **World look is a placeholder.** It uses pastel candy-leaning colours and floating keycaps. World themes are Zoya's call.
