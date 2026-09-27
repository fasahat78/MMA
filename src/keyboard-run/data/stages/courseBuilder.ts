import type { KeyLabel } from "../keyboardMessages";
import type { ObstacleDef, StageDefinition, Vec3 } from "../../types/stage";

// Lays course sections end to end along +Z so stages can be written as a
// list of sections ("platform, keys, gap, hop…") instead of hand-placed
// coordinates. It tracks where the course has reached (`z`) and the current
// surface height (`top`); every section starts there and moves them on.
// Platforms are 1 m thick; keys use their own heights.

const PLATFORM_THICKNESS = 1;
const DEFAULT_WIDTH = 6;
/** Breathing room between a moving part and its neighbours. */
const CLEARANCE = 0.2;

export interface StageMeta {
  id: string;
  worldId: string;
  stageNumber: number;
  recommendedLevel: number;
  winReward: number;
}

export class CourseBuilder {
  private readonly obstacles: ObstacleDef[] = [];
  private readonly counts = new Map<string, number>();
  private z = 0;
  private top = 0;
  private lowest = 0;
  private spawn: Vec3 | null = null;
  /** The most recent flat platform, for checkpoints and speed pads. */
  private last: { x: number; z0: number; z1: number; width: number } | null = null;

  private nextId(kind: string): string {
    const n = (this.counts.get(kind) ?? 0) + 1;
    this.counts.set(kind, n);
    return `${kind}-${n}`;
  }

  private setTop(top: number): void {
    this.top = top;
    this.lowest = Math.min(this.lowest, top);
  }

  /** Empty space to jump across. */
  gap(distance: number): this {
    this.z += distance;
    return this;
  }

  /** A flat solid surface at the current height. The first one holds the spawn point. */
  platform(depth: number, opts: { width?: number; style?: "road" | "landing" | "deck"; x?: number } = {}): this {
    const width = opts.width ?? DEFAULT_WIDTH;
    const x = opts.x ?? 0;
    const style = opts.style ?? (this.obstacles.length === 0 ? "road" : this.top > 5 ? "deck" : "landing");
    const id = style === "road" ? this.nextId("road") : this.nextId("platform");
    this.obstacles.push({
      type: "platform",
      id,
      style,
      position: [x, this.top - PLATFORM_THICKNESS / 2, this.z + depth / 2],
      size: [width, PLATFORM_THICKNESS, depth],
    });
    this.spawn ??= [x, this.top, this.z + Math.min(3, depth / 2)];
    this.last = { x, z0: this.z, z1: this.z + depth, width };
    this.z += depth;
    return this;
  }

  /** A checkpoint zone on the last platform. */
  checkpoint(): this {
    const p = this.requireLast("checkpoint");
    this.obstacles.push({
      type: "checkpoint",
      id: this.nextId("checkpoint"),
      position: [p.x, this.top + 2, (p.z0 + p.z1) / 2],
      size: [p.width, 4, 2],
    });
    return this;
  }

  /** A speed pad near the end of the last platform. */
  speedPad(opts: { boost?: number; durationSec?: number } = {}): this {
    const p = this.requireLast("speedPad");
    this.obstacles.push({
      type: "speed-pad",
      id: this.nextId("speed-pad"),
      position: [p.x, this.top + 0.25, p.z1 - 1.5],
      size: [3, 0.5, 2],
      boost: opts.boost ?? 1.5,
      durationSec: opts.durationSec ?? 1.8,
    });
    return this;
  }

  /** A grid of keycaps stepping up `stepUp` per row (0 = flat). */
  keys(opts: { rows: number; columns: number; labels: readonly KeyLabel[]; stepUp?: number; keySize?: number; gap?: number }): this {
    const keySize = opts.keySize ?? 2.6;
    const gap = opts.gap ?? 0.3;
    const stepUp = opts.stepUp ?? 0;
    this.obstacles.push({
      type: "keyboard-run",
      id: this.nextId("keys"),
      origin: [0, this.top, this.z + gap],
      columns: opts.columns,
      rows: opts.rows,
      keySize,
      keyHeight: 1,
      gap,
      stepUp,
      labels: opts.labels,
    });
    this.z += gap + opts.rows * (keySize + gap) - gap;
    this.setTop(this.top + stepUp * opts.rows);
    this.last = null;
    return this;
  }

  /**
   * Stepping stones: one key per row, `gap` apart (a jump each), shifted
   * sideways by `offsets`, each `rise` higher than the last.
   */
  hop(opts: { labels: readonly KeyLabel[]; gap: number; offsets: readonly number[]; rise?: number; keySize?: number }): this {
    const keySize = opts.keySize ?? 2.2;
    const rise = opts.rise ?? 0;
    const count = opts.labels.length;
    this.obstacles.push({
      type: "keyboard-run",
      id: this.nextId("hop"),
      origin: [0, this.top, this.z + opts.gap],
      columns: 1,
      rows: count,
      keySize,
      keyHeight: 1,
      gap: opts.gap,
      stepUp: rise,
      rowOffsets: opts.offsets,
      labels: opts.labels,
    });
    this.z += opts.gap + count * (keySize + opts.gap) - opts.gap;
    this.setTop(this.top + rise * count);
    this.last = null;
    return this;
  }

