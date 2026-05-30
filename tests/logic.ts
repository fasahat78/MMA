// Pure-logic tests (no browser). Run with: node tests/logic.ts
import { generateMaze } from "../src/game/mazeGenerator.ts";
import { computeRunGems } from "../src/data/gems.ts";
import { difficultySettings } from "../src/data/maps.ts";

let failures = 0;
function check(name: string, ok: boolean) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

// BFS reachability over non-wall tiles.
function reachable(maze: ReturnType<typeof generateMaze>): boolean {
  const { tiles, rows, cols, start, exit } = maze;
  const seen = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [start];
  seen[start.r][start.c] = true;
  const steps = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.r === exit.r && cur.c === exit.c) return true;
    for (const [dr, dc] of steps) {
      const nr = cur.r + dr;
      const nc = cur.c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      if (tiles[nr][nc] === "wall" || seen[nr][nc]) continue;
      seen[nr][nc] = true;
      queue.push({ r: nr, c: nc });
    }
  }
  return false;
}

// Every difficulty: solvable + gem placement rules hold, across many seeds.
for (const d of [1, 2, 3, 4, 5, 6, 7]) {
  const setting = difficultySettings[d];
  let allSolvable = true;
  let gemRulesOk = true;
  let gemCountOk = true;

  for (let seed = 0; seed < 40; seed++) {
    const maze = generateMaze({ rows: setting.rows, cols: setting.cols, gems: setting.gems, seed });
    if (!reachable(maze)) allSolvable = false;

    let placed = 0;
    for (let r = 0; r < maze.rows; r++) {
      for (let c = 0; c < maze.cols; c++) {
        const t = maze.tiles[r][c];
        if (t === "gem") {
          placed++;
          // Gems must not sit on start/exit.
          if (r === maze.start.r && c === maze.start.c) gemRulesOk = false;
          if (r === maze.exit.r && c === maze.exit.c) gemRulesOk = false;
        }
      }
    }
    if (placed !== maze.gemCount) gemRulesOk = false;
    if (maze.gemCount > setting.gems) gemCountOk = false;
  }

  check(`d${d}: always solvable (40 seeds)`, allSolvable);
  check(`d${d}: gems only on valid tiles`, gemRulesOk);
  check(`d${d}: gem count within target`, gemCountOk);
}

// Graph stats over non-wall cells: nodes + undirected edges.
function graphStats(maze: ReturnType<typeof generateMaze>): { nodes: number; edges: number } {
  const { tiles, rows, cols } = maze;
  let nodes = 0;
  let edges = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === "wall") continue;
      nodes++;
      if (c + 1 < cols && tiles[r][c + 1] !== "wall") edges++;
      if (r + 1 < rows && tiles[r + 1][c] !== "wall") edges++;
    }
  }
  return { nodes, edges };
}

// Braiding adds escape-route loops; a perfect maze is a tree (edges = nodes-1).
{
  let perfectIsTree = true;
  let braidedHasLoops = true;
  let braidedSolvable = true;
  for (let seed = 0; seed < 40; seed++) {
    const perfect = generateMaze({ rows: 13, cols: 13, gems: 0, seed });
    const { nodes: pn, edges: pe } = graphStats(perfect);
    if (pe !== pn - 1) perfectIsTree = false;

    const braided = generateMaze({ rows: 13, cols: 13, gems: 0, seed, braid: true });
    const { nodes: bn, edges: be } = graphStats(braided);
    if (be < bn) braidedHasLoops = false; // edges >= nodes => at least one cycle
    if (!reachable(braided)) braidedSolvable = false;
  }
  check("perfect maze is a tree (no loops)", perfectIsTree);
  check("braided maze has loops (escape routes)", braidedHasLoops);
  check("braided maze still solvable", braidedSolvable);
}

// Power-up placement: counts respected, on path tiles, no overlap with
// gems/start/exit or each other.
{
  let placementOk = true;
  let countOk = true;
  for (let seed = 0; seed < 40; seed++) {
    const maze = generateMaze({
      rows: 13,
      cols: 13,
      gems: 50,
      seed,
      braid: true,
      shields: 2,
      stuns: 2,
    });
    const all = [...maze.shieldPositions, ...maze.stunPositions];
    const keys = new Set<string>();
    if (maze.shieldPositions.length > 2 || maze.stunPositions.length > 2) countOk = false;
    for (const { r, c } of all) {
      const t = maze.tiles[r][c];
      if (t !== "path") placementOk = false; // not on wall/gem/start/exit
      const k = `${r},${c}`;
      if (keys.has(k)) placementOk = false; // no overlap
      keys.add(k);
    }
  }
  check("power-ups placed on valid path tiles", placementOk);
  check("power-up counts within target", countOk);
}

// Gem economy math (spec v2 §9).
const firstFull = computeRunGems({ gemsCollected: 30, totalGemsInMaze: 30, isFirstCompletion: true });
check("first full clear = 20+50+30+30 pickups", firstFull.total === 20 + 50 + 30 + 30);
check("first clear has no replay bonus", firstFull.replay === 0);

const replayPartial = computeRunGems({ gemsCollected: 10, totalGemsInMaze: 30, isFirstCompletion: false });
check("replay partial = 20+5+10, no first/collectAll", replayPartial.total === 20 + 5 + 10);
check("replay has replay bonus", replayPartial.replay === 5);

console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
