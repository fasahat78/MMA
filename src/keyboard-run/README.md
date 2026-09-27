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

## Tuning

Almost every number that affects game feel lives in data, not in code:

| What | Where |
|---|---|
| Speed, sprint, jump, gravity, air control, respawn delay, coyote time | `data/movement.ts` → `playerMovement` |
| Camera distance, angle, mouse sensitivity | `data/movement.ts` → `cameraConfig` |
| The course: every obstacle, size, speed, gap | `data/stages/sandbox.ts` |
| Text allowed on keys | `data/keyboardMessages.ts` |
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
