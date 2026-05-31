import type { EquippedAccessories } from "../../types/game";
import { getCharacter } from "../../data/characters";
import { getAccessory } from "../../data/accessories";

// Hybrid accessory display: the hat is "worn" on the character's head, while
// the other equipped items appear in a small loadout row beneath. This keeps
// everything visible and robust across devices (emoji-on-emoji alignment is
// inherently fuzzy, so only the hat is overlaid, with a tolerant per-character
// nudge).

type Size = "sm" | "md" | "lg";

interface SizeConfig {
  box: string;
  char: string;
  hat: string;
  chip: string;
  baseTopPct: number; // hat centre, as % from the top of the box
}

const SIZES: Record<Size, SizeConfig> = {
  sm: { box: "h-16 w-16", char: "text-4xl", hat: "text-xl", chip: "text-sm", baseTopPct: 24 },
  md: { box: "h-24 w-24", char: "text-6xl", hat: "text-3xl", chip: "text-lg", baseTopPct: 22 },
  lg: { box: "h-32 w-32", char: "text-7xl", hat: "text-4xl", chip: "text-2xl", baseTopPct: 20 },
};

// Small per-character nudges (percentage points) for where a hat sits. Tall
// heads (bunny ears, unicorn horn) push the hat up; rounder heads nudge down.
const HAT_NUDGE: Record<string, number> = {
  penguin: 0,
  bird: -2,
  bunny: -4,
  cat: 3,
  dog: 2,
  monkey: 0,
  panda: 2,
  fox: 1,
  bear: 2,
  unicorn: 2,
  robot: 1,
  explorer: -1,
};

// Categories shown in the loadout row (everything except the worn hat).
const LOADOUT_ORDER = ["glasses", "backpack", "shoes", "trail", "sparkle"] as const;

interface Props {
  characterId: string;
  equipped?: EquippedAccessories;
  size?: Size;
  showLoadout?: boolean;
}

export function CharacterAvatar({ characterId, equipped, size = "lg", showLoadout = true }: Props) {
  const character = getCharacter(characterId);
  const cfg = SIZES[size];

  const hat = equipped?.hat ? getAccessory(equipped.hat) : null;
  const hatTop = cfg.baseTopPct + (HAT_NUDGE[characterId] ?? 0);

  const loadout = equipped
    ? LOADOUT_ORDER.map((cat) => equipped[cat])
        .filter((id): id is string => Boolean(id))
        .map((id) => getAccessory(id))
        .filter((a): a is NonNullable<typeof a> => Boolean(a))
    : [];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Character + worn hat share one relative box so the hat tracks the head. */}
      <div className={`relative grid place-items-center ${cfg.box}`}>
        <span className={`${cfg.char} leading-none`} aria-hidden>
          {character?.emoji ?? "🐧"}
        </span>
        {hat && (
          <span
            className={`pointer-events-none absolute ${cfg.hat} leading-none`}
            style={{ top: `${hatTop}%`, left: "50%", transform: "translate(-50%, -50%)" }}
            aria-hidden
          >
            {hat.emoji}
          </span>
        )}
      </div>

      {showLoadout && loadout.length > 0 && (
        <div className="flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 shadow-sm">
          {loadout.map((acc) => (
            <span key={acc.id} className={cfg.chip} title={acc.name} aria-hidden>
              {acc.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
