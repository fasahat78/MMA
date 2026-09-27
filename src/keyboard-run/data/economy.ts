// Wins economy (brief §8–9). Zoya's rule: Wins double every stage. Prices
// for treadmills and teleports will rise much faster than this (her V1
// answer), so exact doubling can stay. All numbers live here, not in code.

export const economy = {
  /** Stage 1 pays this; each later stage pays double the one before. */
  firstStageWins: 1,
  /** Roblox-style: every finish pays, not just the first. */
  winsEveryFinish: true,
} as const;

/** Wins for finishing stage `stageNumber` (1-based): 1, 2, 4, 8, 16… */
export function winsForStage(stageNumber: number): number {
  return economy.firstStageWins * 2 ** (stageNumber - 1);
}
