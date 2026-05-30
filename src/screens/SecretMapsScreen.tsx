import { useState } from "react";
import { difficultySettings, secretMaps } from "../data/maps";
import {
  allMainMapsComplete,
  isSecretMapAvailable,
  unlockSecretMap,
  useProgress,
} from "../store/progressStore";
import { ScreenShell } from "../components/ui/ScreenShell";
import { Button } from "../components/ui/Button";
import { ModePicker } from "../components/ui/ModePicker";
import type { ActiveMap } from "../types/nav";

interface Props {
  onBack: () => void;
  onPlaySecret: (map: ActiveMap) => void;
  onParentGate: () => void;
}

// Spec v2 §5.7
export function SecretMapsScreen({ onBack, onPlaySecret, onParentGate }: Props) {
  const progress = useProgress();
  const [notice, setNotice] = useState<string | null>(null);
  const allComplete = allMainMapsComplete();

  if (!allComplete) {
    return (
      <ScreenShell
        title="Secret Maps"
        emoji="🔒"
        gems={progress.totalGems}
        onBack={onBack}
        gradient="from-indigo-300 via-fuchsia-200 to-slate-200"
      >
        <div className="mt-10 rounded-[2rem] bg-white/80 p-8 text-center shadow-xl">
          <div className="text-6xl" aria-hidden>
            🗺️✨
          </div>
          <p className="mt-4 text-xl font-extrabold text-slate-700">
            Secret maps are hidden.
          </p>
          <p className="mt-1 font-bold text-slate-500">
            Complete all 12 main mazes to discover them.
          </p>
          <p className="mt-4 font-semibold text-fuchsia-600">
            {progress.completedMapIds.length} / 12 mazes complete
          </p>
        </div>
      </ScreenShell>
    );
  }

  function handleUnlock(id: string, cost: number, available: boolean) {
    if (!available) {
      setNotice("Complete the other 4 secret mazes first to open the Mega Mix Maze.");
      return;
    }
    if (progress.totalGems < cost) {
      setNotice("Not enough gems. Keep playing to earn more gems.");
      return;
    }
    unlockSecretMap(id);
    setNotice(null);
  }

  return (
    <ScreenShell
      title="Secret Maps"
      emoji="🌟"
      gems={progress.totalGems}
      onBack={onBack}
      gradient="from-indigo-300 via-fuchsia-200 to-amber-200"
    >
      {notice && (
        <p className="mb-3 rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-800">
          {notice}
        </p>
      )}

      <ModePicker />

      <div className="grid gap-3 sm:grid-cols-2">
        {secretMaps.map((map) => {
          const unlocked = progress.unlockedSecretMapIds.includes(map.id);
          const completed = progress.completedSecretMapIds.includes(map.id);
          const available = isSecretMapAvailable(map.id);
          const setting = difficultySettings[map.difficulty];

          return (
            <div
              key={map.id}
              className="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-md"
            >
              <span className="text-4xl" aria-hidden>
                {map.emoji}
              </span>
              <div className="flex-1">
                <p className="font-extrabold text-slate-700">{map.name}</p>
                <p className="text-sm font-bold text-slate-400">{"⭐".repeat(map.difficulty)}</p>
                {completed && <p className="text-sm font-bold text-emerald-600">✅ Complete</p>}
              </div>

              {unlocked ? (
                <Button
                  variant="success"
                  className="px-4 py-2 text-base"
                  onClick={() =>
                    onPlaySecret({
                      id: map.id,
                      name: map.name,
                      emoji: map.emoji,
                      theme: map.id,
                      difficulty: map.difficulty,
                      gemTarget: setting.gems,
                      kind: "secret",
                    })
                  }
                >
                  ▶ Play
                </Button>
              ) : (
                <Button
                  variant={available ? "primary" : "ghost"}
                  className="px-4 py-2 text-base"
                  onClick={() => handleUnlock(map.id, map.gemCost, available)}
                >
                  {available ? `${map.gemCost} 💎` : "🔒"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl bg-white/70 p-4 text-center">
        <p className="font-bold text-slate-600">Unlock faster with grown-up help</p>
        <Button variant="warn" className="mt-2" onClick={onParentGate}>
          🧑‍🍼 Ask a grown-up
        </Button>
      </div>
    </ScreenShell>
  );
}
