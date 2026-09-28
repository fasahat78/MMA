import { useSyncExternalStore } from "react";
import type { StageDefinition } from "../types/stage";
import type { Runner } from "../data/runners";
import {
  buyRunner,
  chooseRunner,
  defaultProgress,
  migrateProgress,
  recordFinish,
  type BlockDashProgress,
  type BuyResult,
  type FinishResult,
} from "./progress";

// Saves Block Dash progress on this device (same approach as Maze Mates'
// progressStore: localStorage, versioned, immutable updates). No accounts,
// no server — brief §27/§30.
//
// Other tabs of the site can finish stages too, so the saved copy is re-read
// when another tab writes it and whenever this page comes back into view —
// otherwise a map left open in one tab keeps showing stages as locked.

export const SAVE_KEY = "block-dash-progress";

function read(): BlockDashProgress {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    return stored ? migrateProgress(JSON.parse(stored)) : { ...defaultProgress };
  } catch {
    return { ...defaultProgress };
  }
}

/** Can this browser keep progress? (Not in some private modes or with site data blocked.) */
function probeStorage(): boolean {
  try {
    const probe = `${SAVE_KEY}-probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

let state = read();
let savingWorks = typeof window !== "undefined" && probeStorage();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function persist(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    savingWorks = true;
  } catch {
    // Private mode or full storage: progress still works for this visit.
    savingWorks = false;
  }
}

/**
 * Combines this tab's progress with the saved copy, keeping the best of both.
 * `wins` is the total ever earned and only grows; spending comes from the
 * owned runners, so the union of both copies is always right. The runner
 * choice follows this tab.
 */
function merge(a: BlockDashProgress, b: BlockDashProgress): BlockDashProgress {
  const bestTimes = { ...a.bestTimes };
  for (const [id, ms] of Object.entries(b.bestTimes)) bestTimes[id] = Math.min(bestTimes[id] ?? Infinity, ms);
  return {
    version: a.version,
    wins: Math.max(a.wins, b.wins),
    unlockedStage: Math.max(a.unlockedStage, b.unlockedStage),
    completedStageIds: [...new Set([...a.completedStageIds, ...b.completedStageIds])],
    bestTimes,
    ownedRunnerIds: [...new Set([...a.ownedRunnerIds, ...b.ownedRunnerIds])],
    selectedRunnerId: a.selectedRunnerId,
  };
}

/** Picks up progress saved by another tab, without losing this tab's own. */
function refreshFromStorage(): void {
  const merged = merge(state, read());
  if (JSON.stringify(merged) === JSON.stringify(state)) return;
  state = merged;
  emit();
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === SAVE_KEY || e.key === null) refreshFromStorage();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshFromStorage();
  });
  window.addEventListener("pageshow", refreshFromStorage);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => state;

export function useBlockDashProgress(): BlockDashProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getBlockDashProgress(): BlockDashProgress {
  refreshFromStorage();
  return state;
}

/** False when the browser won't let the site save (progress lasts only this visit). */
export function canSaveProgress(): boolean {
  return savingWorks;
}

export function finishStage(stage: StageDefinition, timeMs: number): FinishResult {
  refreshFromStorage();
  const result = recordFinish(state, stage, timeMs);
  state = result.progress;
  persist();
  emit();
  return result;
}

function commit(next: BlockDashProgress): void {
  state = next;
  persist();
  emit();
}

export function buyRunnerAndSave(runner: Runner): BuyResult {
  refreshFromStorage();
  const result = buyRunner(state, runner);
  if (result.ok) commit(result.progress);
  return result;
}

export function chooseRunnerAndSave(runner: Runner): void {
  refreshFromStorage();
  const next = chooseRunner(state, runner);
  if (next !== state) commit(next);
}
