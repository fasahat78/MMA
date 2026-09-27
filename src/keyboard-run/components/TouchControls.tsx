import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface Props {
  onMove: (x: number, z: number) => void;
  onLook: (dx: number, dy: number) => void;
  onJump: (down: boolean) => void;
}

/** Stick size and how far (px) the knob can travel from where the thumb landed. */
// Sized up after Zoya kept missing the controls on iPad.
const STICK_SIZE = 170;
const STICK_TRAVEL = 72;

type StickTouch = { id: number; ox: number; oy: number };
type LookTouch = { id: number; x: number; y: number };

// Roblox-style thumb controls (Zoya plays Roblox on iPad):
// - touch anywhere on the LEFT half and a stick appears under the thumb;
//   push further to run faster (full push = top speed, no sprint button)
// - drag anywhere on the RIGHT half to turn the camera
// - round jump button bottom-right (hold for a higher jump)
// Every finger is tracked by its own id, so move + look + jump work together.
//
// iPad Safari sometimes never reports a finger lifting (system gestures, a
// palm, a finger sliding onto a button). A missed lift used to leave the
// stick "held": the player kept running and new touches were ignored. So:
// a new touch always takes over its control, a lost touch counts as lifted,
// and when no fingers are on the screen at all, everything is released.
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

  // Safety net that doesn't rely on per-finger events: no fingers down = nothing held.
  useEffect(() => {
    const releaseAll = () => {
      if (stick.current) endStick();
      look.current = null;
      if (jumpPointer.current !== null) {
        jumpPointer.current = null;
        onJump(false);
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) releaseAll();
    };
    // Lifts that land on other elements (a HUD button, an overlay) still count.
    const onPointerEndAnywhere = (e: PointerEvent) => {
      if (stick.current?.id === e.pointerId) endStick();
      if (look.current?.id === e.pointerId) look.current = null;
      if (jumpPointer.current === e.pointerId) {
        jumpPointer.current = null;
        onJump(false);
      }
    };
    const onHidden = () => {
      if (document.visibilityState !== "visible") releaseAll();
    };
    window.addEventListener("touchend", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { capture: true, passive: true });
    window.addEventListener("pointerup", onPointerEndAnywhere, true);
    window.addEventListener("pointercancel", onPointerEndAnywhere, true);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("touchend", onTouchEnd, true);
      window.removeEventListener("touchcancel", onTouchEnd, true);
      window.removeEventListener("pointerup", onPointerEndAnywhere, true);
      window.removeEventListener("pointercancel", onPointerEndAnywhere, true);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onHidden);
    };
    // endStick/onJump only touch refs and stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onJump]);

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
    // A new thumb always takes over, even if an old touch was never released.
    if (leftHalf) {
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
    } else {
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
      onLostPointerCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Resting hint where the stick usually goes, until she first moves. */}
      {!stickActive && (
        <div
          className="pointer-events-none absolute bottom-[max(2rem,env(safe-area-inset-bottom))] left-6 grid size-[170px] place-items-center rounded-full border-4 border-white/50 bg-slate-900/15"
          aria-hidden
        >
          <div className="size-20 rounded-full bg-white/50" />
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
        <div ref={knobRef} className="size-20 rounded-full bg-white/90 shadow-md" />
      </div>

      {!usedLook && (
        <p
          className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 whitespace-nowrap text-sm font-extrabold text-white/90 drop-shadow"
          aria-hidden
        >
          Drag here to look around 👆
        </p>
      )}

      {/* Roblox-style jump button. The whole transparent corner square is the
          touch target, so a near miss still jumps (instead of turning the camera). */}
      <button
        type="button"
        className="group absolute bottom-0 right-0 grid size-[220px] touch-none select-none place-items-center pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)]"
        aria-label="Jump"
        onPointerDown={(e) => jump(true, e)}
        onPointerUp={(e) => jump(false, e)}
        onPointerCancel={(e) => jump(false, e)}
        onLostPointerCapture={(e) => jump(false, e)}
        onPointerMove={(e) => e.stopPropagation()}
      >
        <span
          aria-hidden
          className="grid size-[136px] place-items-center rounded-full border-4 border-white/80 bg-slate-900/35 text-6xl font-black leading-none text-white shadow-xl group-active:scale-95 group-active:bg-slate-900/55"
        >
          ⬆
        </span>
      </button>
    </div>
  );
}
