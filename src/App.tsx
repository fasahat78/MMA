import { useEffect } from "react";
import { useProgress } from "./store/progressStore";
import { attachAutoStart, setMusicEnabled, setMusicTrack, setSoundEnabled } from "./audio/sound";
import { useHashRoute } from "./router/useHashRoute";
import { HubScreen } from "./screens/HubScreen";
import { GameApp } from "./GameApp";
import { KeyboardRunScreen } from "./keyboard-run/KeyboardRunScreen";
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

  // Keyboard Run V0 (3D, keyboard-first).
  if (path.startsWith("/play/keyboard-run")) {
    return <KeyboardRunScreen onExit={() => navigate("/")} />;
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
        onPlayKeyboardRun={() => navigate("/play/keyboard-run")}
      />
    </div>
  );
}
