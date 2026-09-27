import type { PlayerMovementConfig } from "../../data/movement";

// Pure movement maths: input + current velocity → next velocity. No physics
// engine here, so feel can be reasoned about (and tested) in isolation.

export interface SimInput {
  /** Strafe, -1 (left) … 1 (right), relative to the camera. */
  moveX: number;
  /** Forward, -1 (back) … 1 (forward), relative to the camera. */
  moveZ: number;
  /** Camera heading in radians; 0 faces +Z. */
  yaw: number;
  sprint: boolean;
  /** True only on the step Space went down. */
  jumpPressed: boolean;
  jumpHeld: boolean;
}

export const NO_INPUT: SimInput = { moveX: 0, moveZ: 0, yaw: 0, sprint: false, jumpPressed: false, jumpHeld: false };

export interface MotionState {
  vx: number;
  vy: number;
  vz: number;
  /** Seconds left in which a jump still counts as grounded. */
  coyoteSec: number;
  /** Seconds left in which a buffered jump press is still honoured. */
  jumpBufferSec: number;
  /** Rising from a jump and the jump cut has not been applied yet. */
  jumpRising: boolean;
}

export const RESTING: MotionState = { vx: 0, vy: 0, vz: 0, coyoteSec: 0, jumpBufferSec: 0, jumpRising: false };

export interface MotionContext {
  grounded: boolean;
  /** Speed-pad boost etc. 1 = none. */
  speedMultiplier: number;
  dt: number;
}

/** Converts camera-relative input into a world-space direction of length ≤ 1. */
export function worldWishDir(input: SimInput): { x: number; z: number } {
  const fx = Math.sin(input.yaw);
  const fz = Math.cos(input.yaw);
  // Right = forward × up = (-fz, 0, fx).
  let x = input.moveZ * fx - input.moveX * fz;
  let z = input.moveZ * fz + input.moveX * fx;
  const len = Math.hypot(x, z);
  if (len > 1) {
    x /= len;
    z /= len;
  }
  return { x, z };
}

function approach(current: number, target: number, maxDelta: number): number {
  if (current < target) return Math.min(current + maxDelta, target);
  return Math.max(current - maxDelta, target);
}

export function nextMotion(
  prev: MotionState,
  input: SimInput,
  ctx: MotionContext,
  cfg: PlayerMovementConfig,
): { state: MotionState; jumped: boolean } {
  const { dt, grounded } = ctx;

  // Horizontal: accelerate toward the wished velocity.
  const wish = worldWishDir(input);
  const topSpeed = cfg.baseSpeed * (input.sprint ? cfg.sprintMultiplier : 1) * ctx.speedMultiplier;
  const hasInput = wish.x !== 0 || wish.z !== 0;
  const groundRate = hasInput ? cfg.groundAcceleration : cfg.groundDeceleration;
  const rate = (grounded ? groundRate : cfg.groundAcceleration * cfg.airControl) * dt;
  // In the air with no input, keep momentum rather than braking.
  const keepMomentum = !grounded && !hasInput;
  const vx = keepMomentum ? prev.vx : approach(prev.vx, wish.x * topSpeed, rate);
  const vz = keepMomentum ? prev.vz : approach(prev.vz, wish.z * topSpeed, rate);

  // Forgiveness timers.
  const coyoteSec = grounded ? cfg.coyoteTimeMs / 1000 : Math.max(0, prev.coyoteSec - dt);
  const jumpBufferSec = input.jumpPressed ? cfg.jumpBufferMs / 1000 : Math.max(0, prev.jumpBufferSec - dt);

  // Vertical.
  let vy = grounded && prev.vy < 0 ? 0 : prev.vy;
  let jumpRising = prev.jumpRising && vy > 0;
  let jumped = false;

  if (jumpBufferSec > 0 && coyoteSec > 0) {
    vy = cfg.jumpForce;
    jumped = true;
    jumpRising = true;
  } else if (jumpRising && !input.jumpHeld) {
    vy *= cfg.jumpCutMultiplier;
    jumpRising = false;
  }

  if (!grounded || jumped) vy = Math.max(vy - cfg.gravity * dt, -cfg.maxFallSpeed);

  return {
    state: {
      vx,
      vy,
      vz,
      coyoteSec: jumped ? 0 : coyoteSec,
      jumpBufferSec: jumped ? 0 : jumpBufferSec,
      jumpRising,
    },
    jumped,
  };
}
