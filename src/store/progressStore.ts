import { useSyncExternalStore } from "react";
import type { AccessoryCategory, GameMode, PlayerProgress } from "../types/game";
import { SAVE_KEY, defaultProgress, migrate } from "./migrations";
import { getCharacter } from "../data/characters";
import { getAccessory } from "../data/accessories";
import { mainMaps, secretMaps } from "../data/maps";

// Single source of truth for all player progress (spec v2 §12.1).
// Immutable updates only — every setter produces a new object (coding-style §Immutability).

function loadProgress(): PlayerProgress {
  try {
    const stored = localStorage.getItem(SAVE_KEY);
    if (!stored) return { ...defaultProgress };
    return migrate(JSON.parse(stored));
  } catch {
    return { ...defaultProgress };
  }
}

let state: PlayerProgress = loadProgress();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode / quota). The in-memory
    // state still works for the session; we simply skip persistence.
  }
}

// Write the (possibly migrated) state back immediately, so an upgraded save
// is durable even if the player never changes anything this session.
persist();

function setState(next: PlayerProgress) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): PlayerProgress {
  return state;
}

export function useProgress(): PlayerProgress {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getProgress(): PlayerProgress {
  return state;
}

// --- Derived helpers -------------------------------------------------------

export function isMapUnlocked(mapId: string): boolean {
  const index = mainMaps.findIndex((m) => m.id === mapId);
  if (index <= 0) return true; // first map (jungle) is always unlocked
  const previous = mainMaps[index - 1];
  return state.completedMapIds.includes(previous.id);
}

export function allMainMapsComplete(): boolean {
  return mainMaps.every((m) => state.completedMapIds.includes(m.id));
}

export function isSecretMapAvailable(secretMapId: string): boolean {
  if (!allMainMapsComplete()) return false;
  const map = secretMaps.find((m) => m.id === secretMapId);
  if (!map) return false;
  if (map.requirement === "complete_all_other_secret_maps") {
    const others = secretMaps.filter((m) => m.id !== secretMapId);
    return others.every((m) => state.completedSecretMapIds.includes(m.id));
  }
  return true;
}

export function nextMainMapId(currentMapId: string): string | null {
  const index = mainMaps.findIndex((m) => m.id === currentMapId);
  if (index === -1 || index >= mainMaps.length - 1) return null;
  return mainMaps[index + 1].id;
}

// --- Mutations (immutable) -------------------------------------------------

export function addGems(amount: number) {
  setState({ ...state, totalGems: state.totalGems + amount });
}

export function spendGems(amount: number): boolean {
  if (state.totalGems < amount) return false;
  setState({ ...state, totalGems: state.totalGems - amount });
  return true;
}

// Immutably add `mode` to a map's completed-modes list, in canonical order.
function withMode(
  record: Record<string, GameMode[]>,
  mapId: string,
  mode: GameMode,
): Record<string, GameMode[]> {
  const order: GameMode[] = ["easy", "medium", "hard"];
  const current = record[mapId] ?? [];
  if (current.includes(mode)) return record;
  const next = [...current, mode].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { ...record, [mapId]: next };
}

export function completeMainMap(mapId: string, earnedGems: number) {
  const alreadyComplete = state.completedMapIds.includes(mapId);
  setState({
    ...state,
    totalGems: state.totalGems + earnedGems,
    completedMapIds: alreadyComplete
      ? state.completedMapIds
      : [...state.completedMapIds, mapId],
    completedMapModes: withMode(state.completedMapModes, mapId, state.gameMode),
  });
}

export function completeSecretMap(mapId: string, earnedGems: number) {
  const alreadyComplete = state.completedSecretMapIds.includes(mapId);
  setState({
    ...state,
    totalGems: state.totalGems + earnedGems,
    completedSecretMapIds: alreadyComplete
      ? state.completedSecretMapIds
      : [...state.completedSecretMapIds, mapId],
    completedSecretMapModes: withMode(state.completedSecretMapModes, mapId, state.gameMode),
  });
}

export function isMainMapCompleted(mapId: string): boolean {
  return state.completedMapIds.includes(mapId);
}

export function mainMapCompletedModes(mapId: string): GameMode[] {
  return state.completedMapModes[mapId] ?? [];
}

export function secretMapCompletedModes(mapId: string): GameMode[] {
  return state.completedSecretMapModes[mapId] ?? [];
}

export function unlockCharacter(characterId: string): boolean {
  const character = getCharacter(characterId);
  if (!character) return false;
  if (state.unlockedCharacterIds.includes(characterId)) return true;
  if (state.totalGems < character.gemCost) return false;
  setState({
    ...state,
    totalGems: state.totalGems - character.gemCost,
    unlockedCharacterIds: [...state.unlockedCharacterIds, characterId],
  });
  return true;
}

export function selectCharacter(characterId: string) {
  if (!state.unlockedCharacterIds.includes(characterId)) return;
  setState({ ...state, selectedCharacterId: characterId });
}

export function unlockAccessory(accessoryId: string): boolean {
  const accessory = getAccessory(accessoryId);
  if (!accessory) return false;
  if (state.unlockedAccessoryIds.includes(accessoryId)) return true;
  if (state.totalGems < accessory.gemCost) return false;
  setState({
    ...state,
    totalGems: state.totalGems - accessory.gemCost,
    unlockedAccessoryIds: [...state.unlockedAccessoryIds, accessoryId],
  });
  return true;
}

// Equip one accessory per category (spec v2 §11). Passing null unequips.
export function equipAccessory(category: AccessoryCategory, accessoryId: string | null) {
  if (accessoryId && !state.unlockedAccessoryIds.includes(accessoryId)) return;
  setState({
    ...state,
    equippedAccessories: { ...state.equippedAccessories, [category]: accessoryId },
  });
}

export function unlockSecretMap(secretMapId: string): boolean {
  const map = secretMaps.find((m) => m.id === secretMapId);
  if (!map) return false;
  if (state.unlockedSecretMapIds.includes(secretMapId)) return true;
  if (!isSecretMapAvailable(secretMapId)) return false;
  if (state.totalGems < map.gemCost) return false;
  setState({
    ...state,
    totalGems: state.totalGems - map.gemCost,
    unlockedSecretMapIds: [...state.unlockedSecretMapIds, secretMapId],
  });
  return true;
}

export function setGameMode(mode: GameMode) {
  setState({ ...state, gameMode: mode });
}

export function setSoundEnabled(enabled: boolean) {
  setState({ ...state, soundEnabled: enabled });
}

export function setMusicEnabled(enabled: boolean) {
  setState({ ...state, musicEnabled: enabled });
}

// Mock premium grants (spec v2 §15) — applied after the Parent Gate.
export function grantGems(amount: number) {
  addGems(amount);
}

export function grantCharacter(characterId: string) {
  if (state.unlockedCharacterIds.includes(characterId)) return;
  setState({
    ...state,
    unlockedCharacterIds: [...state.unlockedCharacterIds, characterId],
  });
}

export function grantSecretMap(secretMapId: string) {
  if (state.unlockedSecretMapIds.includes(secretMapId)) return;
  setState({
    ...state,
    unlockedSecretMapIds: [...state.unlockedSecretMapIds, secretMapId],
  });
}

export function resetProgress() {
  setState({
    ...defaultProgress,
    equippedAccessories: { ...defaultProgress.equippedAccessories },
    completedMapModes: {},
    completedSecretMapModes: {},
  });
}
