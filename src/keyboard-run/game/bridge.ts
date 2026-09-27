// The only channel from the 3D game to React (same pattern as the maze's
// GameBridge). The engine reports; React owns what's shown around the canvas.

export interface RunBridge {
  /** Run clock, throttled to ~10 Hz. */
  onTick: (timeMs: number) => void;
  onRunStart: () => void;
  /** First time the player sprints (hides the "hold Shift" hint). */
  onSprintUsed: () => void;
  onCheckpoint: (index: number, total: number) => void;
  onFinish: (timeMs: number) => void;
  onFell: () => void;
  onRespawn: (reason: "fell" | "manual") => void;
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
  dispose: () => void;
}
