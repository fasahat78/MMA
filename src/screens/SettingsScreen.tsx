import { useState } from "react";
import {
  resetProgress,
  setMusicEnabled,
  setMusicTrackId,
  setSoundEnabled,
  useProgress,
} from "../store/progressStore";
import { ScreenShell } from "../components/ui/ScreenShell";
import { Button } from "../components/ui/Button";
import { musicTracks } from "../audio/tracks";

interface Props {
  onBack: () => void;
}

function Toggle({
  label,
  emoji,
  on,
  onChange,
}: {
  label: string;
  emoji: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-md">
      <span className="text-lg font-extrabold text-slate-700">
        <span aria-hidden>{emoji} </span>
        {label}
      </span>
      <button
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`btn-pop relative h-9 w-16 rounded-full transition-colors ${
          on ? "bg-emerald-400" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${
            on ? "left-8" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

// Spec v2 §5 + acceptance #18 — reset progress lives here.
export function SettingsScreen({ onBack }: Props) {
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);

  return (
    <ScreenShell title="Settings" emoji="⚙️" gems={progress.totalGems} onBack={onBack}>
      <div className="space-y-3">
        <Toggle label="Sound" emoji="🔊" on={progress.soundEnabled} onChange={setSoundEnabled} />
        <Toggle label="Music" emoji="🎵" on={progress.musicEnabled} onChange={setMusicEnabled} />
      </div>

      {/* Background music track picker */}
      <div className="mt-4 rounded-3xl bg-white p-4 shadow-md">
        <p className="mb-1 text-lg font-extrabold text-slate-700">
          <span aria-hidden>🎶 </span>Music Track
        </p>
        {!progress.musicEnabled && (
          <p className="mb-2 text-sm font-semibold text-slate-400">Turn on Music to hear it.</p>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Music track">
          {musicTracks.map((track) => {
            const selected = progress.musicTrackId === track.id;
            return (
              <button
                key={track.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setMusicTrackId(track.id)}
                className={`btn-pop flex flex-col items-center rounded-2xl px-2 py-2 font-extrabold ${
                  selected
                    ? "bg-fuchsia-500 text-white shadow-md"
                    : "bg-white text-slate-600 ring-2 ring-fuchsia-100"
                }`}
              >
                <span className="text-2xl" aria-hidden>
                  {track.emoji}
                </span>
                <span className="text-sm">{track.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-white/70 p-5 text-center">
        <p className="font-extrabold text-slate-700">Start over?</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          This clears all gems, characters, and maze progress.
        </p>

        {confirming ? (
          <div className="mt-4 flex flex-col gap-2">
            <p className="font-bold text-rose-600">Are you sure? This cannot be undone.</p>
            <Button
              variant="warn"
              onClick={() => {
                resetProgress();
                setConfirming(false);
              }}
            >
              Yes, reset everything
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" className="mt-4" onClick={() => setConfirming(true)}>
            🗑️ Reset Progress
          </Button>
        )}
      </div>
    </ScreenShell>
  );
}
