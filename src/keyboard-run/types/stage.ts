import type { KeyLabel } from "../data/keyboardMessages";

// Stage schema. Stages are data (brief §26): a list of obstacle definitions
// that `game/stageLayout.ts` expands into physics + render parts. Coordinates
// are metres, Y up; the course runs along +Z.

export type Vec3 = readonly [number, number, number];

interface BoxObstacle {
  id: string;
  /** Centre of the box. */
  position: Vec3;
  /** Full extents (width, height, depth). */
  size: Vec3;
}

/** A plain solid surface: roads, landings, decks. */
export interface PlatformDef extends BoxObstacle {
  type: "platform";
  style: "road" | "landing" | "deck";
}

/** A narrow walkway across a drop. */
export interface BridgeDef extends BoxObstacle {
  type: "bridge";
}

/**
 * A grid of giant keycaps; each row steps up by `stepUp`. With one column,
 * a wide `gap` and `rowOffsets` it becomes zig-zag stepping stones; with one
 * key and a long `keyDepth` it is a SPACE-bar bridge.
 */
export interface KeyboardRunDef {
  type: "keyboard-run";
  id: string;
  /** x = centre of the grid, y = surface height the first row steps up from, z = front edge. */
  origin: Vec3;
  columns: number;
  rows: number;
  /** Key width (x). Also its depth unless `keyDepth` is set. */
  keySize: number;
  /** Key depth along the course (z). Defaults to `keySize`. */
  keyDepth?: number;
  keyHeight: number;
  gap: number;
  stepUp: number;
  /** Sideways shift per row (x), for zig-zags. Missing rows are 0. */
  rowOffsets?: readonly number[];
  /** Row-major, front row first. Content-controlled (brief §15). */
  labels: readonly KeyLabel[];
}

/** Ping-pongs along one axis, pausing at each end. */
export interface MovingPlatformDef extends BoxObstacle {
  type: "moving-platform";
  axis: "x" | "z";
  distance: number;
  speed: number;
  pauseSec: number;
}

/** A moving platform that travels straight up and back down. */
export interface LiftDef extends BoxObstacle {
  type: "lift";
  height: number;
  speed: number;
  pauseSec: number;
}

/** A belt that carries whoever stands on it at `beltVelocity`. */
export interface TreadmillDef extends BoxObstacle {
  type: "treadmill";
  beltVelocity: Vec3;
}

/** A flat pad; standing on it multiplies top speed for a while. */
export interface SpeedPadDef extends BoxObstacle {
  type: "speed-pad";
  boost: number;
  durationSec: number;
}

/** A row of keycaps that drop shortly after being stood on, then reset. */
export interface FallingKeysDef {
  type: "falling-keys";
  id: string;
  /** x = centre, y = top surface, z = front edge. */
  origin: Vec3;
  count: number;
  keyWidth: number;
  keyDepth: number;
  keyHeight: number;
  gap: number;
  fallDelaySec: number;
  resetDelaySec: number;
  labels: readonly KeyLabel[];
}

/**
 * A maze of tall keycaps on a floor. `grid` rows run front (entry side)
 * first; column 0 is on the player's left (+X), like keyboard-run keys.
 * `#` is a wall key; any other character is open floor (`B` = boss home).
 */
export interface MazeDef {
  type: "maze";
  id: string;
  /** x = centre, y = floor top, z = front edge. */
  origin: Vec3;
  cellSize: number;
  wallHeight: number;
  grid: readonly string[];
  labels: readonly KeyLabel[];
}

/** A giant key that wakes when you enter its maze and chases you through it. */
export interface BossDef {
  type: "boss";
  id: string;
  mazeId: string;
  /** Metres per second along the maze paths. */
  speed: number;
  /** Seconds after you step into the maze before it moves. */
  headStartSec: number;
  /** Closer than this (centre to centre, metres) and you're caught. */
  catchRadius: number;
  /** Edge length of the boss keycap. */
  size: number;
}

/** Trigger zones. `position` is the zone centre; its floor is the respawn height. */
export interface CheckpointDef extends BoxObstacle {
  type: "checkpoint";
}

export interface FinishDef extends BoxObstacle {
  type: "finish";
}

export type ObstacleDef =
  | PlatformDef
  | BridgeDef
  | KeyboardRunDef
  | MovingPlatformDef
  | LiftDef
  | TreadmillDef
  | SpeedPadDef
  | FallingKeysDef
  | CheckpointDef
  | FinishDef
  | MazeDef
  | BossDef;

export type ObstacleType = ObstacleDef["type"];

// Mirrors the brief's StageDefinition (§10); progression fields are unused in V0.
export interface StageDefinition {
  id: string;
  worldId: string;
  stageNumber: number;
  recommendedLevel: number;
  winReward: number;
  stageType: "standard" | "maze-boss";
  /** Feet position at the start of a run. */
  spawn: Vec3;
  /** Falling below this height respawns the player. */
  killPlaneY: number;
  obstacles: readonly ObstacleDef[];
}
