import type { KeyLabel } from "../data/keyboardMessages";
import type { ObstacleDef, ObstacleType, StageDefinition, Vec3 } from "../types/stage";

// Expands obstacle definitions into primitive parts. Physics and rendering
// both consume this one list, so what you see is exactly what you collide with.

export type PartKind =
  /** Solid, never moves. */
  | "static"
  /** Solid, moved by a `PartMotion` each step. */
  | "moving"
  /** Solid, drops after being stood on. */
  | "falling"
  /** No collider — only tested for overlap with the player. */
  | "zone";

export interface PartMotion {
  axis: 0 | 1 | 2;
  distance: number;
  speed: number;
  pauseSec: number;
}

export type ZoneRole =
  | { role: "checkpoint"; index: number }
  | { role: "finish" }
  | { role: "speed-pad"; boost: number; durationSec: number };

export interface Part {
  id: string;
  kind: PartKind;
  obstacleType: ObstacleType;
  center: Vec3;
  size: Vec3;
  label?: KeyLabel;
  motion?: PartMotion;
  /** Velocity added to anyone standing on this part. */
  belt?: Vec3;
  fall?: { delaySec: number; resetDelaySec: number };
  zone?: ZoneRole;
}

const AXIS = { x: 0, z: 2 } as const;

export function layoutStage(stage: StageDefinition): Part[] {
  const parts: Part[] = [];
  let checkpointIndex = 0;
  for (const def of stage.obstacles) {
    if (def.type === "checkpoint") checkpointIndex += 1;
    parts.push(...expand(def, checkpointIndex));
  }
  return parts;
}

function expand(def: ObstacleDef, checkpointIndex: number): Part[] {
  const base = { id: def.id, obstacleType: def.type };
  switch (def.type) {
    case "platform":
    case "bridge":
      return [{ ...base, kind: "static", center: def.position, size: def.size }];
    case "treadmill":
      return [{ ...base, kind: "static", center: def.position, size: def.size, belt: def.beltVelocity }];
    case "moving-platform":
      return [
        {
          ...base,
          kind: "moving",
          center: def.position,
          size: def.size,
          motion: { axis: AXIS[def.axis], distance: def.distance, speed: def.speed, pauseSec: def.pauseSec },
        },
      ];
    case "lift":
      return [
        {
          ...base,
          kind: "moving",
          center: def.position,
          size: def.size,
          motion: { axis: 1, distance: def.height, speed: def.speed, pauseSec: def.pauseSec },
        },
      ];
    case "speed-pad":
      return [
        {
          ...base,
          kind: "zone",
          center: def.position,
          size: def.size,
          zone: { role: "speed-pad", boost: def.boost, durationSec: def.durationSec },
        },
      ];
    case "checkpoint":
      return [{ ...base, kind: "zone", center: def.position, size: def.size, zone: { role: "checkpoint", index: checkpointIndex } }];
    case "finish":
      return [{ ...base, kind: "zone", center: def.position, size: def.size, zone: { role: "finish" } }];
    case "keyboard-run":
      return expandKeyboardRun(def);
    case "falling-keys":
      return expandFallingKeys(def);
  }
}

function expandKeyboardRun(def: Extract<ObstacleDef, { type: "keyboard-run" }>): Part[] {
  const [ox, oy, oz] = def.origin;
  const depth = def.keyDepth ?? def.keySize;
  const pitchX = def.keySize + def.gap;
  const pitchZ = depth + def.gap;
  const parts: Part[] = [];
  for (let row = 0; row < def.rows; row++) {
    const top = oy + def.stepUp * (row + 1);
    const shift = def.rowOffsets?.[row] ?? 0;
    for (let col = 0; col < def.columns; col++) {
      const i = row * def.columns + col;
      parts.push({
        id: `${def.id}-${i}`,
        kind: "static",
        obstacleType: def.type,
        // Column 0 on the player's left: looking down +Z, left is +X.
        center: [ox + shift + ((def.columns - 1) / 2 - col) * pitchX, top - def.keyHeight / 2, oz + row * pitchZ + depth / 2],
        size: [def.keySize, def.keyHeight, depth],
        label: def.labels[i % def.labels.length],
      });
    }
  }
  return parts;
}

function expandFallingKeys(def: Extract<ObstacleDef, { type: "falling-keys" }>): Part[] {
  const [ox, top, oz] = def.origin;
  return Array.from({ length: def.count }, (_, i) => ({
    id: `${def.id}-${i}`,
    kind: "falling" as const,
    obstacleType: def.type,
    center: [ox, top - def.keyHeight / 2, oz + i * (def.keyDepth + def.gap) + def.keyDepth / 2] as const,
    size: [def.keyWidth, def.keyHeight, def.keyDepth] as const,
    label: def.labels[i % def.labels.length],
    fall: { delaySec: def.fallDelaySec, resetDelaySec: def.resetDelaySec },
  }));
}

/**
 * Offset along the motion axis at time `t`: rest at 0, travel out, rest at
 * `distance`, travel back. Pure so tests and renderers can share it.
 */
export function pingPongOffset(t: number, motion: PartMotion): number {
  const travel = motion.distance / motion.speed;
  const cycle = 2 * travel + 2 * motion.pauseSec;
  const p = ((t % cycle) + cycle) % cycle;
  if (p < motion.pauseSec) return 0;
  if (p < motion.pauseSec + travel) return (p - motion.pauseSec) * motion.speed;
  if (p < 2 * motion.pauseSec + travel) return motion.distance;
  return motion.distance - (p - 2 * motion.pauseSec - travel) * motion.speed;
}
