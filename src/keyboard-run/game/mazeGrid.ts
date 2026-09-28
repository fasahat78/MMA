import type { MazeDef } from "../types/stage";

// Maze grid maths shared by the layout, the boss and the tests. Pure — no
// physics or rendering. A cell is [row, col]; row 0 is the entry side.

export type Cell = readonly [number, number];

const STEPS: readonly Cell[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export const mazeRows = (m: MazeDef) => m.grid.length;
export const mazeCols = (m: MazeDef) => m.grid[0].length;

export function isOpen(m: MazeDef, [r, c]: Cell): boolean {
  return r >= 0 && c >= 0 && r < mazeRows(m) && c < mazeCols(m) && m.grid[r][c] !== "#";
}

/** World x/z of a cell's centre. */
export function cellCenter(m: MazeDef, [r, c]: Cell): [number, number] {
  const [ox, , oz] = m.origin;
  return [ox + ((mazeCols(m) - 1) / 2 - c) * m.cellSize, oz + (r + 0.5) * m.cellSize];
}

/** The cell under a world x/z, clamped to the grid's edge. */
export function cellAt(m: MazeDef, x: number, z: number): Cell {
  const [ox, , oz] = m.origin;
  const clamp = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(v)));
  const col = clamp((mazeCols(m) - 1) / 2 - (x - ox) / m.cellSize + 0.5, mazeCols(m));
  const row = clamp((z - oz) / m.cellSize, mazeRows(m));
  return [row, col];
}

/** Is a world x/z over the maze floor? */
export function insideMaze(m: MazeDef, x: number, z: number): boolean {
  const [ox, , oz] = m.origin;
  const halfWidth = (mazeCols(m) * m.cellSize) / 2;
  return Math.abs(x - ox) < halfWidth && z > oz && z < oz + mazeRows(m) * m.cellSize;
}

export function findCell(m: MazeDef, mark: string): Cell | null {
  for (let r = 0; r < mazeRows(m); r++) {
    const c = m.grid[r].indexOf(mark);
    if (c >= 0) return [r, c];
  }
  return null;
}

/** The open cells in a row (the entry is in row 0, the exit in the last row). */
export function openingsInRow(m: MazeDef, row: number): Cell[] {
  return [...m.grid[row]].flatMap((ch, c) => (ch === "#" ? [] : [[row, c] as const]));
}

/** Shortest path from `from` to `to`, both included; null if walled off. */
export function shortestPath(m: MazeDef, from: Cell, to: Cell): Cell[] | null {
  const key = ([r, c]: Cell) => r * mazeCols(m) + c;
  const cameFrom = new Map<number, Cell | null>([[key(from), null]]);
  const queue: Cell[] = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    if (cell[0] === to[0] && cell[1] === to[1]) {
      const path: Cell[] = [];
      for (let at: Cell | null = cell; at; at = cameFrom.get(key(at)) ?? null) path.unshift(at);
      return path;
    }
    for (const [dr, dc] of STEPS) {
      const next: Cell = [cell[0] + dr, cell[1] + dc];
      if (isOpen(m, next) && !cameFrom.has(key(next))) {
        cameFrom.set(key(next), cell);
        queue.push(next);
      }
    }
  }
  return null;
}
