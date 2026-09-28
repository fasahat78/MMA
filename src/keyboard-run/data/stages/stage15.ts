import type { StageMeta } from "./courseBuilder.ts";
import { course } from "./courseBuilder.ts";

// Stage 15 — the World 1 finale: a maze of giant keys with the BOSS key
// asleep in the front-left corner. Step into the maze and it wakes; after a
// short head start it follows you along the paths. It's slower than you, so
// keep moving — dead ends are where it catches up. Caught = back to the
// maze checkpoint, with the boss sent home to sleep again.
//
// Grid: row 0 faces the start. `#` = wall key, `.` = floor, `B` = boss home.
// Generated once (seeded backtracker + 9 extra openings for escape loops),
// then kept here as text so it can be edited by hand.

const MAZE = [
  "#######.#######",
  "#B..#...#.....#",
  "#.#.#.###.###.#",
  "#...#.......#.#",
  "#.#.###.###.#.#",
  "#.#.....#...#.#",
  "#.###.#.#.###.#",
  "#...#.......#.#",
  "#.#.#.#.#.###.#",
  "#.#.#.#...#...#",
  "#.#.#####.#.#.#",
  "#.#.....#...#.#",
  "#.#.#.#.#####.#",
  "#.............#",
  "#######.#######",
] as const;

export function buildStage15(meta: StageMeta) {
  const b = course()
    .platform(14)
    .keys({ rows: 3, columns: 3, labels: ["CAPS LOCK", "SO MANY KEYS", "TAB", "SHIFT", "ALMOST THERE", "CTRL", "ALT", "THIS WAY?", "DELETE"] })
    .platform(6)
    .checkpoint()
    .maze({
      grid: MAZE,
      labels: ["CAPS LOCK", "?", "BACKSPACE", "WRONG WAY", "DELETE", "404", "HOME", "SNEAKY", "END", "THIS WAY?", "CTRL", "???", "ALT", "NOT THIS KEY", "ESC", "SO MANY KEYS", "TAB", "SHIFT"],
      boss: { speed: 4.5, headStartSec: 3 },
    });
  return b.platform(5, { width: b.mazeWidth() }).finish().build(meta);
}
