// Background music tracks (all synthesized, no asset files). Each track is a
// short looping melody + bassline. Melody and bass arrays are the same length;
// 0 means a rest.

export interface MusicTrack {
  id: string;
  name: string;
  emoji: string;
  beat: number; // seconds per step
  wave: OscillatorType; // melody timbre (bass is always sine)
  melody: number[];
  bass: number[];
}

// Note frequencies (Hz). R = rest.
const C3 = 130.81;
const E3 = 164.81;
const F3 = 174.61;
const G3 = 196.0;
const A2 = 110.0;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;
const F5 = 698.46;
const G5 = 783.99;
const A5 = 880.0;
const R = 0;

export const musicTracks: MusicTrack[] = [
  {
    id: "bubblegum",
    name: "Bubblegum",
    emoji: "🍬",
    beat: 0.36,
    wave: "triangle",
    melody: [C5, E5, G5, A5, G5, E5, D5, E5],
    bass: [C3, R, G3, R, F3, R, G3, R],
  },
  {
    id: "adventure",
    name: "Adventure",
    emoji: "🗺️",
    beat: 0.27,
    wave: "triangle",
    melody: [G4, C5, E5, G5, E5, C5, D5, G4, A4, D5, F5, A5, G5, E5, C5, D5],
    bass: [C3, R, G3, R, F3, R, G3, R, F3, R, C3, R, G3, R, G3, R],
  },
  {
    id: "sleepy",
    name: "Sleepy",
    emoji: "🌙",
    beat: 0.55,
    wave: "sine",
    melody: [C5, E5, G5, E5, F5, E5, D5, C5],
    bass: [C3, R, R, R, G3, R, R, R],
  },
  {
    id: "space",
    name: "Space",
    emoji: "🚀",
    beat: 0.42,
    wave: "sine",
    melody: [A4, C5, D5, E5, G5, E5, D5, C5],
    bass: [A2, R, E3, R, F3, R, E3, R],
  },
  {
    id: "disco",
    name: "Disco",
    emoji: "🪩",
    beat: 0.22,
    wave: "triangle",
    melody: [C5, R, E5, G5, R, E5, C5, R, D5, R, F5, A5, R, F5, D5, R],
    bass: [C3, C3, R, C3, G3, R, G3, R, F3, F3, R, F3, G3, R, G3, R],
  },
];

export const defaultTrackId = "bubblegum";

export function getTrack(id: string): MusicTrack {
  return musicTracks.find((t) => t.id === id) ?? musicTracks[0];
}
