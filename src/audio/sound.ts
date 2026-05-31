// Procedural audio via the Web Audio API — no asset files, works offline.
// Cheerful chiptune blips for events + a gentle looping background melody.
// All calls are defensive: if audio is unavailable, everything no-ops.

import { defaultTrackId, getTrack, type MusicTrack } from "./tracks";

type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let soundOn = true;
let musicOn = true;

// Music scheduler state.
let musicPlaying = false;
let musicTimer: number | null = null;
let nextNoteTime = 0;
let noteIndex = 0;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.6;
      master.connect(ctx.destination);
    }
    return ctx;
  } catch {
    return null;
  }
}

// A single enveloped tone.
function tone(opts: {
  freq: number;
  start: number; // seconds relative to ctx.currentTime
  duration: number;
  type?: Wave;
  vol?: number;
  glideTo?: number; // optional pitch slide target
}) {
  const c = getCtx();
  if (!c || !master) return;
  const { freq, start, duration, type = "sine", vol = 0.2, glideTo } = opts;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function sequence(notes: { freq: number; type?: Wave; vol?: number }[], gap: number, dur: number) {
  notes.forEach((n, i) => tone({ freq: n.freq, start: i * gap, duration: dur, type: n.type, vol: n.vol }));
}

// --- Public sound effects --------------------------------------------------

export const sfx = {
  click() {
    if (!soundOn) return;
    tone({ freq: 660, start: 0, duration: 0.06, type: "triangle", vol: 0.12 });
  },
  gem() {
    if (!soundOn) return;
    // Bright two-step chirp.
    tone({ freq: 880, start: 0, duration: 0.07, type: "triangle", vol: 0.16 });
    tone({ freq: 1320, start: 0.06, duration: 0.09, type: "triangle", vol: 0.16 });
  },
  win() {
    if (!soundOn) return;
    sequence(
      [{ freq: 523.25 }, { freq: 659.25 }, { freq: 783.99 }, { freq: 1046.5 }].map((n) => ({
        ...n,
        type: "triangle" as Wave,
        vol: 0.22,
      })),
      0.12,
      0.18,
    );
  },
  unlock() {
    if (!soundOn) return;
    sequence(
      [
        { freq: 659.25, type: "triangle", vol: 0.2 },
        { freq: 987.77, type: "triangle", vol: 0.2 },
      ],
      0.1,
      0.16,
    );
  },
  shield() {
    if (!soundOn) return;
    // Rising shimmer.
    tone({ freq: 600, start: 0, duration: 0.25, type: "sine", vol: 0.18, glideTo: 1200 });
  },
  stun() {
    if (!soundOn) return;
    // Zap: square burst sliding down.
    tone({ freq: 1000, start: 0, duration: 0.18, type: "square", vol: 0.16, glideTo: 200 });
  },
  caught() {
    if (!soundOn) return;
    // Gentle "aww" descend — not scary.
    tone({ freq: 440, start: 0, duration: 0.18, type: "sawtooth", vol: 0.16, glideTo: 220 });
    tone({ freq: 330, start: 0.16, duration: 0.22, type: "sawtooth", vol: 0.14, glideTo: 180 });
  },
};

// --- Background music ------------------------------------------------------

let currentTrack: MusicTrack = getTrack(defaultTrackId);

function musicNote(freq: number, bass: number, start: number) {
  const beat = currentTrack.beat;
  if (freq > 0) tone({ freq, start, duration: beat * 0.9, type: currentTrack.wave, vol: 0.05 });
  if (bass > 0) tone({ freq: bass, start, duration: beat * 1.4, type: "sine", vol: 0.06 });
}

function scheduleMusic() {
  const c = getCtx();
  if (!c || !musicPlaying || !musicOn) return;
  // Lookahead scheduler: queue notes ~0.4s ahead of the clock.
  while (nextNoteTime < c.currentTime + 0.4) {
    const i = noteIndex % currentTrack.melody.length;
    musicNote(currentTrack.melody[i], currentTrack.bass[i], nextNoteTime - c.currentTime);
    nextNoteTime += currentTrack.beat;
    noteIndex++;
  }
  musicTimer = window.setTimeout(scheduleMusic, 90);
}

function startMusic() {
  const c = getCtx();
  if (!c || musicPlaying || !musicOn) return;
  musicPlaying = true;
  nextNoteTime = c.currentTime + 0.1;
  scheduleMusic();
}

function stopMusic() {
  musicPlaying = false;
  if (musicTimer !== null) {
    clearTimeout(musicTimer);
    musicTimer = null;
  }
}

// --- Control surface -------------------------------------------------------

export function setSoundEnabled(on: boolean) {
  soundOn = on;
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (on) {
    getCtx()?.resume?.();
    startMusic();
  } else {
    stopMusic();
  }
}

export function setMusicTrack(id: string) {
  const track = getTrack(id);
  if (track.id === currentTrack.id) return;
  currentTrack = track;
  noteIndex = 0;
  // Switch live if music is playing.
  if (musicPlaying) {
    stopMusic();
    startMusic();
  }
}

// Browsers block audio until a user gesture. Resume the context (and start
// music if enabled) on the first interaction, then stop listening.
export function attachAutoStart() {
  const kick = () => {
    getCtx()?.resume?.();
    if (musicOn) startMusic();
    window.removeEventListener("pointerdown", kick);
    window.removeEventListener("keydown", kick);
  };
  window.addEventListener("pointerdown", kick, { once: false });
  window.addEventListener("keydown", kick, { once: false });
}
