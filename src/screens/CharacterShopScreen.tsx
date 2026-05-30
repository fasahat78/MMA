import { useState } from "react";
import { characters, rarityStyles } from "../data/characters";
import { selectCharacter, unlockCharacter, useProgress } from "../store/progressStore";
import { ScreenShell } from "../components/ui/ScreenShell";
import { Button } from "../components/ui/Button";

interface Props {
  onBack: () => void;
  onParentGate: () => void;
}

// Spec v2 §5.5
export function CharacterShopScreen({ onBack, onParentGate }: Props) {
  const progress = useProgress();
  const [notice, setNotice] = useState<string | null>(null);

  function handleUnlock(id: string, cost: number) {
    if (progress.totalGems < cost) {
      setNotice("Not enough gems. Collect more gems in mazes.");
      return;
    }
    unlockCharacter(id);
    setNotice(null);
  }

  return (
    <ScreenShell title="Characters" emoji="🐾" gems={progress.totalGems} onBack={onBack}>
      {notice && (
        <p className="mb-3 rounded-2xl bg-amber-100 px-4 py-3 text-center font-bold text-amber-800">
          {notice}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {characters.map((char) => {
          const unlocked = progress.unlockedCharacterIds.includes(char.id);
          const selected = progress.selectedCharacterId === char.id;
          const rarity = rarityStyles[char.rarity];

          return (
            <div
              key={char.id}
              className={`flex flex-col items-center rounded-3xl bg-white p-3 text-center shadow-md ring-4 ${
                selected ? "ring-fuchsia-400" : "ring-transparent"
              }`}
            >
              <span className={`text-5xl ${unlocked ? "" : "opacity-40 grayscale"}`} aria-hidden>
                {char.emoji}
              </span>
              <span className="mt-1 font-extrabold text-slate-700">{char.name}</span>
              <span className={`mt-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${rarity.chip}`}>
                {rarity.label}
              </span>

              {unlocked ? (
                <Button
                  variant={selected ? "ghost" : "primary"}
                  className="mt-2 w-full px-3 py-2 text-base"
                  disabled={selected}
                  onClick={() => selectCharacter(char.id)}
                >
                  {selected ? "Selected" : "Select"}
                </Button>
              ) : (
                <Button
                  variant="success"
                  className="mt-2 w-full px-3 py-2 text-base"
                  onClick={() => handleUnlock(char.id, char.gemCost)}
                >
                  {char.gemCost} 💎
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl bg-white/70 p-4 text-center">
        <p className="font-bold text-slate-600">Want to unlock faster?</p>
        <Button variant="warn" className="mt-2" onClick={onParentGate}>
          🧑‍🍼 Ask a grown-up to unlock faster
        </Button>
      </div>
    </ScreenShell>
  );
}