  /** One long, narrow SPACE key to walk along. */
  spacebar(length: number, width = 1.8): this {
    this.obstacles.push({
      type: "keyboard-run",
      id: this.nextId("spacebar"),
      origin: [0, this.top, this.z],
      columns: 1,
      rows: 1,
      keySize: width,
      keyDepth: length,
      keyHeight: 1,
      gap: 0,
      stepUp: 0,
      labels: ["SPACE"],
    });
    this.z += length;
    this.last = null;
    return this;
  }

  /** A platform that ferries you across a drop of `distance`. */
  mover(distance: number, opts: { speed?: number; pauseSec?: number; size?: number } = {}): this {
    const size = opts.size ?? 3;
    this.obstacles.push({
      type: "moving-platform",
      id: this.nextId("mover"),
      position: [0, this.top - 0.3, this.z + CLEARANCE + size / 2],
      size: [size, 0.6, size],
      axis: "z",
      distance,
      speed: opts.speed ?? 3,
      pauseSec: opts.pauseSec ?? 0.6,
    });
    this.z += CLEARANCE + size + distance + CLEARANCE;
    this.last = null;
    return this;
  }

  /** A belt that pushes back toward the start. */
  treadmill(length: number, beltSpeed: number, width = 4): this {
    this.obstacles.push({
      type: "treadmill",
      id: this.nextId("treadmill"),
      position: [0, this.top - PLATFORM_THICKNESS / 2, this.z + length / 2],
      size: [width, PLATFORM_THICKNESS, length],
      beltVelocity: [0, 0, -beltSpeed],
    });
    this.z += length;
    this.last = null;
    return this;
  }

  /** A lift up to a surface `height` higher. */
  lift(height: number, opts: { speed?: number; pauseSec?: number } = {}): this {
    const size = 3.2;
    this.obstacles.push({
      type: "lift",
      id: this.nextId("lift"),
      position: [0, this.top - 0.3, this.z + CLEARANCE + size / 2],
      size: [size, 0.6, size],
      height,
      speed: opts.speed ?? 2.5,
      pauseSec: opts.pauseSec ?? 1,
    });
    this.z += CLEARANCE + size + CLEARANCE;
    this.setTop(this.top + height);
    this.last = null;
    return this;
  }

  /** Keycaps that drop shortly after you land on them. */
  falling(opts: { labels: readonly KeyLabel[]; delaySec: number; gap?: number; keyWidth?: number }): this {
    const keyDepth = 2.2;
    const gap = opts.gap ?? 0.6;
    this.obstacles.push({
      type: "falling-keys",
      id: this.nextId("falling"),
      origin: [0, this.top, this.z + gap],
      count: opts.labels.length,
      keyWidth: opts.keyWidth ?? 2.6,
      keyDepth,
      keyHeight: 1,
      gap,
      fallDelaySec: opts.delaySec,
      resetDelaySec: 3,
      labels: opts.labels,
    });
    this.z += gap + opts.labels.length * (keyDepth + gap) - gap;
    this.last = null;
    return this;
  }

  /** The finish: a giant ENTER key with the FINISH arch on it. Ends the course. */
  finish(): this {
    const size = 7;
    const z0 = this.z + 0.3;
    this.obstacles.push({
      type: "keyboard-run",
      id: "enter",
      origin: [0, this.top, z0],
      columns: 1,
      rows: 1,
      keySize: size,
      keyHeight: 1.5,
      gap: 0,
      stepUp: 0,
      labels: ["ENTER"],
    });
    this.obstacles.push({ type: "finish", id: "finish", position: [0, this.top + 2.5, z0 + 3.7], size: [size, 5, 1.5] });
    this.z = z0 + size;
    return this;
  }

  build(meta: StageMeta): StageDefinition {
    if (!this.spawn) throw new Error(`${meta.id}: a course must start with a platform`);
    if (!this.obstacles.some((o) => o.type === "finish")) throw new Error(`${meta.id}: a course must end with finish()`);
    return {
      ...meta,
      stageType: "standard",
      spawn: this.spawn,
      killPlaneY: this.lowest - 12,
      obstacles: this.obstacles,
    };
  }

  private requireLast(what: string) {
    if (!this.last) throw new Error(`${what}() must follow a platform()`);
    return this.last;
  }
}

export const course = () => new CourseBuilder();
