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
        Exit to home
      </Button>
      <div className="text-left">
        <ControlsCard touchMode={touchMode} />
      </div>
    </Panel>
  );
}

export function FinishPanel({
  timeMs,
  bestMs,
  isNewBest,
  onAgain,
  onExit,
}: {
  timeMs: number;
  bestMs: number | null;
  isNewBest: boolean;
  onAgain: () => void;
  onExit: () => void;
}) {
  return (
    <Panel label="Finished">
      <p className="text-5xl" aria-hidden>
        🏁
      </p>
      <h2 className="text-3xl font-extrabold text-fuchsia-700">You made it!</h2>
      <p className="font-mono text-4xl font-bold tabular-nums text-slate-800">{formatRunTime(timeMs)}</p>
      {isNewBest ? (
        <p className="font-extrabold text-emerald-600">⭐ New best time!</p>
      ) : (
        bestMs !== null && <p className="font-bold text-slate-500">Best: {formatRunTime(bestMs)}</p>
      )}
      <Button variant="success" onClick={onAgain} autoFocus>
        ↺ Run again <span className="text-sm opacity-80">(Enter)</span>
      </Button>
      <Button variant="ghost" onClick={onExit}>
        Exit to home
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
