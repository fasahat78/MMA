// The only channel from the 3D game to React (same pattern as the maze's
// GameBridge). The engine reports; React owns what's shown around the canvas.

export interface RunBridge {
  /** Run clock, throttled to ~10 Hz. */
  onTick: (timeMs: number) => void;
  onRunStart: () => void;
  /** First time the player sprints (hides the "hold Shift" hint). */
  onSprintUsed: () => void;
  onCheckpoint: (index: number, total: number) => void;
  /** `teleported`: this run used a teleport, so it can't set a best time. */
  onFinish: (timeMs: number, teleported: boolean) => void;
  /** Landed on checkpoint `index` by teleport. */
  onTeleport: (index: number, total: number) => void;
  /** T key: the player asked to teleport (React checks and spends a charge). */
  onTeleportKey: () => void;
  onFell: () => void;
  /** Stage 15: the BOSS key woke up because you stepped into its maze. */
  onBossAwake: () => void;
  /** The BOSS key caught you; a respawn follows. */
  onCaught: () => void;
  onRespawn: (reason: "fell" | "caught" | "manual") => void;
  onRunReset: () => void;
  onPauseChange: (paused: boolean) => void;
  onPointerLockChange: (locked: boolean) => void;
}

export interface EngineHandle {
  restartRun: () => void;
  resume: () => void;
  pause: () => void;
  /** Captures the mouse for camera control. Call from a click handler. */
  captureMouse: () => void;
  setReducedMotion: (reduced: boolean) => void;
  /** On-screen stick: x right, z forward, −1…1. Distance sets speed, up to sprint. */
  setTouchMove: (x: number, z: number) => void;
  /** Drag on the look area turns the camera (pixels since last call). */
  addLookDelta: (dx: number, dy: number) => void;
  setTouchJump: (down: boolean) => void;
  /** Same as the R key: back to the last checkpoint (or restart after finishing). */
  respawn: () => void;
  /** Jumps to the next checkpoint. False when there's none ahead (or paused). */
  teleport: () => boolean;
  canTeleport: () => boolean;
  dispose: () => void;
}
