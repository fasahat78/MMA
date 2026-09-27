import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "../analytics/track";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { FinishPanel, FullScreenMessage, PausePanel, type FinishSummary } from "./components/RunOverlays";
import { RunHud } from "./components/RunHud";
import { TouchControls } from "./components/TouchControls";
import type { EngineHandle, RunBridge } from "./game/bridge";
import { finishStage } from "./state/progressStore";
import type { StageDefinition } from "./types/stage";

interface Props {
  stage: StageDefinition;
  /** The stage after this one, if the world has one. */
  nextStageId: string | null;
  onNextStage: (stageId: string) => void;
  /** Back to the World 1 map. */
  onMap: () => void;
}

type Status = "loading" | "ready" | "error";

const FELL_FLASH_MS = 700;
const CHECKPOINT_TOAST_MS = 1600;

/** Phones and tablets (a finger is the main pointer) start with touch controls. */
function prefersTouch(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/** Drop focus from overlay buttons so Space/Enter go to the game, not a button. */
function blurActive(): void {
  (document.activeElement as HTMLElement | null)?.blur?.();
}

// Block Dash — V0.1 movement sandbox (brief §34; folder keeps its working name). React owns the page around the canvas; the
// engine owns the 3D world and reports through the RunBridge.
export function KeyboardRunScreen({ stage, nextStageId, onNextStage, onMap }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<EngineHandle | null>(null);
  const reducedMotion = useReducedMotion();
  // Read once at start; later changes are pushed into the running engine.
  const reducedMotionRef = useRef(reducedMotion);
  reducedMotionRef.current = reducedMotion;
  // Touch controls show on phones/tablets, and appear on any device the
  // moment the screen is touched (e.g. a touchscreen laptop).
  const [touchMode, setTouchMode] = useState(prefersTouch);
  const lowPowerRef = useRef(touchMode);

  const [status, setStatus] = useState<Status>("loading");
  const [paused, setPaused] = useState(false);
  const [mouseCaptured, setMouseCaptured] = useState(false);
  const [timeMs, setTimeMs] = useState(0);
  const [runStarted, setRunStarted] = useState(false);
  const [sprintUsed, setSprintUsed] = useState(false);
  const [checkpoint, setCheckpoint] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [fell, setFell] = useState(false);
  const [finish, setFinish] = useState<FinishSummary | null>(null);
  const finishMs = finish?.timeMs ?? null;
  // The engine starts once per mount (App keys this screen by stage id).
  const stageRef = useRef(stage);

  const checkpointTotal = stage.obstacles.filter((o) => o.type === "checkpoint").length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
        track("block_dash_start", { stage: stageRef.current.id });
      },
      onSprintUsed: () => setSprintUsed(true),
      onCheckpoint: (index, total) => {
        setCheckpoint(index);
        setToast(`🚩 Checkpoint ${index} of ${total}!`);
        later(() => setToast(null), CHECKPOINT_TOAST_MS);
      },
      onFinish: (ms) => {
        const current = stageRef.current;
        setTimeMs(ms);
        const result = finishStage(current, ms);
        setFinish({
          timeMs: ms,
          bestMs: result.progress.bestTimes[current.id] ?? ms,
          isNewBest: result.isNewBest,
          winsEarned: result.winsEarned,
          totalWins: result.progress.wins,
          unlockedStageNumber: result.unlockedNext ? current.stageNumber + 1 : null,
        });
        track("block_dash_finish", { stage: current.id, seconds: Math.round(ms / 100) / 10 });
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
        setFinish(null);
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
        engine = await startEngine(container, bridge, {
          stage: stageRef.current,
          reducedMotion: reducedMotionRef.current,
          lowPower: lowPowerRef.current,
        });
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
        setStatus("ready");
        container.focus();
      } catch (error) {
        console.error("Block Dash failed to start", error);
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
  }, []);

  useEffect(() => {
    engineRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    if (touchMode) return;
    const onTouch = () => setTouchMode(true);
    window.addEventListener("touchstart", onTouch, { once: true, passive: true });
    return () => window.removeEventListener("touchstart", onTouch);
  }, [touchMode]);

  // Stable so TouchControls' cleanup only runs when it unmounts.
  const touchMove = useCallback((x: number, z: number) => engineRef.current?.setTouchMove(x, z), []);
  const touchJump = useCallback((down: boolean) => engineRef.current?.setTouchJump(down), []);
  const touchLook = useCallback((dx: number, dy: number) => engineRef.current?.addLookDelta(dx, dy), []);
  const respawn = useCallback(() => engineRef.current?.respawn(), []);

  if (status === "error") {
    return (
      <FullScreenMessage
        title="The game couldn't start"
        body="Your browser may not support 3D graphics (WebGL). Try updating it, or use Chrome, Edge, Firefox or Safari."
        onExit={onMap}
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
        aria-label="Block Dash game. Use W A S D or the on-screen stick to move, Space or the JUMP button to jump, Shift to sprint."
      />

      {status === "ready" && touchMode && !paused && finishMs === null && (
        <TouchControls onMove={touchMove} onLook={touchLook} onJump={touchJump} />
      )}

      {status === "ready" && (
        <RunHud
          timeMs={timeMs}
          checkpoint={checkpoint}
          checkpointTotal={checkpointTotal}
          stageNumber={stage.stageNumber}
          runStarted={runStarted}
          mouseCaptured={mouseCaptured}
          touchMode={touchMode}
          // Touch has no sprint control (distance = speed), so no hint there.
          showSprintHint={!touchMode && runStarted && !sprintUsed && finishMs === null}
          onExit={onMap}
          onRespawn={respawn}
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
        <PausePanel
          touchMode={touchMode}
          onResume={resume}
          onRestart={() => engineRef.current?.restartRun()}
          onExit={onMap}
        />
      )}

      {finish && (
        <FinishPanel
          stageNumber={stage.stageNumber}
          summary={finish}
          hasNextStage={nextStageId !== null}
          onNext={() => nextStageId && onNextStage(nextStageId)}
          onAgain={() => engineRef.current?.restartRun()}
          onMap={onMap}
        />
      )}
    </div>
  );
}
