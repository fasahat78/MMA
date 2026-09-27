import { economy } from "../data/economy.ts";
import type { StageDefinition } from "../types/stage";

// Block Dash progress rules — pure functions, no storage, so they're tested
// in Node. `progressStore.ts` wraps them with saving on this device.

export const PROGRESS_VERSION = 1;

export interface BlockDashProgress {
  version: number;
  wins: number;
  /** Highest stage number (1-based) that is open to play. */
  unlockedStage: number;
  /** Stage ids finished at least once. */
  completedStageIds: string[];
  /** Fastest finish per stage id, in ms. */
  bestTimes: Record<string, number>;
}

export const defaultProgress: BlockDashProgress = {
  version: PROGRESS_VERSION,
  wins: 0,
  unlockedStage: 1,
  completedStageIds: [],
  bestTimes: {},
};

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/** Turns whatever was saved into a valid save; anything broken falls back to defaults. */
export function migrateProgress(raw: unknown): BlockDashProgress {
  if (!raw || typeof raw !== "object") return { ...defaultProgress };
  const r = raw as Partial<BlockDashProgress>;
  const bestTimes: Record<string, number> = {};
  if (r.bestTimes && typeof r.bestTimes === "object") {
    for (const [id, ms] of Object.entries(r.bestTimes)) if (isCount(ms) && ms > 0) bestTimes[id] = ms;
  }
  return {
    version: PROGRESS_VERSION,
    wins: isCount(r.wins) ? Math.floor(r.wins) : 0,
    unlockedStage: isCount(r.unlockedStage) && r.unlockedStage >= 1 ? Math.floor(r.unlockedStage) : 1,
    completedStageIds: Array.isArray(r.completedStageIds) ? r.completedStageIds.filter((id): id is string => typeof id === "string") : [],
    bestTimes,
  };
}

export function isStageUnlocked(progress: BlockDashProgress, stage: Pick<StageDefinition, "stageNumber">): boolean {
  return stage.stageNumber <= progress.unlockedStage;
}

export interface FinishResult {
  progress: BlockDashProgress;
  winsEarned: number;
  isNewBest: boolean;
  firstClear: boolean;
  /** The finish opened the next stage for the first time. */
  unlockedNext: boolean;
}

/** Applies a finished run: pays Wins, records the time, opens the next stage. */
export function recordFinish(progress: BlockDashProgress, stage: StageDefinition, timeMs: number): FinishResult {
  const firstClear = !progress.completedStageIds.includes(stage.id);
  const winsEarned = firstClear || economy.winsEveryFinish ? stage.winReward : 0;
  const previousBest = progress.bestTimes[stage.id];
  const isNewBest = previousBest === undefined || timeMs < previousBest;
  const nextUnlock = Math.max(progress.unlockedStage, stage.stageNumber + 1);
  return {
    progress: {
      ...progress,
      wins: progress.wins + winsEarned,
      unlockedStage: nextUnlock,
      completedStageIds: firstClear ? [...progress.completedStageIds, stage.id] : progress.completedStageIds,
      bestTimes: isNewBest ? { ...progress.bestTimes, [stage.id]: timeMs } : progress.bestTimes,
    },
    winsEarned,
    isNewBest,
    firstClear,
    unlockedNext: nextUnlock > progress.unlockedStage,
  };
}
