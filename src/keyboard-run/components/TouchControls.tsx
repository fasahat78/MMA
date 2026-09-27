import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface Props {
  onMove: (x: number, z: number) => void;
  onLook: (dx: number, dy: number) => void;
  onJump: (down: boolean) => void;
}

/** Stick size and how far (px) the knob can travel from where the thumb landed. */
const STICK_SIZE = 128;
const STICK_TRAVEL = 56;

type StickTouch = { id: number; ox: number; oy: number };
type LookTouch = { id: number; x: number; y: number };

// Roblox-style thumb controls (Zoya plays Roblox on iPad):
// - touch anywhere on the LEFT half and a stick appears under the thumb;
//   push further to run faster (full push = top speed, no sprint button)
// - drag anywhere on the RIGHT half to turn the camera
// - round jump button bottom-right (hold for a higher jump)
// Every finger is tracked by its own id, so move + look + jump work together.
export function TouchControls({ onMove, onLook, onJump }: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const stick = useRef<StickTouch | null>(null);
  const look = useRef<LookTouch | null>(null);
  const jumpPointer = useRef<number | null>(null);
  const [stickActive, setStickActive] = useState(false);
  const [usedMove, setUsedMove] = useState(false);
  const [usedLook, setUsedLook] = useState(false);

  // Let go of everything if the controls disappear mid-press (pause, finish).
  useEffect(
    () => () => {
      onMove(0, 0);
      onJump(false);
    },
    [onMove, onJump],
  );

  function capture(e: ReactPointerEvent<HTMLElement>) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-released pointers can't be captured; tracking still works.
    }
  }

  function placeStick(ox: number, oy: number) {
    const base = baseRef.current;
    if (!base) return;
    base.style.left = `${ox - STICK_SIZE / 2}px`;
    base.style.top = `${oy - STICK_SIZE / 2}px`;
  }

  function moveStick(clientX: number, clientY: number) {
    const s = stick.current;
    const knob = knobRef.current;
    if (!s || !knob) return;
    let dx = clientX - s.ox;
    let dy = clientY - s.oy;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_TRAVEL) {
      dx = (dx / dist) * STICK_TRAVEL;
      dy = (dy / dist) * STICK_TRAVEL;
    }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    onMove(dx / STICK_TRAVEL, -dy / STICK_TRAVEL); // screen up = forward
  }

  function endStick() {
    stick.current = null;
    setStickActive(false);
    if (knobRef.current) knobRef.current.style.transform = "";
    onMove(0, 0);
  }

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    const surface = surfaceRef.current;
    if (!surface) return;
    const rect = surface.getBoundingClientRect();
    const leftHalf = e.clientX - rect.left < rect.width / 2;
    if (leftHalf && !stick.current) {
      // Keep the whole stick on screen even if the thumb lands at the edge.
      const half = STICK_SIZE / 2;
      const ox = Math.min(Math.max(e.clientX - rect.left, half), rect.width - half);
      const oy = Math.min(Math.max(e.clientY - rect.top, half), rect.height - half);
      stick.current = { id: e.pointerId, ox: ox + rect.left, oy: oy + rect.top };
      placeStick(ox, oy);
      setStickActive(true);
      setUsedMove(true);
      capture(e);
      moveStick(e.clientX, e.clientY);
    } else if (!leftHalf && !look.current) {
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      capture(e);
    }
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (stick.current?.id === e.pointerId) {
      moveStick(e.clientX, e.clientY);
    } else if (look.current?.id === e.pointerId) {
      const dx = e.clientX - look.current.x;
      const dy = e.clientY - look.current.y;
      look.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (dx !== 0 || dy !== 0) {
        onLook(dx, dy);
        setUsedLook(true);
      }
    }
  }

  function onPointerEnd(e: ReactPointerEvent<HTMLDivElement>) {
    if (stick.current?.id === e.pointerId) endStick();
    else if (look.current?.id === e.pointerId) look.current = null;
  }

  function jump(down: boolean, e: ReactPointerEvent<HTMLButtonElement>) {
    // Don't let the jump finger also start a camera drag on the surface.
    e.stopPropagation();
    if (down) {
      if (jumpPointer.current !== null) return;
      jumpPointer.current = e.pointerId;
      capture(e);
      onJump(true);
    } else if (e.pointerId === jumpPointer.current) {
      jumpPointer.current = null;
      onJump(false);
    }
  }

  return (
    <div
      ref={surfaceRef}
      className="kr-touch kr-touch-surface absolute inset-0 touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Resting hint where the stick usually goes, until she first moves. */}
      {!stickActive && (
        <div
          className="pointer-events-none absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-8 grid size-32 place-items-center rounded-full border-4 border-white/50 bg-slate-900/15"
          aria-hidden
        >
          <div className="size-14 rounded-full bg-white/50" />
          {!usedMove && (
            <span className="absolute -top-8 whitespace-nowrap text-sm font-extrabold text-white drop-shadow">
              👆 Drag here to move
            </span>
          )}
        </div>
      )}

      {/* The live stick, placed under the thumb. */}
      <div
        ref={baseRef}
        className={`kr-stick pointer-events-none absolute grid place-items-center rounded-full border-4 border-white/80 bg-slate-900/25 shadow-lg ${stickActive ? "" : "hidden"}`}
        style={{ width: STICK_SIZE, height: STICK_SIZE }}
        aria-hidden
      >
        <div ref={knobRef} className="size-14 rounded-full bg-white/90 shadow-md" />
      </div>

      {!usedLook && (
        <p
          className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-extrabold text-white/90 drop-shadow"
          aria-hidden
        >
          Drag here to look around 👆
        </p>
      )}

      {/* Roblox-style jump button. */}
      <button
        type="button"
        className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] right-8 grid size-24 touch-none select-none place-items-center rounded-full border-4 border-white/80 bg-slate-900/35 text-5xl font-black leading-none text-white shadow-xl active:scale-95 active:bg-slate-900/55"
        aria-label="Jump"
        onPointerDown={(e) => jump(true, e)}
        onPointerUp={(e) => jump(false, e)}
        onPointerCancel={(e) => jump(false, e)}
        onPointerMove={(e) => e.stopPropagation()}
      >
        <span aria-hidden>⬆</span>
      </button>
    </div>
  );
}
