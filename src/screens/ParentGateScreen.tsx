import { useState } from "react";
import { premiumOptions } from "../data/accessories";
import { characters } from "../data/characters";
import { secretMaps } from "../data/maps";
import {
  grantCharacter,
  grantGems,
  grantSecretMap,
  isSecretMapAvailable,
  useProgress,
} from "../store/progressStore";
import { Button } from "../components/ui/Button";
import { sfx } from "../audio/sound";

interface Props {
  onClose: () => void;
}

type Phase = "gate" | "options" | "pickCharacter" | "pickSecretMap" | "done";

// Spec v2 §5.8 + §15 — mock safety gate, then a clearly-fake purchase. No real
// money, no pressure language.
export function ParentGateScreen({ onClose }: Props) {
  const progress = useProgress();
  const [phase, setPhase] = useState<Phase>("gate");
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState("");

  function submitGate() {
    if (entry.trim().toLowerCase() === "parent") {
      setError(null);
      setPhase("options");
    } else {
      setError("Please type the word PARENT to continue.");
    }
  }

  function chooseOption(id: string) {
    if (id === "small_gem_pack") {
      grantGems(500);
      finish("500 gems added! (This was a demo — no money was charged.)");
    } else if (id === "character_unlock") {
      setPhase("pickCharacter");
    } else if (id === "secret_map_unlock") {
      setPhase("pickSecretMap");
    }
  }

  function finish(message: string) {
    sfx.unlock();
    setDoneMessage(message);
    setPhase("done");
  }

  const lockedCharacters = characters.filter(
    (c) => !progress.unlockedCharacterIds.includes(c.id),
  );
  const lockableSecretMaps = secretMaps.filter(
    (m) => !progress.unlockedSecretMapIds.includes(m.id) && isSecretMapAvailable(m.id),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="pop-in w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl">
        {phase === "gate" && (
          <div className="text-center">
            <div className="text-5xl" aria-hidden>
              🧑‍🍼
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-700">Ask a grown-up</h2>
            <p className="mt-2 font-semibold text-slate-500">
              Ask a grown-up before unlocking premium items.
            </p>
            <label className="mt-4 block text-left font-bold text-slate-600" htmlFor="parent-gate">
              Type the word <span className="text-fuchsia-600">PARENT</span> to continue:
            </label>
            <input
              id="parent-gate"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGate()}
              autoComplete="off"
              className="mt-2 w-full rounded-2xl border-4 border-fuchsia-200 px-4 py-3 text-center text-xl font-extrabold uppercase tracking-widest outline-none focus:border-fuchsia-400"
              placeholder="PARENT"
            />
            {error && <p className="mt-2 font-bold text-rose-500">{error}</p>}
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="primary" onClick={submitGate}>
                Continue
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {phase === "options" && (
          <div>
            <h2 className="text-center text-2xl font-black text-slate-700">Demo Shop</h2>
            <p className="mt-1 text-center font-semibold text-emerald-600">
              This is a demo. No real money will be charged.
            </p>
            <div className="mt-4 space-y-3">
              {premiumOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => chooseOption(opt.id)}
                  className="btn-pop flex w-full items-center justify-between rounded-3xl bg-fuchsia-50 px-4 py-3 text-left ring-2 ring-fuchsia-200"
                >
                  <span>
                    <span className="block font-extrabold text-slate-700">{opt.name}</span>
                    <span className="block text-sm font-semibold text-slate-500">
                      {opt.description}
                    </span>
                  </span>
                  <span className="rounded-full bg-fuchsia-500 px-3 py-1 font-black text-white">
                    {opt.mockPrice}
                  </span>
                </button>
              ))}
            </div>
            <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        )}

        {phase === "pickCharacter" && (
          <PickList
            title="Choose a character to unlock"
            emptyText="You have unlocked every character already!"
            items={lockedCharacters.map((c) => ({ id: c.id, label: c.name, emoji: c.emoji }))}
            onPick={(id) => {
              grantCharacter(id);
              const name = characters.find((c) => c.id === id)?.name ?? "Character";
              finish(`${name} unlocked! (Demo — no money was charged.)`);
            }}
            onClose={onClose}
          />
        )}

        {phase === "pickSecretMap" && (
          <PickList
            title="Choose a secret map to unlock"
            emptyText="No secret maps are available yet. Finish all 12 main mazes first."
            items={lockableSecretMaps.map((m) => ({ id: m.id, label: m.name, emoji: m.emoji }))}
            onPick={(id) => {
              grantSecretMap(id);
              const name = secretMaps.find((m) => m.id === id)?.name ?? "Secret map";
              finish(`${name} unlocked! (Demo — no money was charged.)`);
            }}
            onClose={onClose}
          />
        )}

        {phase === "done" && (
          <div className="text-center">
            <div className="text-5xl" aria-hidden>
              🎉
            </div>
            <h2 className="mt-2 text-2xl font-black text-emerald-600">All done!</h2>
            <p className="mt-2 font-semibold text-slate-600">{doneMessage}</p>
            <Button variant="primary" className="mt-5 w-full" onClick={onClose}>
              Yay!
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function PickList({
  title,
  emptyText,
  items,
  onPick,
  onClose,
}: {
  title: string;
  emptyText: string;
  items: { id: string; label: string; emoji: string }[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div>
      <h2 className="text-center text-xl font-black text-slate-700">{title}</h2>
      <p className="mt-1 text-center text-sm font-semibold text-emerald-600">
        This is a demo. No real money will be charged.
      </p>
      {items.length === 0 ? (
        <p className="mt-4 text-center font-bold text-slate-500">{emptyText}</p>
      ) : (
        <div className="mt-4 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onPick(item.id)}
              className="btn-pop flex flex-col items-center rounded-2xl bg-fuchsia-50 p-3 ring-2 ring-fuchsia-200"
            >
              <span className="text-3xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="mt-1 text-sm font-extrabold text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
      )}
      <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}
