import { cameraConfig } from "../data/movement";
import type { SimInput } from "./sim/playerMotion";

// Keyboard + mouse (brief §4) and on-screen touch controls. Tracks held keys,
// turns mouse movement into camera yaw/pitch while the pointer is locked,
// reports Esc / R / Enter, and merges in the touch joystick and jump button.

/** Pushing the touch stick this far out (0–1) also sprints. */
export const TOUCH_SPRINT_THRESHOLD = 0.92;

const FORWARD = ["KeyW", "ArrowUp"];
const BACK = ["KeyS", "ArrowDown"];
const LEFT = ["KeyA", "ArrowLeft"];
const RIGHT = ["KeyD", "ArrowRight"];
const SPRINT = ["ShiftLeft", "ShiftRight"];
const JUMP = ["Space"];
/** Keys the browser would otherwise use to scroll the page. */
const SWALLOW = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT, ...JUMP]);

export interface InputCallbacks {
  onRespawn: () => void;
  onEscape: () => void;
  onConfirm: () => void;
  onPointerLockChange: (locked: boolean) => void;
}

export class InputController {
  yaw = 0;
  pitch: number = cameraConfig.defaultPitch;
  private readonly held = new Set<string>();
  private jumpQueued = false;
  private touchX = 0;
  private touchZ = 0;
  private touchJumpHeld = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly callbacks: InputCallbacks;
  private readonly abort = new AbortController();

  constructor(canvas: HTMLCanvasElement, callbacks: InputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    const signal = this.abort.signal;
    window.addEventListener("keydown", this.onKeyDown, { signal });
    window.addEventListener("keyup", this.onKeyUp, { signal });
    // Releasing focus mid-keypress must not leave the player running forever.
    window.addEventListener("blur", this.releaseAll, { signal });
    document.addEventListener("mousemove", this.onMouseMove, { signal });
    document.addEventListener("pointerlockchange", this.onLockChange, { signal });
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  /** Must be called from a click/keypress handler (browser rule). */
  async requestLock(): Promise<void> {
    if (this.locked) return;
    try {
      await this.canvas.requestPointerLock();
    } catch {
      // Browsers refuse re-locking for ~1 s after Esc; the camera just stays put.
    }
  }

  releaseLock(): void {
    if (this.locked) document.exitPointerLock();
  }

  /** Current input for one simulation step. The jump press is consumed. */
  sample(): SimInput {
    const axis = (pos: string[], neg: string[]) => (this.any(pos) ? 1 : 0) - (this.any(neg) ? 1 : 0);
    const jumpPressed = this.jumpQueued;
    this.jumpQueued = false;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const touchSprint = Math.hypot(this.touchX, this.touchZ) >= TOUCH_SPRINT_THRESHOLD;
    return {
      moveX: clamp(axis(RIGHT, LEFT) + this.touchX),
      moveZ: clamp(axis(FORWARD, BACK) + this.touchZ),
      yaw: this.yaw,
      sprint: this.any(SPRINT) || touchSprint,
      jumpPressed,
      jumpHeld: this.any(JUMP) || this.touchJumpHeld,
    };
  }

  /** Joystick position: x right, z forward, each −1…1 (length ≤ 1). */
  setTouchMove(x: number, z: number): void {
    const len = Math.hypot(x, z);
    const scale = len > 1 ? 1 / len : 1;
    this.touchX = x * scale;
    this.touchZ = z * scale;
  }

  /** Jump button down/up. Down queues a jump, holding keeps it high. */
  setTouchJump(down: boolean): void {
    if (down && !this.touchJumpHeld) this.jumpQueued = true;
    this.touchJumpHeld = down;
  }

  resetCamera(): void {
    this.yaw = 0;
    this.pitch = cameraConfig.defaultPitch;
  }

  releaseAll = (): void => {
    this.held.clear();
    this.jumpQueued = false;
    this.touchX = 0;
    this.touchZ = 0;
    this.touchJumpHeld = false;
  };

  dispose(): void {
    this.abort.abort();
    this.releaseLock();
  }

  private any(codes: string[]): boolean {
    return codes.some((c) => this.held.has(c));
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (SWALLOW.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    this.held.add(e.code);
    if (JUMP.includes(e.code)) this.jumpQueued = true;
    if (e.code === "KeyR") this.callbacks.onRespawn();
    if (e.code === "Escape") this.callbacks.onEscape();
    // A focused button handles Enter itself; don't also act on it here.
    if (e.code === "Enter" && !(e.target instanceof HTMLButtonElement)) this.callbacks.onConfirm();
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.held.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.locked) return;
    this.yaw -= e.movementX * cameraConfig.mouseSensitivity;
    this.pitch = Math.min(
      cameraConfig.maxPitch,
      Math.max(cameraConfig.minPitch, this.pitch + e.movementY * cameraConfig.mouseSensitivity),
    );
  };

  private onLockChange = (): void => {
    this.callbacks.onPointerLockChange(this.locked);
  };
}
