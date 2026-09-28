import type { ReactNode } from "react";
import { Button } from "../../components/ui/Button";
import { formatRunTime } from "../utils/formatTime";
import { ControlsCard } from "./RunHud";

function Panel({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-slate-900/45 p-4 backdrop-blur-sm" role="dialog" aria-label={label}>
      <div className="flex w-full max-w-sm flex-col items-stretch gap-3 rounded-[2rem] bg-white p-6 text-center shadow-2xl">
        {children}
      </div>
    </div>
  );
}

export function PausePanel({
  touchMode,
  onResume,
  onRestart,
  onExit,
}: {
  touchMode: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}) {
  return (
    <Panel label="Paused">
      <h2 className="text-3xl font-extrabold text-fuchsia-700">Paused</h2>
      <Button onClick={onResume} autoFocus>
        ▶ Keep going
      </Button>
      <Button variant="secondary" onClick={onRestart}>
        ↺ Restart run
      </Button>
      <Button variant="ghost" onClick={onExit}>
        🗺️ World map
      </Button>
      <div className="text-left">
        <ControlsCard touchMode={touchMode} />
      </div>
    </Panel>
  );
}

export interface FinishSummary {
  timeMs: number;
  bestMs: number;
  isNewBest: boolean;
  winsEarned: number;
  totalWins: number;
  /** The stage just opened for the first time, if any. */
  unlockedStageNumber: number | null;
  /** A teleport was used, so no best time was saved. */
  teleported: boolean;
}

export function FinishPanel({
  stageNumber,
  summary,
  hasNextStage,
  onNext,
  onAgain,
  onMap,
}: {
  stageNumber: number;
  summary: FinishSummary;
  hasNextStage: boolean;
  onNext: () => void;
  onAgain: () => void;
  onMap: () => void;
}) {
  const { timeMs, bestMs, isNewBest, winsEarned, totalWins, unlockedStageNumber, teleported } = summary;
  return (
    <Panel label="Finished">
      <p className="text-5xl" aria-hidden>
        🏁
      </p>
      <h2 className="text-3xl font-extrabold text-fuchsia-700">Stage {stageNumber} done!</h2>
      <p className="font-mono text-4xl font-bold tabular-nums text-slate-800">{formatRunTime(timeMs)}</p>
      {teleported ? (
        <p className="font-bold text-violet-600">⚡ Teleport used — best times only count without one</p>
      ) : isNewBest ? (
        <p className="font-extrabold text-emerald-600">⭐ New best time!</p>
      ) : (
        <p className="font-bold text-slate-500">Best: {formatRunTime(bestMs)}</p>
      )}
      <p className="rounded-2xl bg-amber-100 px-4 py-2 text-lg font-black text-amber-900">
        🏆 +{winsEarned} {winsEarned === 1 ? "Win" : "Wins"} <span className="text-sm font-bold text-amber-700">· {totalWins} to spend</span>
      </p>
      {unlockedStageNumber !== null && hasNextStage && (
        <p className="font-extrabold text-indigo-600">🔓 Stage {unlockedStageNumber} is open!</p>
      )}
      {hasNextStage ? (
        <Button variant="success" onClick={onNext} autoFocus>
          Next stage ▶ <span className="text-sm opacity-80">(Enter)</span>
        </Button>
      ) : (
        <p className="font-extrabold text-fuchsia-600">🎉 You finished World 1!</p>
      )}
      <Button variant={hasNextStage ? "secondary" : "success"} onClick={onAgain} autoFocus={!hasNextStage}>
        ↺ Run again <span className="text-sm opacity-80">({hasNextStage ? "R" : "Enter"})</span>
      </Button>
      <Button variant="ghost" onClick={onMap}>
        🗺️ World map
      </Button>
    </Panel>
  );
}

export function FullScreenMessage({ title, body, onExit }: { title: string; body: string; onExit: () => void }) {
  return (
    <div className="grid h-dvh w-full place-items-center bg-sky-100 p-6 text-center">
      <div className="flex max-w-sm flex-col gap-4 rounded-[2rem] bg-white p-6 shadow-xl">
        <p className="text-5xl" aria-hidden>
          ⌨️
        </p>
        <h1 className="text-2xl font-extrabold text-fuchsia-700">{title}</h1>
        <p className="font-semibold text-slate-600">{body}</p>
        <Button onClick={onExit}>← Back to VQVB</Button>
      </div>
    </div>
  );
}
