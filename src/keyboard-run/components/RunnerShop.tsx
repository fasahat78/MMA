import { useEffect, useRef, useState } from "react";
import { runners, type Runner } from "../data/runners";
import { ownsRunner, selectedRunner, walletWins } from "../state/progress";
import { buyRunnerAndSave, chooseRunnerAndSave, useBlockDashProgress } from "../state/progressStore";

interface Props {
  onClose: () => void;
}

// Pick who you run as. Maze Mates animals in block form, bought with Wins;
// buying one puts it on straight away. Opened from the World 1 map.
export function RunnerShop({ onClose }: Props) {
  const progress = useBlockDashProgress();
  const wallet = walletWins(progress);
  const current = selectedRunner(progress);
  const [message, setMessage] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(runner: Runner): void {
    if (ownsRunner(progress, runner)) {
      chooseRunnerAndSave(runner);
      setMessage(`You're running as ${runner.name}!`);
      return;
    }
    const result = buyRunnerAndSave(runner);
    setMessage(
      result.ok
        ? `${runner.emoji} ${runner.name} is yours!`
        : `You need ${runner.cost - wallet} more Wins for ${runner.name}. Finish stages to earn them!`,
    );
  }

  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-indigo-950/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="runner-shop-title"
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="runner-shop-title" className="text-3xl font-black text-indigo-800">
            Runners
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-300 px-3 py-1.5 font-black text-amber-950 tabular-nums">🏆 {wallet}</span>
            <button
              ref={closeRef}
              onClick={onClose}
              className="btn-pop min-h-[44px] rounded-full bg-slate-100 px-4 font-extrabold text-slate-700"
              aria-label="Close runners"
            >
              ✕
            </button>
          </div>
        </div>
        <p className="mt-1 font-bold text-slate-500">Spend Wins on a new runner. You keep every runner you buy.</p>

        <p role="status" className="mt-3 min-h-7 font-extrabold text-fuchsia-600">
          {message}
        </p>

        <ul className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {runners.map((runner) => {
            const owned = ownsRunner(progress, runner);
            const chosen = runner.id === current.id;
            const affordable = wallet >= runner.cost;
            const status = chosen ? "Running" : owned ? "Choose" : `🏆 ${runner.cost}`;
            return (
              <li key={runner.id}>
                <button
                  onClick={() => pick(runner)}
                  aria-pressed={chosen}
                  aria-label={
                    chosen ? `${runner.name}, chosen` : owned ? `Choose ${runner.name}` : `Buy ${runner.name} for ${runner.cost} Wins`
                  }
                  className={`btn-pop flex w-full flex-col items-center gap-1 rounded-3xl border-b-8 p-4 transition active:translate-y-1 active:border-b-2 ${
                    chosen
                      ? "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-300"
                      : owned
                        ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                        : affordable
                          ? "border-amber-300 bg-amber-50 hover:bg-amber-100"
                          : "border-slate-200 bg-slate-50 opacity-75"
                  }`}
                >
                  <span className="text-5xl leading-none" aria-hidden>
                    {runner.emoji}
                  </span>
                  <span className="font-black text-slate-800">{runner.name}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-sm font-black tabular-nums ${
                      chosen ? "bg-emerald-500 text-white" : owned ? "bg-indigo-200 text-indigo-800" : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {status}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
