import { useEffect, useRef, useState } from "react";
import type PhaserNamespace from "phaser";
import { MAZE_SCENE_KEY } from "../game/gameBridge";
import type { ActiveEffects, GameBridge, MazeSceneData } from "../game/gameBridge";
import type { MazeScene } from "../game/MazeScene";
import type { ActiveMap, WinPayload } from "../types/nav";
import type { MazeRunResult } from "../types/game";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { getCharacter } from "../data/characters";
import { computeRunGems } from "../data/gems";
import {
  allMainMapsComplete,
  completeMainMap,
  completeSecretMap,
  getProgress,
  isMainMapCompleted,
  nextMainMapId,
} from "../store/progressStore";
import { POWERUPS, chaserConfig } from "../data/modes";
import { Button } from "../components/ui/Button";

interface Props {
  activeMap: ActiveMap;
  onWin: (payload: WinPayload) => void;
  onExit: () => void;
}

type Dir = "up" | "down" | "left" | "right";

// Spec v2 §5.3 + §12.1 — React owns navigation + the store; Phaser owns only
// the maze and reports events through the GameBridge.
export function GameScreen({ activeMap, onWin, onExit }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<PhaserNamespace.Game | null>(null);
  const reducedMotion = useReducedMotion();
  const [liveGems, setLiveGems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [caught, setCaught] = useState(false);
  const [runNonce, setRunNonce] = useState(0);
  const [effects, setEffects] = useState<ActiveEffects>({ shieldSeconds: 0, stunSeconds: 0 });
  const completedRef = useRef(false);
  const gameMode = getProgress().gameMode;
  const chaserEmoji = chaserConfig[gameMode].emoji;

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    let game: PhaserNamespace.Game | null = null;
    let cancelled = false;

    // Reset per-run UI state (matters when retrying after being caught).
    completedRef.current = false;
    setLiveGems(0);
    setCaught(false);
    setEffects({ shieldSeconds: 0, stunSeconds: 0 });
    setLoading(true);

    const character = getCharacter(getProgress().selectedCharacterId);

    const bridge: GameBridge = {
      onGemCollected: (count) => setLiveGems(count),
      onMazeComplete: (result) => handleComplete(result),
      onCaught: () => setCaught(true),
      onEffectsChanged: (next) => setEffects(next),
      onExit,
    };

    const sceneData: MazeSceneData = {
      mapId: activeMap.id,
      theme: activeMap.theme,
      difficulty: activeMap.difficulty,
      gemTarget: activeMap.gemTarget,
      gameMode: getProgress().gameMode,
      characterEmoji: character?.emoji ?? "🐧",
      equippedAccessories: getProgress().equippedAccessories,
      reducedMotion,
      bridge,
    };

    // Spec v2 §performance — Phaser is heavy, so it loads on demand only when
    // a maze actually opens, keeping the menu bundle small.
    void (async () => {
      const [{ default: Phaser }, { createGameConfig }, { MazeScene }] = await Promise.all([
        import("phaser"),
        import("../game/gameConfig"),
        import("../game/MazeScene"),
      ]);
      if (cancelled || !containerRef.current) return;
      game = new Phaser.Game(createGameConfig(containerRef.current));
      game.scene.add(MAZE_SCENE_KEY, MazeScene, true, sceneData);
      gameRef.current = game;
      setLoading(false);
    })();

    // Spec v2 §12.1 — always destroy on unmount to avoid duplicate canvases.
    return () => {
      cancelled = true;
      game?.destroy(true);
      gameRef.current = null;
    };
    // activeMap.id + runNonce drive a fresh run; other fields read at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMap.id, reducedMotion, runNonce]);

  function handleComplete(result: MazeRunResult) {
    if (completedRef.current) return;
    completedRef.current = true;

    const isFirst =
      activeMap.kind === "main"
        ? !isMainMapCompleted(result.mapId)
        : !getProgress().completedSecretMapIds.includes(result.mapId);

    const bonuses = computeRunGems({
      gemsCollected: result.gemsCollected,
      totalGemsInMaze: result.totalGemsInMaze,
      isFirstCompletion: isFirst,
    });

    const wasAllComplete = allMainMapsComplete();

    if (activeMap.kind === "main") {
      completeMainMap(result.mapId, bonuses.total);
    } else {
      completeSecretMap(result.mapId, bonuses.total);
    }

    const unlockedSecretMapsNow =
      activeMap.kind === "main" && !wasAllComplete && allMainMapsComplete();

    onWin({
      mapName: activeMap.name,
      emoji: activeMap.emoji,
      kind: activeMap.kind,
      bonuses,
      totalGems: getProgress().totalGems,
      nextMapId: activeMap.kind === "main" ? nextMainMapId(result.mapId) : null,
      unlockedSecretMapsNow,
    });
  }

  function press(dir: Dir) {
    const scene = gameRef.current?.scene.getScene(MAZE_SCENE_KEY) as MazeScene | undefined;
    scene?.move(dir);
  }

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-fuchsia-100">
      {/* Phaser mounts here */}
      <div ref={containerRef} className="absolute inset-0" />

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-fuchsia-100 text-center">
          <div>
            <div className="pop-in text-5xl" aria-hidden>
              {activeMap.emoji}
            </div>
            <p className="mt-3 text-lg font-extrabold text-fuchsia-700">Loading maze…</p>
          </div>
        </div>
      )}

      {/* HUD */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <button
          onClick={onExit}
          className="btn-pop pointer-events-auto min-h-[48px] rounded-2xl bg-white/85 px-4 py-2 text-base font-extrabold text-slate-700 shadow-md"
          aria-label="Back to map select"
        >
          ← Maps
        </button>
        {/* Current maze name — clear identifier of which maze you're in. */}
        <div className="absolute left-1/2 top-4 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/85 px-4 py-2 text-base font-extrabold text-slate-700 shadow-md">
          <span aria-hidden>{activeMap.emoji} </span>
          {activeMap.name}
        </div>
        <div className="flex items-center gap-2">
          {chaserEmoji && (
            <div
              className="rounded-full bg-white/85 px-3 py-2 text-lg shadow-md"
              aria-label={`${gameMode} mode`}
            >
              {chaserEmoji}
            </div>
          )}
          <div className="rounded-full bg-white/85 px-4 py-2 text-lg font-extrabold text-fuchsia-700 shadow-md">
            💎 {liveGems} / {activeMap.gemTarget}
          </div>
        </div>
      </div>

      {/* Active power-up countdowns */}
      {(effects.shieldSeconds > 0 || effects.stunSeconds > 0) && (
        <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center gap-2">
          {effects.shieldSeconds > 0 && (
            <div className="pop-in rounded-full bg-sky-400/90 px-4 py-1.5 text-base font-black text-white shadow-md">
              {POWERUPS.shieldEmoji} {effects.shieldSeconds}s
            </div>
          )}
          {effects.stunSeconds > 0 && (
            <div className="pop-in rounded-full bg-amber-400/90 px-4 py-1.5 text-base font-black text-amber-950 shadow-md">
              {POWERUPS.stunEmoji} {effects.stunSeconds}s
            </div>
          )}
        </div>
      )}

      {/* Caught overlay (Medium/Hard). Gentle, no penalty — just retry. */}
      {caught && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-900/55 p-6">
          <div className="pop-in w-full max-w-sm rounded-[2rem] bg-white p-6 text-center shadow-2xl">
            <div className="text-6xl" aria-hidden>
              {chaserEmoji || "💨"}
            </div>
            <h2 className="mt-2 text-2xl font-black text-fuchsia-700">Caught!</h2>
            <p className="mt-1 font-bold text-slate-500">
              The chaser got you. Want to try again?
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Button variant="success" onClick={() => setRunNonce((n) => n + 1)}>
                🔁 Try Again
              </Button>
              <Button variant="secondary" onClick={onExit}>
                🗺️ Map Select
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* On-screen D-pad (mobile + click). Keyboard also works on desktop. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-5 sm:justify-end">
        <div className="pointer-events-auto grid grid-cols-3 grid-rows-3 gap-2">
          <span />
          <DpadButton label="▲" onPress={() => press("up")} />
          <span />
          <DpadButton label="◀" onPress={() => press("left")} />
          <span />
          <DpadButton label="▶" onPress={() => press("right")} />
          <span />
          <DpadButton label="▼" onPress={() => press("down")} />
          <span />
        </div>
      </div>
    </div>
  );
}

function DpadButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      variant="secondary"
      noSound
      className="h-16 w-16 rounded-2xl px-0 py-0 text-2xl"
      onClick={onPress}
      aria-label={`Move ${label}`}
    >
      {label}
    </Button>
  );
}
