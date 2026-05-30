import type { GameMode } from "../../types/game";
import { gameModeList } from "../../data/modes";

interface Props {
  completedModes: GameMode[];
  className?: string;
}

// Three pips (Easy/Medium/Hard) showing which modes a map was cleared in.
// Lit = completed in that mode; dim = not yet. All three lit = "all modes".
export function ModeBadges({ completedModes, className = "" }: Props) {
  const all = completedModes.length === gameModeList.length;
  const label = all
    ? "Completed in all modes"
    : `Completed in: ${completedModes.join(", ") || "none yet"}`;

  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label={label} title={label}>
      {gameModeList.map((mode) => {
        const done = completedModes.includes(mode.id);
        return (
          <span
            key={mode.id}
            aria-hidden
            className={`text-sm leading-none ${done ? "" : "opacity-25 grayscale"}`}
          >
            {mode.emoji}
          </span>
        );
      })}
      {all && (
        <span aria-hidden className="ml-0.5 text-sm leading-none">
          🏆
        </span>
      )}
    </div>
  );
}
