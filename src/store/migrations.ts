import type { PlayerProgress } from "../types/game";
import { freeAccessoryIds } from "../data/accessories";

// Spec v2 §11 / §11.1 — versioned save with a migration shim.
// v2 added `gameMode` (Easy/Medium/Hard); v3 added per-map completed-modes.
export const SAVE_VERSION = 3;
export const SAVE_KEY = "mma:progress";

export const defaultProgress: PlayerProgress = {
  version: SAVE_VERSION,
  totalGems: 0,
  gameMode: "easy",
  selectedCharacterId: "penguin",
  unlockedCharacterIds: ["penguin"],
  unlockedAccessoryIds: [...freeAccessoryIds],
  equippedAccessories: {
    hat: "hat_cap",
    glasses: "glasses_round",
    backpack: "pack_star",
    shoes: "shoes_sneaker",
    trail: "trail_bubble",
    sparkle: "sparkle_blue",
  },
  completedMapIds: [],
  unlockedSecretMapIds: [],
  completedSecretMapIds: [],
  completedMapModes: {},
  completedSecretMapModes: {},
  soundEnabled: true,
  musicEnabled: true,
};

// Migrations run in order. Each takes an untyped blob and returns one with a
// higher version. Add new entries (keyed by the version they upgrade FROM)
// as the schema evolves — never mutate the input.
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;

const migrations: Record<number, Migration> = {
  // v1 -> v2: add the play-mode field, defaulting existing players to Easy.
  1: (data) => ({ ...data, version: 2, gameMode: "easy" }),
  // v2 -> v3: add per-map completed-modes. Mode wasn't recorded before, so
  // best-effort attribute prior completions to Easy (the original default).
  2: (data) => {
    const toEasy = (ids: unknown): Record<string, string[]> => {
      const out: Record<string, string[]> = {};
      if (Array.isArray(ids)) for (const id of ids) if (typeof id === "string") out[id] = ["easy"];
      return out;
    };
    return {
      ...data,
      version: 3,
      completedMapModes: toEasy(data.completedMapIds),
      completedSecretMapModes: toEasy(data.completedSecretMapIds),
    };
  },
};

export function migrate(raw: unknown): PlayerProgress {
  if (typeof raw !== "object" || raw === null) {
    return { ...defaultProgress };
  }

  let data = raw as Record<string, unknown>;
  let version = typeof data.version === "number" ? data.version : 0;

  while (version < SAVE_VERSION && migrations[version]) {
    data = migrations[version](data);
    version = typeof data.version === "number" ? data.version : version + 1;
  }

  // Backfill any missing keys over the defaults so newly-added fields are safe.
  const merged: PlayerProgress = {
    ...defaultProgress,
    ...(data as Partial<PlayerProgress>),
    version: SAVE_VERSION,
    // equippedAccessories is a nested object — merge it explicitly so a
    // partial stored value can't drop categories.
    equippedAccessories: {
      ...defaultProgress.equippedAccessories,
      ...((data.equippedAccessories as PlayerProgress["equippedAccessories"]) ?? {}),
    },
  };

  return merged;
}
