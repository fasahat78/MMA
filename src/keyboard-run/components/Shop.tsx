import { useEffect, useRef, useState } from "react";
import { runners, type Runner } from "../data/runners";
import { nextTeleportPrice, ownsRunner, selectedRunner, teleportCharges, walletWins } from "../state/progress";
import { buyRunnerAndSave, buyTeleportAndSave, chooseRunnerAndSave, useBlockDashProgress } from "../state/progressStore";

interface Props {
  onClose: () => void;
}

// The Block Dash shop, opened from the World 1 map. Teleports (each one
// pricier than the last) and runners: Maze Mates animals in block form.
// Buying a runner puts it on straight away.
export function Shop({ onClose }: Props) {
  const progress = useBlockDashProgress();
  const wallet = walletWins(progress);
  const current = selectedRunner(progress);
  const teleportPrice = nextTeleportPrice(progress);
  const teleports = teleportCharges(progress);
  const [message, setMessage] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function buyTeleport(): void {
    const result = buyTeleportAndSave();
    setMessage(
      result.ok
        ? "⚡ Teleport bought! Press T (or tap ⚡) in a run to jump to the next checkpoint."
        : `You need ${teleportPrice - wallet} more Wins for a teleport.`,
    );
  }

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
        aria-labelledby="shop-title"
        className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-[2rem] bg-white p-5 shadow-2xl sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="shop-title" className="text-3xl font-black text-indigo-800">
            Shop
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-300 px-3 py-1.5 font-black text-amber-950 tabular-nums">🏆 {wallet}</span>
            <button
              ref={closeRef}
              onClick={onClose}
              className="btn-pop min-h-[44px] rounded-full bg-slate-100 px-4 font-extrabold text-slate-700"
              aria-label="Close shop"
            >
              ✕
            </button>
          </div>
        </div>
        <p role="status" className="mt-2 min-h-7 font-extrabold text-fuchsia-600">
          {message}
        </p>

        <section aria-labelledby="teleports-title" className="mt-2 flex flex-wrap items-center gap-4 rounded-3xl bg-violet-50 p-4">
          <span className="text-5xl leading-none" aria-hidden>
            ⚡
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="teleports-title" className="text-xl font-black text-violet-800">
              Teleports <span className="text-base font-extrabold text-violet-500">· you have {teleports}</span>
            </h3>
            <p className="text-sm font-bold text-slate-500">Jump to the next checkpoint in a run. Each one costs 3× the last!</p>
          </div>
          <button
            onClick={buyTeleport}
            aria-label={`Buy a teleport for ${teleportPrice} Wins`}
            className={`btn-pop min-h-[44px] rounded-full border-b-4 px-5 py-2 font-black tabular-nums active:translate-y-0.5 active:border-b-2 ${
              wallet >= teleportPrice ? "border-violet-700 bg-violet-500 text-white" : "border-slate-300 bg-slate-100 text-slate-500"
            }`}
          >
            Buy · 🏆 {teleportPrice}
          </button>
        </section>

        <h3 className="mt-5 text-xl font-black text-indigo-800">Runners</h3>
        <p className="font-bold text-slate-500">You keep every runner you buy.</p>
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
