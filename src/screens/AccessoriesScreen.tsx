import { useState } from "react";
import { accessoriesByCategory, categoryLabels, categoryOrder } from "../data/accessories";
import { getCharacter } from "../data/characters";
import { equipAccessory, unlockAccessory, useProgress } from "../store/progressStore";
import { ScreenShell } from "../components/ui/ScreenShell";
import { Button } from "../components/ui/Button";
import { sfx } from "../audio/sound";

interface Props {
  onBack: () => void;
}

// Spec v2 §5.6 — one equipped accessory per category.
export function AccessoriesScreen({ onBack }: Props) {
  const progress = useProgress();
  const character = getCharacter(progress.selectedCharacterId);
  const [notice, setNotice] = useState<string | null>(null);

  function handleUnlock(id: string, cost: number) {
    if (progress.totalGems < cost) {
      setNotice("Not enough gems. Collect more gems in mazes.");
      return;
    }
    if (unlockAccessory(id)) sfx.unlock();
    setNotice(null);
  }

  return (
    <ScreenShell title="Accessories" emoji="🎒" gems={progress.totalGems} onBack={onBack}>
      <div className="mb-4 flex items-center gap-3 rounded-3xl bg-white/70 p-3">
        <span className="text-4xl" aria-hidden>
          {character?.emoji ?? "🐧"}
        </span>
        <p className="font-extrabold text-slate-700">
          Dressing up {character?.name ?? "Penguin"}
        </p>
      </div>

      {notice && (
        <p className="mb-3 rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-800">
          {notice}
        </p>
      )}

      <div className="space-y-5">
        {categoryOrder.map((category) => {
          const equippedId = progress.equippedAccessories[category];
          return (
            <section key={category}>
              <h2 className="mb-2 text-lg font-black text-slate-600">{categoryLabels[category]}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {accessoriesByCategory(category).map((acc) => {
                  const unlocked = progress.unlockedAccessoryIds.includes(acc.id);
                  const equipped = equippedId === acc.id;

                  return (
                    <div
                      key={acc.id}
                      className={`flex flex-col items-center rounded-3xl bg-white p-3 text-center shadow-md ring-4 ${
                        equipped ? "ring-fuchsia-400" : "ring-transparent"
                      }`}
                    >
                      <span className={`text-4xl ${unlocked ? "" : "opacity-40 grayscale"}`} aria-hidden>
                        {acc.emoji}
                      </span>
                      <span className="mt-1 text-sm font-extrabold text-slate-700">{acc.name}</span>

                      {unlocked ? (
                        equipped ? (
                          <Button
                            variant="ghost"
                            className="mt-2 w-full px-2 py-2 text-sm"
                            onClick={() => equipAccessory(category, null)}
                          >
                            Take off
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            className="mt-2 w-full px-2 py-2 text-sm"
                            onClick={() => equipAccessory(category, acc.id)}
                          >
                            Equip
                          </Button>
                        )
                      ) : (
                        <Button
                          variant="success"
                          className="mt-2 w-full px-2 py-2 text-sm"
                          onClick={() => handleUnlock(acc.id, acc.gemCost)}
                        >
                          {acc.gemCost} 💎
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </ScreenShell>
  );
}
