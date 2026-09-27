// The only channel from the 3D game to React (same pattern as the maze's
// GameBridge). The engine reports; React owns what's shown around the canvas.

export interface RunBridge {
  /** Run clock, throttled to ~10 Hz. */
  onTick: (timeMs: number) => void;
  onRunStart: () => void;
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
  dispose: () => void;
}
