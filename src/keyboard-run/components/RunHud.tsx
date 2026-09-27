import { formatRunTime } from "../utils/formatTime";

interface Props {
  timeMs: number;
  checkpoint: number;
  checkpointTotal: number;
  runStarted: boolean;
  mouseCaptured: boolean;
  onExit: () => void;
  onPause: () => void;
}

const pill = "rounded-full bg-white/85 px-3 py-2 text-sm font-extrabold text-slate-700 shadow-md backdrop-blur";

// Always-on overlay: exit, run clock, checkpoint progress, control hints.
export function RunHud({ timeMs, checkpoint, checkpointTotal, runStarted, mouseCaptured, onExit, onPause }: Props) {
  return (
    <>
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onExit}
          className={`btn-pop pointer-events-auto min-h-[44px] shrink-0 ${pill}`}
          aria-label="Back to VQVB home"
        >
          ← Home
        </button>

        <div className="flex min-w-0 flex-1 justify-center">
          <div
            className="rounded-2xl bg-slate-900/80 px-5 py-2 font-mono text-2xl font-bold tabular-nums text-white shadow-lg"
            role="timer"
            aria-label="Run time"
          >
            {formatRunTime(timeMs)}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className={pill} aria-label={`Checkpoint ${checkpoint} of ${checkpointTotal}`}>
            🚩 {checkpoint}/{checkpointTotal}
          </div>
          <button
            onClick={onPause}
            className={`btn-pop pointer-events-auto min-h-[44px] ${pill}`}
            aria-label="Pause"
          >
            ⏸
          </button>
        </div>
      </header>

      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-1.5rem)]">
        {runStarted ? (
          <div className="rounded-2xl bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-600 shadow backdrop-blur">
            R respawn · Esc pause
          </div>
        ) : (
          <ControlsCard />
        )}
      </div>

      {!mouseCaptured && runStarted && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-2xl bg-white/70 px-3 py-1.5 text-xs font-bold text-slate-600 shadow backdrop-blur">
          🖱 Click the game to look around
        </div>
      )}
    </>
  );
}

const CONTROLS: Array<[string, string]> = [
  ["W A S D / ← ↑ → ↓", "Move"],
  ["Shift", "Sprint"],
  ["Space", "Jump (hold for higher)"],
  ["Mouse", "Look around — click the game first"],
  ["R", "Back to last checkpoint"],
  ["Esc", "Pause"],
];

export function ControlsCard() {
  return (
    <div className="rounded-3xl bg-white/90 p-4 text-sm text-slate-700 shadow-xl backdrop-blur">
      <p className="mb-2 font-extrabold text-fuchsia-700">Get to the FINISH flag as fast as you can!</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {CONTROLS.map(([key, action]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-bold text-slate-800 ring-1 ring-slate-300">
                {key}
              </kbd>
            </dt>
            <dd className="font-semibold">{action}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
