import { gameModeList } from "../../data/modes";
import { setGameMode, useProgress } from "../../store/progressStore";

// Easy / Medium / Hard selector (post-MVP). The choice is persisted and applies
// to whichever maze you launch next.
export function ModePicker() {
  const { gameMode } = useProgress();
  const active = gameModeList.find((m) => m.id === gameMode) ?? gameModeList[0];

  return (
    <section className="mb-4 rounded-3xl bg-white/70 p-3" aria-label="Difficulty mode">
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Difficulty mode">
        {gameModeList.map((mode) => {
          const selected = mode.id === gameMode;
          return (
            <button
              key={mode.id}
              role="radio"
              aria-checked={selected}
              onClick={() => setGameMode(mode.id)}
              className={`btn-pop flex flex-col items-center rounded-2xl px-2 py-2 font-extrabold ${
                selected
                  ? "bg-fuchsia-500 text-white shadow-md"
                  : "bg-white text-slate-600 ring-2 ring-fuchsia-100"
              }`}
            >
              <span className="text-2xl" aria-hidden>
                {mode.emoji}
              </span>
              <span className="text-sm">{mode.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-sm font-semibold text-slate-500">{active.blurb}</p>
    </section>
  );
}
