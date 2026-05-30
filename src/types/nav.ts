import type { RunBonuses } from "../data/gems";

export interface ActiveMap {
  id: string;
  name: string;
  emoji: string;
  theme: string;
  difficulty: number;
  gemTarget: number;
  kind: "main" | "secret";
}

export interface WinPayload {
  mapName: string;
  emoji: string;
  kind: "main" | "secret";
  bonuses: RunBonuses;
  totalGems: number;
  nextMapId: string | null;
  unlockedSecretMapsNow: boolean;
}
