// Spec v2 §9.1 — gem rewards. noMistakeBonus was removed (v1 contradiction).
export const gemRewards = {
  gemPickup: 1,
  finishMaze: 20,
  firstTimeCompletionBonus: 50,
  collectAllGemsBonus: 30,
  replayCompletionBonus: 5,
} as const;

export interface RunBonuses {
  finish: number;
  firstTime: number;
  collectAll: number;
  replay: number;
  pickups: number;
  total: number;
}

// Compute the gems earned for a completed run (spec v2 §9).
export function computeRunGems(params: {
  gemsCollected: number;
  totalGemsInMaze: number;
  isFirstCompletion: boolean;
}): RunBonuses {
  const { gemsCollected, totalGemsInMaze, isFirstCompletion } = params;

  const finish = gemRewards.finishMaze;
  const firstTime = isFirstCompletion ? gemRewards.firstTimeCompletionBonus : 0;
  const replay = isFirstCompletion ? 0 : gemRewards.replayCompletionBonus;
  const collectAll =
    totalGemsInMaze > 0 && gemsCollected >= totalGemsInMaze
      ? gemRewards.collectAllGemsBonus
      : 0;
  const pickups = gemsCollected * gemRewards.gemPickup;

  return {
    finish,
    firstTime,
    collectAll,
    replay,
    pickups,
    total: finish + firstTime + collectAll + replay + pickups,
  };
}
