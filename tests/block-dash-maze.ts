// Stage 15 maze + BOSS key checks (no browser). Run with: node tests/block-dash-maze.ts
// The maze can be solved, its walls can't be jumped, the boss sleeps until
// you enter, a player who walks the shortest route escapes it, and standing
// still gets you caught and sent back to the maze checkpoint.
import RAPIER from "@dimforge/rapier3d-compat";
import { Simulation, type SimEvent } from "../src/keyboard-run/game/sim/Simulation.ts";
import { NO_INPUT, type SimInput } from "../src/keyboard-run/game/sim/playerMotion.ts";
import { world1 } from "../src/keyboard-run/data/stages/world1.ts";
import { playerMovement, SIM_STEP_SEC } from "../src/keyboard-run/data/movement.ts";
import { cellCenter, findCell, openingsInRow, shortestPath } from "../src/keyboard-run/game/mazeGrid.ts";
import type { MazeDef, StageDefinition } from "../src/keyboard-run/types/stage.ts";

await RAPIER.init();

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const stage = world1.stages.find((s) => s.stageType === "maze-boss") as StageDefinition;
check("World 1 ends with a maze-boss stage (Stage 15)", stage?.stageNumber === 15 && world1.stages.at(-1) === stage);
const maze = stage.obstacles.find((o) => o.type === "maze") as MazeDef;
const entry = openingsInRow(maze, 0)[0];
const exit = openingsInRow(maze, maze.grid.length - 1)[0];
const home = findCell(maze, "B")!;
const route = shortestPath(maze, entry, exit);

check("Maze: the exit can be reached from the entry", route !== null);
check("Maze: the boss can reach the entry", shortestPath(maze, home, entry) !== null);
const jumpHeight = playerMovement.jumpForce ** 2 / (2 * playerMovement.gravity);
check(`Maze: walls (${maze.wallHeight} m) are too tall to jump (${jumpHeight.toFixed(2)} m)`, maze.wallHeight > jumpHeight + 0.5);

function collect(sim: Simulation, seconds: number, input: SimInput | (() => SimInput)): SimEvent[] {
  const out: SimEvent[] = [];
  for (let i = 0; i < Math.round(seconds / SIM_STEP_SEC); i++) {
    sim.step(typeof input === "function" ? input() : input);
    out.push(...sim.drainEvents());
  }
  return out;
}

const cp = stage.obstacles.find((o) => o.type === "checkpoint")!;
const cpFeet = [cp.position[0], cp.position[1] - cp.size[1] / 2, cp.position[2]] as const;
const finish = stage.obstacles.find((o) => o.type === "finish")!;

/** Walks through the points one after another, never sprinting. Returns events, or null if it got stuck. */
function walk(sim: Simulation, points: readonly (readonly [number, number])[]): SimEvent[] | null {
  const events: SimEvent[] = [];
  for (const [x, z] of points) {
    let steps = 0;
    while (Math.hypot(x - sim.position[0], z - sim.position[2]) > 0.6) {
      const yaw = Math.atan2(x - sim.position[0], z - sim.position[2]);
      sim.step({ ...NO_INPUT, moveZ: 1, yaw });
      events.push(...sim.drainEvents());
      if (events.some((e) => e.type === "caught") || ++steps > 600) return events;
    }
  }
  events.push(...collect(sim, 0.5, NO_INPUT));
  return events;
}

// 1. The boss sleeps while you're outside the maze.
{
  const sim = new Simulation(RAPIER, stage);
  sim.placeAt(cpFeet);
  const events = collect(sim, 6, { ...NO_INPUT, moveX: 1 });
  check("Boss stays asleep while you're outside the maze", sim.boss?.phase === "asleep" && !events.some((e) => e.type === "boss-awake"));
  sim.dispose();
}

// 2. Walking the shortest route (no sprint) gets you out before it catches you.
{
  const sim = new Simulation(RAPIER, stage);
  sim.placeAt(cpFeet);
  collect(sim, 0.3, NO_INPUT);
  const [ex, ez] = cellCenter(maze, exit);
  const points = [...route!.map((c) => cellCenter(maze, c)), [ex, ez + maze.cellSize] as const, [finish.position[0], finish.position[2]] as const];
  const events = walk(sim, points) ?? [];
  check("Boss wakes when you step into the maze", events.some((e) => e.type === "boss-awake"));
  check("Walking the shortest route escapes the boss and finishes", sim.finished && !events.some((e) => e.type === "caught"), `finished ${sim.finished}, at ${sim.position.map((v) => v.toFixed(1)).join(",")}`);
  check("Boss stops once you finish", (() => {
    const before = [...sim.boss!.position];
    collect(sim, 1, NO_INPUT);
    return before[0] === sim.boss!.position[0] && before[1] === sim.boss!.position[1];
  })());
  sim.dispose();
}

// 3. Standing still in the maze: caught, then back to the checkpoint with the boss home asleep.
{
  const sim = new Simulation(RAPIER, stage);
  sim.placeAt(cpFeet);
  collect(sim, 0.3, NO_INPUT);
  const [x, z] = cellCenter(maze, route![3]);
  sim.placeAt([x, maze.origin[1], z]);
  const events = collect(sim, 25, NO_INPUT);
  const caught = events.findIndex((e) => e.type === "caught");
  check("Standing still in the maze gets you caught", caught >= 0);
  const respawn = events.slice(caught).find((e) => e.type === "respawn");
  check("Being caught respawns you at the maze checkpoint", respawn?.type === "respawn" && respawn.reason === "caught" && Math.abs(sim.position[2] - cpFeet[2]) < 1.5);
  const [hx, hz] = cellCenter(maze, home);
  check("After a catch the boss is home and asleep", sim.boss!.phase === "asleep" && sim.boss!.position[0] === hx && sim.boss!.position[1] === hz);
  sim.dispose();
}

// 4. Restarting the run sends the boss home too.
{
  const sim = new Simulation(RAPIER, stage);
  const [x, z] = cellCenter(maze, route![2]);
  sim.placeAt([x, maze.origin[1], z]);
  collect(sim, 5, NO_INPUT);
  const wasAwake = sim.boss!.phase !== "asleep";
  sim.restartRun();
  check("Restart puts an awake boss back to sleep at home", wasAwake && sim.boss!.phase === "asleep");
  sim.dispose();
}

console.log(failures ? `\n${failures} check(s) failed` : "\nAll Stage 15 maze checks passed");
process.exit(failures ? 1 : 0);
