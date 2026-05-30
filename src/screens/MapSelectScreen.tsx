import { mainMaps, difficultySettings } from "../data/maps";
import {
  isMainMapCompleted,
  isMapUnlocked,
  mainMapCompletedModes,
  useProgress,
} from "../store/progressStore";
import { ScreenShell } from "../components/ui/ScreenShell";
import { ModePicker } from "../components/ui/ModePicker";
import { ModeBadges } from "../components/ui/ModeBadges";
import type { ActiveMap } from "../types/nav";

interface Props {
  onBack: () => void;
  onSelectMap: (map: ActiveMap) => void;
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-sm" aria-label={`Difficulty ${count} of 7`}>
      {"⭐".repeat(count)}
    </span>
  );
}

// Spec v2 §5.2
export function MapSelectScreen({ onBack, onSelectMap }: Props) {
  const progress = useProgress();

  return (
    <ScreenShell title="Choose a Maze" emoji="🗺️" gems={progress.totalGems} onBack={onBack}>
      <ModePicker />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {mainMaps.map((map) => {
          const unlocked = isMapUnlocked(map.id);
          const completed = isMainMapCompleted(map.id);
          const completedModes = mainMapCompletedModes(map.id);
          const setting = difficultySettings[map.difficulty];

          return (
            <button
              key={map.id}
              disabled={!unlocked}
              onClick={() =>
                onSelectMap({
                  id: map.id,
                  name: map.name,
                  emoji: map.emoji,
                  theme: map.theme,
                  difficulty: map.difficulty,
                  gemTarget: setting.gems,
                  kind: "main",
                })
              }
              className={`btn-pop relative flex aspect-square flex-col items-center justify-center rounded-3xl p-3 text-center shadow-md ${
                unlocked
                  ? "bg-white hover:bg-fuchsia-50"
                  : "cursor-not-allowed bg-slate-200/80"
              }`}
            >
              {completed && (
                <span className="absolute right-2 top-2 text-lg" aria-label="Completed">
                  ✅
                </span>
              )}
              {!unlocked && (
                <span className="absolute right-2 top-2 text-lg" aria-hidden>
                  🔒
                </span>
              )}
              <span className={`text-4xl ${unlocked ? "" : "opacity-40 grayscale"}`} aria-hidden>
                {map.emoji}
              </span>
              <span className="mt-1 text-sm font-extrabold text-slate-700">{map.name}</span>
              {unlocked ? (
                <>
                  <Stars count={map.difficulty} />
                  {completed && <ModeBadges completedModes={completedModes} className="mt-1" />}
                </>
              ) : (
                <span className="mt-1 text-[11px] font-semibold leading-tight text-slate-500">
                  Complete the previous maze to unlock.
                </span>
              )}
            </button>
          );
        })}
      </div>
    </ScreenShell>
  );
}
