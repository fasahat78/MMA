import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { TOUCH_SPRINT_THRESHOLD } from "../game/input";

interface Props {
  onMove: (x: number, z: number) => void;
  onJump: (down: boolean) => void;
  onRespawn: () => void;
}

/** How far (px) the knob can travel from the centre. */
const STICK_TRAVEL = 52;

// Thumb controls for phones and tablets: a joystick on the left (push it all
// the way out to sprint), a big JUMP button on the right, and a respawn
// button. Each control tracks its own finger, so both thumbs work at once.
export function TouchControls({ onMove, onJump, onRespawn }: Props) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stickPointer = useRef<number | null>(null);
  const jumpPointer = useRef<number | null>(null);

  // Let go of everything if the controls disappear mid-press.
  useEffect(() => () => {
    onMove(0, 0);
    onJump(false);
  }, [onMove, onJump]);

  function capture(e: ReactPointerEvent<HTMLElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; tracking still works.
    }
  }

  function moveStick(e: ReactPointerEvent<HTMLDivElement>) {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;
    const rect = base.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_TRAVEL) {
      dx = (dx / dist) * STICK_TRAVEL;
      dy = (dy / dist) * STICK_TRAVEL;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const x = dx / STICK_TRAVEL;
    const z = -dy / STICK_TRAVEL; // screen up = forward
    base.dataset.sprint = String(Math.hypot(x, z) >= TOUCH_SPRINT_THRESHOLD);
    onMove(x, z);
  }

  function releaseStick() {
    stickPointer.current = null;
    if (knobRef.current) knobRef.current.style.transform = "";
    if (baseRef.current) baseRef.current.dataset.sprint = "false";
    onMove(0, 0);
  }

  return (
    <div className="kr-touch pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {/* Joystick */}
      <div
        ref={baseRef}
        data-sprint="false"
        role="application"
        aria-label="Movement stick. Push all the way out to sprint."
        className="kr-stick pointer-events-auto relative grid size-32 touch-none select-none place-items-center rounded-full border-4 border-white/70 bg-slate-900/25 shadow-lg backdrop-blur-sm transition-colors data-[sprint=true]:border-amber-300 data-[sprint=true]:bg-amber-400/30"
        onPointerDown={(e) => {
          if (stickPointer.current !== null) return;
          stickPointer.current = e.pointerId;
          capture(e);
          moveStick(e);
        }}
        onPointerMove={(e) => {
          if (e.pointerId === stickPointer.current) moveStick(e);
        }}
        onPointerUp={(e) => {
          if (e.pointerId === stickPointer.current) releaseStick();
        }}
        onPointerCancel={(e) => {
          if (e.pointerId === stickPointer.current) releaseStick();
        }}
      >
        <span className="pointer-events-none absolute -top-7 left-0 whitespace-nowrap text-xs font-extrabold text-white drop-shadow" aria-hidden>
          push to edge = ⚡ sprint
        </span>
        <div ref={knobRef} className="pointer-events-none size-14 rounded-full bg-white/90 shadow-md" aria-hidden />
      </div>

      <div className="flex flex-col items-end gap-3">
        <button
          type="button"
          onClick={onRespawn}
          className="pointer-events-auto grid size-12 touch-manipulation select-none place-items-center rounded-full bg-white/85 text-xl font-black text-slate-700 shadow-md"
          aria-label="Back to last checkpoint"
        >
          ↺
        </button>
        <button
          type="button"
          className="pointer-events-auto grid size-24 touch-none select-none place-items-center rounded-full border-4 border-white/80 bg-fuchsia-500/85 text-lg font-black text-white shadow-xl active:scale-95 active:bg-fuchsia-600"
          aria-label="Jump"
          onPointerDown={(e) => {
            if (jumpPointer.current !== null) return;
            jumpPointer.current = e.pointerId;
            capture(e);
            onJump(true);
          }}
          onPointerUp={(e) => {
            if (e.pointerId !== jumpPointer.current) return;
            jumpPointer.current = null;
            onJump(false);
          }}
          onPointerCancel={(e) => {
            if (e.pointerId !== jumpPointer.current) return;
            jumpPointer.current = null;
            onJump(false);
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          JUMP
        </button>
      </div>
    </div>
  );
}
