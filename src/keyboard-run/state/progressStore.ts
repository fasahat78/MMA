import { useSyncExternalStore } from "react";
import type { StageDefinition } from "../types/stage";
import { defaultProgress, migrateProgress, recordFinish, type BlockDashProgress, type FinishResult } from "./progress";

// Saves Block Dash progress on this device (same approach as Maze Mates'
// progressStore: localStorage, versioned, immutable updates). No accounts,
// no server — brief §27/§30.

export const SAVE_KEY = "block-dash-progress";

function load(): BlockDashProgress {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    return stored ? migrateProgress(JSON.parse(stored)) : { ...defaultProgress };
  } catch {
    return { ...defaultProgress };
  }
}

let state = load();
const listeners = new Set<() => void>();

function persist(): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // Private mode or full storage: progress still works for this visit.
  }
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
  return state;
}

export function finishStage(stage: StageDefinition, timeMs: number): FinishResult {
  const result = recordFinish(state, stage, timeMs);
  state = result.progress;
  persist();
  listeners.forEach((l) => l());
  return result;
}
