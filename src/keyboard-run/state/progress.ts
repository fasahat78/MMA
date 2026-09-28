import { economy } from "../data/economy.ts";
import { DEFAULT_RUNNER_ID, getRunner, runners, type Runner } from "../data/runners.ts";
import type { StageDefinition } from "../types/stage";

// Block Dash progress rules — pure functions, no storage, so they're tested
// in Node. `progressStore.ts` wraps them with saving on this device.

// v2 (2026-09-28): runners. `wins` stays the total ever earned; what's left
// to spend is derived from the runners owned, so saves from two tabs merge
// without losing Wins or runners (see progressStore.ts). Two purchases in two
// tabs at the same instant can at worst leave the wallet at 0 (clamped).
export const PROGRESS_VERSION = 2;

export interface BlockDashProgress {
  version: number;
  /** Every Win ever earned. Spend with `walletWins`, never by lowering this. */
  wins: number;
  /** Highest stage number (1-based) that is open to play. */
  unlockedStage: number;
  /** Stage ids finished at least once. */
  completedStageIds: string[];
  /** Fastest finish per stage id, in ms. */
  bestTimes: Record<string, number>;
  /** Runners bought (free ones are always owned, so they aren't listed). */
  ownedRunnerIds: string[];
  selectedRunnerId: string;
}

export const defaultProgress: BlockDashProgress = {
  version: PROGRESS_VERSION,
  wins: 0,
  unlockedStage: 1,
  completedStageIds: [],
  bestTimes: {},
  ownedRunnerIds: [],
  selectedRunnerId: DEFAULT_RUNNER_ID,
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
    ownedRunnerIds: ownedFrom(r.ownedRunnerIds),
    selectedRunnerId: typeof r.selectedRunnerId === "string" ? r.selectedRunnerId : DEFAULT_RUNNER_ID,
  };
}

/** Keeps only real, paid-for runner ids, once each. */
function ownedFrom(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const paid = new Set(runners.filter((r) => r.cost > 0).map((r) => r.id));
  return [...new Set(raw.filter((id): id is string => typeof id === "string" && paid.has(id)))];
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

// --- Runners -------------------------------------------------------------------

export function ownsRunner(progress: BlockDashProgress, runner: Runner): boolean {
  return runner.cost === 0 || progress.ownedRunnerIds.includes(runner.id);
}

/** Wins left to spend: everything earned minus what the owned runners cost. */
export function walletWins(progress: BlockDashProgress): number {
  const spent = progress.ownedRunnerIds.reduce((sum, id) => sum + getRunner(id).cost, 0);
  return Math.max(0, progress.wins - spent);
}

/** The runner to play as; falls back to the default if the choice isn't owned. */
export function selectedRunner(progress: BlockDashProgress): Runner {
  const runner = getRunner(progress.selectedRunnerId);
  return ownsRunner(progress, runner) ? runner : getRunner(DEFAULT_RUNNER_ID);
}

export type BuyResult = { ok: true; progress: BlockDashProgress } | { ok: false; reason: "owned" | "not-enough-wins" };

/** Buys a runner with Wins and puts it on straight away. */
export function buyRunner(progress: BlockDashProgress, runner: Runner): BuyResult {
  if (ownsRunner(progress, runner)) return { ok: false, reason: "owned" };
  if (walletWins(progress) < runner.cost) return { ok: false, reason: "not-enough-wins" };
  return {
    ok: true,
    progress: { ...progress, ownedRunnerIds: [...progress.ownedRunnerIds, runner.id], selectedRunnerId: runner.id },
  };
}

/** Plays as an owned runner; anything else leaves progress unchanged. */
export function chooseRunner(progress: BlockDashProgress, runner: Runner): BlockDashProgress {
  return ownsRunner(progress, runner) ? { ...progress, selectedRunnerId: runner.id } : progress;
}
