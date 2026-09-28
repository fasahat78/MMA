// Wins economy (brief §8–9). Zoya's rule: Wins double every stage. Prices
// for treadmills and teleports will rise much faster than this (her V1
// answer), so exact doubling can stay. All numbers live here, not in code.

export const economy = {
  /** Stage 1 pays this; each later stage pays double the one before. */
  firstStageWins: 1,
  /** Roblox-style: every finish pays, not just the first. */
  winsEveryFinish: true,
} as const;

/**
 * Runner prices in Wins. Stages 1–5 pay 31 in total, 1–10 pay 1,023 and
 * 1–14 pay 16,383, so the top animals take a few runs of the late stages.
 */
export const runnerPrices = {
  penguin: 0,
  bird: 3,
  bunny: 6,
  cat: 12,
  dog: 12,
  monkey: 30,
  panda: 60,
  fox: 120,
  bear: 250,
  unicorn: 1000,
  robot: 2500,
  explorer: 8000,
} as const;

/** Wins for finishing stage `stageNumber` (1-based): 1, 2, 4, 8, 16… */
export function winsForStage(stageNumber: number): number {
  return economy.firstStageWins * 2 ** (stageNumber - 1);
}
