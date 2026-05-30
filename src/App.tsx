import { useEffect, useState } from "react";
import type { Screen } from "./types/game";
import type { ActiveMap, WinPayload } from "./types/nav";
import { difficultySettings, getMainMap, getSecretMap } from "./data/maps";
import { useProgress } from "./store/progressStore";
import { attachAutoStart, setMusicEnabled, setSoundEnabled } from "./audio/sound";
import { HomeScreen } from "./screens/HomeScreen";
import { MapSelectScreen } from "./screens/MapSelectScreen";
import { GameScreen } from "./screens/GameScreen";
import { WinScreen } from "./screens/WinScreen";
import { CharacterShopScreen } from "./screens/CharacterShopScreen";
import { AccessoriesScreen } from "./screens/AccessoriesScreen";
import { SecretMapsScreen } from "./screens/SecretMapsScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ParentGateScreen } from "./screens/ParentGateScreen";

// Central navigation. Keeps the active run + last win result in React state
// (the store holds persistent progress; this holds ephemeral UI flow).
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeMap, setActiveMap] = useState<ActiveMap | null>(null);
  const [winPayload, setWinPayload] = useState<WinPayload | null>(null);
  const [showParentGate, setShowParentGate] = useState(false);
  const { soundEnabled, musicEnabled } = useProgress();

  // Web Audio is blocked until a gesture — arm it once on mount.
  useEffect(() => {
    attachAutoStart();
  }, []);

  // Keep the audio engine in sync with the persisted Settings toggles.
  useEffect(() => {
    setSoundEnabled(soundEnabled);
  }, [soundEnabled]);
  useEffect(() => {
    setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  function play(map: ActiveMap) {
    setActiveMap(map);
    setScreen("game");
  }

  function handleWin(payload: WinPayload) {
    setWinPayload(payload);
    setScreen("win");
  }

  function playNextMain() {
    if (!winPayload?.nextMapId) return;
    const map = getMainMap(winPayload.nextMapId);
    if (!map) return;
    play({
      id: map.id,
      name: map.name,
      emoji: map.emoji,
      theme: map.theme,
      difficulty: map.difficulty,
      gemTarget: difficultySettings[map.difficulty].gems,
      kind: "main",
    });
  }

  function replayActive() {
    if (!activeMap) return;
    // Re-mount GameScreen with a fresh maze for the same map.
    play({ ...activeMap });
    setScreen("game");
  }

  // Rebuild ActiveMap for a secret map id (used if needed by replay flows).
  function secretMapToActive(id: string): ActiveMap | null {
    const map = getSecretMap(id);
    if (!map) return null;
    return {
      id: map.id,
      name: map.name,
      emoji: map.emoji,
      theme: map.id,
      difficulty: map.difficulty,
      gemTarget: difficultySettings[map.difficulty].gems,
      kind: "secret",
    };
  }

  return (
    <div className="h-dvh w-full overflow-y-auto">
      {screen === "home" && (
        <HomeScreen onNavigate={setScreen} onPlay={() => setScreen("mapSelect")} />
      )}

      {screen === "mapSelect" && (
        <MapSelectScreen onBack={() => setScreen("home")} onSelectMap={play} />
      )}

      {screen === "game" && activeMap && (
        <GameScreen
          activeMap={activeMap}
          onWin={handleWin}
          onExit={() => setScreen(activeMap.kind === "secret" ? "secretMaps" : "mapSelect")}
        />
      )}

      {screen === "win" && winPayload && (
        <WinScreen
          payload={winPayload}
          onNextMaze={playNextMain}
          onReplay={replayActive}
          onMapSelect={() => setScreen(winPayload.kind === "secret" ? "secretMaps" : "mapSelect")}
          onCharacterShop={() => setScreen("characters")}
        />
      )}

      {screen === "characters" && (
        <CharacterShopScreen
          onBack={() => setScreen("home")}
          onParentGate={() => setShowParentGate(true)}
        />
      )}

      {screen === "accessories" && <AccessoriesScreen onBack={() => setScreen("home")} />}

      {screen === "secretMaps" && (
        <SecretMapsScreen
          onBack={() => setScreen("home")}
          onPlaySecret={(map) => play(secretMapToActive(map.id) ?? map)}
          onParentGate={() => setShowParentGate(true)}
        />
      )}

      {screen === "settings" && <SettingsScreen onBack={() => setScreen("home")} />}

      {showParentGate && <ParentGateScreen onClose={() => setShowParentGate(false)} />}
    </div>
  );
}
