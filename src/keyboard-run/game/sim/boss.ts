import type { BossDef, MazeDef } from "../../types/stage";
import { cellAt, cellCenter, findCell, insideMaze, isOpen, shortestPath, type Cell } from "../mazeGrid.ts";

// The Stage 15 BOSS key. It sleeps at home until you step into its maze,
// waits out your head start, then follows the shortest path to you along the
// maze paths. It has no collider: the simulation checks the catch distance.
// Pure, so tests can drive it without physics.

export type BossPhase = "asleep" | "waking" | "chasing";
export type BossEvent = "awake" | "caught" | null;

/** Falling this far below the maze floor puts you out of reach. */
const REACH_BELOW = 1;

export class BossChaser {
  readonly def: BossDef;
  readonly maze: MazeDef;
  readonly home: Cell;
  phase: BossPhase = "asleep";
  /** x, z on the maze floor; `prev` is for render interpolation. */
  readonly position: [number, number];
  readonly prevPosition: [number, number];
  /** Direction of travel, for the renderer. */
  yaw = 0;
  private cell: Cell;
  private target: Cell;
  private wakeTimer = 0;
  /** The last open cell the player was seen in (walls can't be targets). */
  private playerCell: Cell;

  constructor(def: BossDef, maze: MazeDef) {
    const home = findCell(maze, "B");
    if (!home) throw new Error(`${maze.id}: a boss maze needs a B cell`);
    this.def = def;
    this.maze = maze;
    this.home = home;
    this.cell = home;
    this.target = home;
    this.playerCell = home;
    this.position = cellCenter(maze, home);
    this.prevPosition = [...this.position];
    this.yaw = Math.PI; // faces the entry
  }

  get floorY(): number {
    return this.maze.origin[1];
  }

  /** Advances one step. `feet` is the player's feet position. */
  step(dt: number, feet: readonly [number, number, number]): BossEvent {
    this.prevPosition[0] = this.position[0];
    this.prevPosition[1] = this.position[1];
    const [px, py, pz] = feet;

    if (this.phase === "asleep") {
      if (!insideMaze(this.maze, px, pz) || py < this.floorY - REACH_BELOW) return null;
      this.phase = "waking";
      this.wakeTimer = this.def.headStartSec;
      return "awake";
    }
    if (this.phase === "waking") {
      this.wakeTimer -= dt;
      if (this.wakeTimer > 0) return null;
      this.phase = "chasing";
    }

    const seen = cellAt(this.maze, px, pz);
    if (isOpen(this.maze, seen)) this.playerCell = seen;
    this.move(dt);

    const reachable = py >= this.floorY - REACH_BELOW;
    const close = Math.hypot(px - this.position[0], pz - this.position[1]) < this.def.catchRadius;
    return reachable && close ? "caught" : null;
  }

  /** Walks toward the next cell on the way to the player, turning at cell centres. */
  private move(dt: number): void {
    let budget = this.def.speed * dt;
    while (budget > 0) {
      const [tx, tz] = cellCenter(this.maze, this.target);
      const dx = tx - this.position[0];
      const dz = tz - this.position[1];
      const dist = Math.hypot(dx, dz);
      if (dist > 1e-6) this.yaw = Math.atan2(dx, dz);
      if (dist > budget) {
        this.position[0] += (dx / dist) * budget;
        this.position[1] += (dz / dist) * budget;
        return;
      }
      this.position[0] = tx;
      this.position[1] = tz;
      budget -= dist;
      this.cell = this.target;
      const path = shortestPath(this.maze, this.cell, this.playerCell);
      if (!path || path.length < 2) return;
      this.target = path[1];
    }
  }

  /** Back home and asleep: after a respawn or restart. */
  reset(): void {
    this.phase = "asleep";
    this.wakeTimer = 0;
    this.cell = this.home;
    this.target = this.home;
    this.playerCell = this.home;
    const [x, z] = cellCenter(this.maze, this.home);
    this.position[0] = this.prevPosition[0] = x;
    this.position[1] = this.prevPosition[1] = z;
    this.yaw = Math.PI;
  }
}
