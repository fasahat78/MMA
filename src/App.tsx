import { useEffect } from "react";
import { useProgress } from "./store/progressStore";
import { attachAutoStart, setMusicEnabled, setMusicTrack, setSoundEnabled } from "./audio/sound";
import { useHashRoute } from "./router/useHashRoute";
import { HubScreen } from "./screens/HubScreen";
import { GameApp } from "./GameApp";
import { KeyboardRunScreen } from "./keyboard-run/KeyboardRunScreen";
import { StageMapScreen } from "./keyboard-run/components/StageMapScreen";
import { findStage, world1 } from "./keyboard-run/data/stages/world1";
import { isStageUnlocked } from "./keyboard-run/state/progress";
import { getBlockDashProgress } from "./keyboard-run/state/progressStore";
import { StoriesHomeScreen } from "./stories/StoriesHomeScreen";
import { StoryReaderScreen } from "./stories/StoryReaderScreen";

// Site shell. vqvb.com hosts two sections — the game and StoryZ — routed by
// hash so both are directly shareable (#/game, #/stories, #/stories/<id>).
export default function App() {
  const { path, navigate } = useHashRoute();
  const { soundEnabled, musicEnabled, musicTrackId } = useProgress();

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
  useEffect(() => {
    setMusicTrack(musicTrackId);
  }, [musicTrackId]);

  // Block Dash: #/play/block-dash is the World 1 map, #/play/block-dash/stage/<id>
  // a stage. The V0 address (#/play/keyboard-run) opens the map.
  if (path.startsWith("/play/block-dash") || path.startsWith("/play/keyboard-run")) {
    const stageId = path.match(/^\/play\/block-dash\/stage\/([\w-]+)$/)?.[1];
    const stage = stageId ? findStage(stageId) : undefined;
    // Unknown or still-locked stages fall back to the map.
    if (stage && isStageUnlocked(getBlockDashProgress(), stage)) {
      const index = world1.stages.indexOf(stage);
      const next = world1.stages[index + 1] ?? null;
      return (
        <KeyboardRunScreen
          key={stage.id}
          stage={stage}
          nextStageId={next?.id ?? null}
          onNextStage={(id) => navigate(`/play/block-dash/stage/${id}`)}
          onMap={() => navigate("/play/block-dash")}
        />
      );
    }
    return <StageMapScreen onPlay={(id) => navigate(`/play/block-dash/stage/${id}`)} onExit={() => navigate("/")} />;
  }

  if (path.startsWith("/game")) {
    return <GameApp onExitToHub={() => navigate("/")} />;
  }

  if (path.startsWith("/stories/")) {
    const storyId = path.slice("/stories/".length);
    return (
      <div className="min-h-dvh w-full">
        <StoryReaderScreen
          storyId={storyId}
          onBack={() => navigate("/stories")}
          onOpenStory={(id) => navigate(`/stories/${id}`)}
        />
      </div>
    );
  }

  if (path.startsWith("/stories")) {
    return (
      <div className="min-h-dvh w-full">
        <StoriesHomeScreen
          onOpenStory={(id) => navigate(`/stories/${id}`)}
          onHome={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-dvh w-full">
      <HubScreen
        onPlayGame={() => navigate("/game")}
        onOpenStories={() => navigate("/stories")}
        onPlayBlockDash={() => navigate("/play/block-dash")}
      />
    </div>
  );
}
