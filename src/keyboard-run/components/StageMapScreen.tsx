import { world1 } from "../data/stages/world1";
import { isStageUnlocked } from "../state/progress";
import { canSaveProgress, useBlockDashProgress } from "../state/progressStore";
import { formatRunTime } from "../utils/formatTime";

interface Props {
  onPlay: (stageId: string) => void;
  onExit: () => void;
}

// World 1 map: each stage is a giant keycap. Locked stages open when the one
// before is finished. Shows Wins, the reward for each stage and best times.
export function StageMapScreen({ onPlay, onExit }: Props) {
  const progress = useBlockDashProgress();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-200 via-indigo-100 to-fuchsia-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <button
            onClick={onExit}
            className="btn-pop min-h-[44px] rounded-full bg-white/85 px-4 py-2 text-sm font-extrabold text-slate-700 shadow-md"
            aria-label="Back to VQVB home"
          >
            ← Home
          </button>
          <div
            className="rounded-full bg-amber-300 px-4 py-2 text-lg font-black text-amber-950 shadow-md tabular-nums"
            aria-label={`${progress.wins} Wins`}
          >
            🏆 {progress.wins} Wins
          </div>
        </header>

        <div className="text-center">
          <p className="text-sm font-extrabold uppercase tracking-widest text-indigo-500">Block Dash</p>
          <h1 className="text-5xl font-black text-indigo-800 drop-shadow-[0_3px_0_rgba(255,255,255,0.8)]">{world1.name}</h1>
          <p className="mt-1 font-bold text-slate-600">Finish a stage to open the next one. Harder stages pay more Wins!</p>
        </div>

        {!canSaveProgress() && (
          <p role="alert" className="rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-900">
            ⚠️ This browser isn't letting the game save, so stages you open will lock again when you close it. Turn off
            Private Browsing (or allow website data for vqvb.com) to keep your progress.
          </p>
        )}

        <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5" aria-label="Stages">
          {world1.stages.map((stage) => {
            const open = isStageUnlocked(progress, stage);
            const done = progress.completedStageIds.includes(stage.id);
            const best = progress.bestTimes[stage.id];
            return (
              <li key={stage.id}>
                <button
                  onClick={() => open && onPlay(stage.id)}
                  disabled={!open}
                  aria-label={open ? `Play stage ${stage.stageNumber}` : `Stage ${stage.stageNumber} is locked`}
                  className={`btn-pop relative flex w-full flex-col items-center gap-1 rounded-[1.75rem] border-b-[10px] p-5 text-center shadow-xl transition ${
                    open
                      ? "border-indigo-300 bg-white hover:-translate-y-0.5 hover:bg-indigo-50 active:translate-y-1 active:border-b-4"
                      : "cursor-not-allowed border-slate-300 bg-slate-100/80 opacity-70"
                  }`}
                >
                  {done && (
                    <span className="absolute -top-3 right-4 rounded-full bg-emerald-500 px-2.5 py-0.5 text-xs font-black text-white shadow">✓ Done</span>
                  )}
                  <span className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Stage</span>
                  <span className={`text-6xl font-black leading-none ${open ? "text-indigo-700" : "text-slate-400"}`}>
                    {open ? stage.stageNumber : "🔒"}
                  </span>
                  <span className="mt-2 whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-sm font-black text-amber-800">
                    🏆 +{stage.winReward} {stage.winReward === 1 ? "Win" : "Wins"}
                  </span>
                  <span className="min-h-5 text-sm font-bold text-slate-500 tabular-nums">
                    {best !== undefined ? `Best ${formatRunTime(best)}` : open ? "Not finished yet" : `Finish stage ${stage.stageNumber - 1}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
