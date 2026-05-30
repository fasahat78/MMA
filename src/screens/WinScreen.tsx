import type { WinPayload } from "../types/nav";
import { Button } from "../components/ui/Button";

interface Props {
  payload: WinPayload;
  onNextMaze: () => void;
  onReplay: () => void;
  onMapSelect: () => void;
  onCharacterShop: () => void;
}

function BonusRow({ label, value }: { label: string; value: number }) {
  if (value <= 0) return null;
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-2">
      <span className="font-bold text-slate-600">{label}</span>
      <span className="font-extrabold text-fuchsia-700">+{value} 💎</span>
    </div>
  );
}

// Spec v2 §5.4 — handles the final-map and secret-map messaging.
export function WinScreen({ payload, onNextMaze, onReplay, onMapSelect, onCharacterShop }: Props) {
  const { bonuses } = payload;

  const message = payload.unlockedSecretMapsNow
    ? "You finished all 12 mazes! Secret maps are now unlocked! 🗺️"
    : payload.kind === "secret"
      ? "Secret maze complete! 🌟"
      : payload.nextMapId
        ? "A new maze is unlocked!"
        : "Great job!";

  return (
    <div className="min-h-full bg-gradient-to-b from-amber-200 via-fuchsia-200 to-sky-200">
      <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-6 py-10">
        <div className="pop-in w-full rounded-[2rem] bg-white/80 p-6 text-center shadow-2xl">
          <div className="text-6xl" aria-hidden>
            {payload.emoji}
          </div>
          <h1 className="mt-2 text-3xl font-black text-fuchsia-700">Maze Complete!</h1>
          <p className="mt-1 text-lg font-bold text-slate-600">{payload.mapName}</p>

          <div className="mt-5 space-y-2 text-left">
            <BonusRow label="Gems collected" value={bonuses.pickups} />
            <BonusRow label="Finish bonus" value={bonuses.finish} />
            <BonusRow label="First-time bonus" value={bonuses.firstTime} />
            <BonusRow label="Collect-all bonus" value={bonuses.collectAll} />
            <BonusRow label="Replay bonus" value={bonuses.replay} />
            <div className="flex items-center justify-between rounded-2xl bg-fuchsia-500 px-4 py-3 text-white">
              <span className="text-lg font-extrabold">Earned this run</span>
              <span className="text-lg font-black">+{bonuses.total} 💎</span>
            </div>
          </div>

          <p className="mt-4 text-base font-bold text-emerald-600">{message}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Total gems: {payload.totalGems.toLocaleString()} 💎
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {payload.nextMapId && (
              <Button variant="success" onClick={onNextMaze}>
                ▶ Next Maze
              </Button>
            )}
            <Button variant="secondary" onClick={onReplay}>
              🔁 Replay
            </Button>
            <Button variant="secondary" onClick={onMapSelect}>
              🗺️ Map Select
            </Button>
            <Button variant="ghost" onClick={onCharacterShop}>
              🐾 Character Shop
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
