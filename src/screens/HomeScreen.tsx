import type { Screen } from "../types/game";
import { useProgress } from "../store/progressStore";
import { getCharacter } from "../data/characters";
import { Button } from "../components/ui/Button";
import { GemCounter } from "../components/ui/GemCounter";
import { CharacterAvatar } from "../components/ui/CharacterAvatar";

interface Props {
  onNavigate: (screen: Screen) => void;
  onPlay: () => void;
}

// Spec v2 §5.1
export function HomeScreen({ onNavigate, onPlay }: Props) {
  const progress = useProgress();
  const character = getCharacter(progress.selectedCharacterId);

  return (
    <div className="min-h-full bg-gradient-to-b from-sky-300 via-fuchsia-200 to-amber-200">
      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center px-6 pb-12 pt-10">
        <div className="mb-2 self-end">
          <GemCounter gems={progress.totalGems} />
        </div>

        <h1 className="pop-in mt-4 text-center text-5xl font-black leading-tight text-white drop-shadow-[0_3px_0_rgba(168,85,247,0.6)] sm:text-6xl">
          Maze Mates
          <br />
          <span className="text-amber-300">Adventure</span>
        </h1>

        <div className="pop-in my-8 flex flex-col items-center">
          <div className="grid place-items-center rounded-[2rem] bg-white/70 p-4 shadow-xl">
            <CharacterAvatar
              characterId={progress.selectedCharacterId}
              equipped={progress.equippedAccessories}
              size="lg"
            />
          </div>
          <p className="mt-3 text-xl font-extrabold text-slate-700">{character?.name ?? "Penguin"}</p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          <Button variant="success" className="text-2xl" onClick={onPlay}>
            ▶ Play
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("characters")}>
            🐾 Characters
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("accessories")}>
            🎒 Accessories
          </Button>
          <Button variant="secondary" onClick={() => onNavigate("secretMaps")}>
            🗺️ Secret Maps
          </Button>
          <Button variant="ghost" onClick={() => onNavigate("settings")}>
            ⚙️ Settings
          </Button>
        </div>
      </div>
    </div>
  );
}
