import { useEffect, useRef, useState } from "react";
import { track } from "../analytics/track";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { FinishPanel, FullScreenMessage, PausePanel } from "./components/RunOverlays";
import { RunHud } from "./components/RunHud";
import { sandboxStage } from "./data/stages/sandbox";
import type { EngineHandle, RunBridge } from "./game/bridge";

interface Props {
  onExit: () => void;
}

type Status = "loading" | "ready" | "error";

const FELL_FLASH_MS = 700;
const CHECKPOINT_TOAST_MS = 1600;

/** Keyboard-first game: phones and tablets get a friendly message instead. */
function isTouchOnly(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** Drop focus from overlay buttons so Space/Enter go to the game, not a button. */
function blurActive(): void {
  (document.activeElement as HTMLElement | null)?.blur?.();
}

// V0 movement sandbox (brief §34). React owns the page around the canvas; the
// engine owns the 3D world and reports through the RunBridge.
export function KeyboardRunScreen({ onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const reducedMotion = useReducedMotion();
  // Read once at start; later changes are pushed into the running engine.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  const [touchOnly] = useState(isTouchOnly);

  const [status, setStatus] = useState<Status>("loading");
  const [paused, setPaused] = useState(false);
  const [mouseCaptured, setMouseCaptured] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [runStarted, setRunStarted] = useState(false);
  const [checkpoint, setCheckpoint] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [fell, setFell] = useState(false);
  const [finishMs, setFinishMs] = useState<number | null>(null);
  const [bestMs, setBestMs] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const bestRef = useRef<number | null>(null);

  const checkpointTotal = sandboxStage.obstacles.filter((o) => o.type === "checkpoint").length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || touchOnly) return;

    let cancelled = false;
    let engine: EngineHandle | null = null;
    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    const bridge: RunBridge = {
      onTick: setTimeMs,
      onRunStart: () => {
        setRunStarted(true);
        track("keyboard_run_start", { stage: sandboxStage.id });
      },
      onCheckpoint: (index, total) => {
        setCheckpoint(index);
        setToast(`🚩 Checkpoint ${index} of ${total}!`);
        later(() => setToast(null), CHECKPOINT_TOAST_MS);
      },
      onFinish: (ms) => {
        setTimeMs(ms);
        setFinishMs(ms);
        const improved = bestRef.current === null || ms < bestRef.current;
        if (improved) bestRef.current = ms;
        setBestMs(bestRef.current);
        setIsNewBest(improved);
        track("keyboard_run_finish", { stage: sandboxStage.id, seconds: Math.round(ms / 100) / 10 });
      },
      onFell: () => {
        setFell(true);
        later(() => setFell(false), FELL_FLASH_MS);
      },
      onRespawn: () => undefined,
      onRunReset: () => {
        setTimeMs(0);
        setRunStarted(false);
        setCheckpoint(0);
        setFinishMs(null);
        setToast(null);
        blurActive();
      },
      onPauseChange: (next) => {
        setPaused(next);
        if (!next) blurActive();
      },
      onPointerLockChange: setMouseCaptured,
    };

    void (async () => {
      try {
        const { startEngine } = await import("./game/engine");
        if (cancelled) return;
        engine = await startEngine(container, bridge, { stage: sandboxStage, reducedMotion: reducedMotionRef.current });
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
        setStatus("ready");
        container.focus();
      } catch (error) {
        console.error("Keyboard Run failed to start", error);
        if (!cancelled) setStatus("error");
      }
    })();

    // Always tear down on unmount so a return visit starts clean.
    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
      engine?.dispose();
      engineRef.current = null;
    };
  }, [touchOnly]);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  if (touchOnly) {
    return (
      <FullScreenMessage
        title="Keyboard needed!"
        body="This game is played with a keyboard. Open VQVB on a laptop or desktop computer to run the course."
        onExit={onExit}
      />
    );
  }

  if (status === "error") {
    return (
      <FullScreenMessage
        title="The game couldn't start"
        body="Your browser may not support 3D graphics (WebGL). Try updating it, or use Chrome, Edge, Firefox or Safari."
        onExit={onExit}
      />
    );
  }

  const resume = () => {
    engineRef.current?.resume();
    engineRef.current?.captureMouse();
  };

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-sky-200">
      <div
        ref={containerRef}
        className="absolute inset-0 outline-none"
        tabIndex={-1}
        aria-label="Keyboard Run game. Use W A S D to move, Space to jump, Shift to sprint."
      />

      {status === "ready" && (
        <RunHud
          timeMs={timeMs}
          checkpoint={checkpoint}
          checkpointTotal={checkpointTotal}
          runStarted={runStarted}
          mouseCaptured={mouseCaptured}
          onExit={onExit}
          onPause={() => engineRef.current?.pause()}
        />
      )}

      {toast && (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center" role="status">
          <div className="rounded-full bg-emerald-500 px-5 py-2 text-lg font-extrabold text-white shadow-lg">{toast}</div>
        </div>
      )}

      {fell && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
          <p className="rounded-3xl bg-white/90 px-6 py-3 text-3xl font-extrabold text-fuchsia-600 shadow-xl">Whoops!</p>
        </div>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-sky-200 text-center">
          <div>
            <p className="animate-bounce text-5xl" aria-hidden>
              ⌨️
            </p>
            <p className="mt-2 text-lg font-extrabold text-slate-700">Building the course…</p>
          </div>
        </div>
      )}

      {paused && finishMs === null && (
        <PausePanel onResume={resume} onRestart={() => engineRef.current?.restartRun()} onExit={onExit} />
      )}

      {finishMs !== null && (
        <FinishPanel
          timeMs={finishMs}
          bestMs={bestMs}
          isNewBest={isNewBest}
          onAgain={() => engineRef.current?.restartRun()}
          onExit={onExit}
        />
      )}
    </div>
  );
}
