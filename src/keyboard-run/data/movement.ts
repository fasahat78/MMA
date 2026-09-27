// Tuning constants (brief §5). Every value here is a placeholder to be
// play-tested — change numbers here, never inline in game code.

export interface PlayerMovementConfig {
  /** Top running speed, m/s. */
  baseSpeed: number;
  sprintMultiplier: number;
  /** Upward velocity at take-off, m/s. */
  jumpForce: number;
  /** Downward acceleration, m/s². */
  gravity: number;
  /** Fraction of ground acceleration available in the air (0–1). */
  airControl: number;
  /** Pause before a fallen player reappears. Manual respawn (R) is instant. */
  respawnDelayMs: number;
  /** How quickly the player reaches top speed on the ground, m/s². */
  groundAcceleration: number;
  /** How quickly the player stops when no key is held, m/s². */
  groundDeceleration: number;
  /** Grace period to still jump after running off a ledge. */
  coyoteTimeMs: number;
  /** A jump pressed this long before landing still fires on landing. */
  jumpBufferMs: number;
  /** Upward speed is multiplied by this when Space is released mid-rise (short hops). */
  jumpCutMultiplier: number;
  maxFallSpeed: number;
}

export const playerMovement: PlayerMovementConfig = {
  baseSpeed: 6,
  sprintMultiplier: 1.6,
  jumpForce: 8,
  gravity: 20,
  airControl: 0.65,
  respawnDelayMs: 800,
  groundAcceleration: 60,
  groundDeceleration: 70,
  coyoteTimeMs: 100,
  jumpBufferMs: 120,
  jumpCutMultiplier: 0.5,
  maxFallSpeed: 30,
};

/** Capsule the physics engine moves. The block character is drawn around it. */
export const playerBody = {
  radius: 0.4,
  /** Half the straight section; total height = 2 * (halfHeight + radius) = 1.8 m. */
  halfHeight: 0.5,
  /** Highest ledge the player walks up without jumping. */
  maxStepHeight: 0.45,
  snapToGroundDistance: 0.3,
  maxSlopeDeg: 45,
} as const;

export const cameraConfig = {
  distance: 7,
  fovDeg: 60,
  /** Radians. Positive looks down on the player. */
  defaultPitch: 0.35,
  minPitch: -0.2,
  maxPitch: 1.2,
  mouseSensitivity: 0.0025,
  /** Look-at point above the player's centre. */
  targetHeight: 1.0,
  /** Higher = snappier follow. */
  followSharpness: 15,
} as const;

/** Physics runs at a fixed rate regardless of monitor refresh. */
export const SIM_STEP_SEC = 1 / 60;
