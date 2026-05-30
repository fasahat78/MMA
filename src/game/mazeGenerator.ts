import type { TileType } from "../types/game";

// Spec v2 §12 — grid-based maze, always fully connected, gems only on
// reachable path tiles.

export interface Cell {
  r: number;
  c: number;
}

export interface GeneratedMaze {
  rows: number;
  cols: number;
  tiles: TileType[][];
  start: Cell;
  exit: Cell;
  gemCount: number; // number of gem tiles actually placed
  shieldPositions: Cell[]; // invulnerability power-ups (chase modes)
  stunPositions: Cell[]; // chaser-stun power-ups (chase modes)
}

// Fraction of dead-ends braided open when braiding is requested. Higher =
// more loops = more escape routes during a chase.
const BRAID_FRACTION = 0.75;

function makeRng(seed: number) {
  // Mulberry32 — deterministic, good enough for maze variety.
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Ensure odd dimensions so carve cells sit on odd indices with walls between.
function toOdd(n: number): number {
  return n % 2 === 0 ? n + 1 : n;
}

export function generateMaze(params: {
  rows: number;
  cols: number;
  gems: number;
  seed?: number;
  /** Add loops by opening dead-ends, so a chaser can be escaped. */
  braid?: boolean;
  /** Number of shield (invulnerability) power-ups to place. */
  shields?: number;
  /** Number of stun power-ups to place. */
  stuns?: number;
}): GeneratedMaze {
  const rows = toOdd(Math.max(5, params.rows));
  const cols = toOdd(Math.max(5, params.cols));
  const rng = makeRng(params.seed ?? Math.floor(Math.random() * 2 ** 31));

  // Start everything as walls.
  const tiles: TileType[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "wall" as TileType),
  );

  // Recursive backtracker carve (iterative stack) on odd cells.
  const start: Cell = { r: 1, c: 1 };
  tiles[start.r][start.c] = "path";
  const stack: Cell[] = [start];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const dirs = shuffle(
      [
        { dr: -2, dc: 0 },
        { dr: 2, dc: 0 },
        { dr: 0, dc: -2 },
        { dr: 0, dc: 2 },
      ],
      rng,
    );

    let carved = false;
    for (const { dr, dc } of dirs) {
      const nr = current.r + dr;
      const nc = current.c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && tiles[nr][nc] === "wall") {
        // Knock down the wall between current and the new cell.
        tiles[current.r + dr / 2][current.c + dc / 2] = "path";
        tiles[nr][nc] = "path";
        stack.push({ r: nr, c: nc });
        carved = true;
        break;
      }
    }
    if (!carved) stack.pop();
  }

  // Add loops so a chaser can be escaped (chase modes only). Must run before
  // exit selection so distances reflect the final connectivity.
  if (params.braid) braidMaze(tiles, rows, cols, rng);

  // Exit = farthest reachable path tile from start (BFS), so it's always solvable.
  const { exit, distance } = farthestCell(tiles, rows, cols, start);

  // Collect candidate path tiles: reachable, excluding start/exit. Used for
  // gems first, then power-ups (so nothing overlaps).
  const candidates: Cell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] !== "path") continue;
      if (distance[r][c] < 0) continue; // unreachable (shouldn't happen, but safe)
      if ((r === start.r && c === start.c) || (r === exit.r && c === exit.c)) continue;
      candidates.push({ r, c });
    }
  }

  const shuffled = shuffle(candidates, rng);
  let idx = 0;

  // Reserve power-up cells FIRST (they are few). On small mazes gems would
  // otherwise consume every path tile and leave no room for power-ups. They
  // stay on "path" tiles, tracked by position rather than tile type.
  const take = (n: number): Cell[] => {
    const out: Cell[] = [];
    for (let i = 0; i < n && idx < shuffled.length; i++, idx++) out.push(shuffled[idx]);
    return out;
  };
  const shieldPositions = take(params.shields ?? 0);
  const stunPositions = take(params.stuns ?? 0);

  // Gems fill the remaining candidates up to the target.
  const gemBudget = Math.min(params.gems, shuffled.length - idx);
  for (let placed = 0; placed < gemBudget; placed++, idx++) {
    const { r, c } = shuffled[idx];
    tiles[r][c] = "gem";
  }
  const gemTarget = gemBudget;

  tiles[start.r][start.c] = "start";
  tiles[exit.r][exit.c] = "exit";

  return { rows, cols, tiles, start, exit, gemCount: gemTarget, shieldPositions, stunPositions };
}

// Open a fraction of dead-ends into a neighbouring corridor, creating loops.
// A "dead-end" is an odd carve cell with exactly one open passage.
function braidMaze(tiles: TileType[][], rows: number, cols: number, rng: () => number) {
  const dirs = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  for (let r = 1; r < rows - 1; r += 2) {
    for (let c = 1; c < cols - 1; c += 2) {
      if (tiles[r][c] === "wall") continue;
      const open = dirs.filter(([dr, dc]) => tiles[r + dr][c + dc] !== "wall");
      if (open.length !== 1) continue; // only braid dead-ends
      if (rng() > BRAID_FRACTION) continue;

      // Closed directions that reach a valid in-bounds carve cell.
      const closed = dirs.filter(([dr, dc]) => {
        const nr = r + 2 * dr;
        const nc = c + 2 * dc;
        return (
          nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && tiles[r + dr][c + dc] === "wall"
        );
      });
      if (closed.length === 0) continue;
      const [dr, dc] = closed[Math.floor(rng() * closed.length)];
      tiles[r + dr][c + dc] = "path"; // knock the wall to form a loop
    }
  }
}

function farthestCell(
  tiles: TileType[][],
  rows: number,
  cols: number,
  start: Cell,
): { exit: Cell; distance: number[][] } {
  const distance: number[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => -1),
  );
  distance[start.r][start.c] = 0;
  const queue: Cell[] = [start];
  let exit = start;
  let maxDist = 0;

  const steps = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const { dr, dc } of steps) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (tiles[nr][nc] === "wall") continue;
      if (distance[nr][nc] !== -1) continue;
      distance[nr][nc] = distance[cur.r][cur.c] + 1;
      if (distance[nr][nc] > maxDist) {
        maxDist = distance[nr][nc];
        exit = { r: nr, c: nc };
      }
      queue.push({ r: nr, c: nc });
    }
  }

  return { exit, distance };
}
