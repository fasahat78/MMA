// Content-controlled key text (brief §15). Stages may only print labels from
// these lists — the `KeyLabel` type enforces it at compile time. Keep phrases
// playful-mysterious, never frightening. No user-generated text.

export const KEY_NAMES = [
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
  "A", "S", "D", "F", "G", "H", "J", "K", "L",
  "Z", "X", "C", "V", "B", "N", "M",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "SHIFT", "SPACE", "ENTER", "ESC", "TAB", "↑", "↓", "←", "→", "?", "!",
  // Added 2026-09-28 with the Stage 15 maze.
  "CAPS LOCK", "BACKSPACE", "DELETE", "CTRL", "ALT", "HOME", "END", "BOSS",
] as const;

export const KEYBOARD_MESSAGES = [
  "RUN",
  "KEEP GOING",
  "DON'T TURN AROUND",
  "WRONG WAY",
  "WHO PRESSED THIS?",
  "FIND THE EXIT",
  "NOT THIS KEY",
  "ESCAPE",
  "???",
  "404",
  // Draft set from Zoya's V0 play-test (2026-09-28), waiting for her OK:
  // falling keys, "why so few keys?", sprinting, and the Stage 15 boss.
  "JUMP!",
  "HOLD SHIFT",
  "ALMOST THERE",
  "TOO SLOW?",
  "OOPS",
  "NOT AGAIN",
  "TRY ME",
  "PRESS ANY KEY",
  "LOADING...",
  "CTRL+Z",
  "SO MANY KEYS",
  "BOSS KEY",
  "SNEAKY",
  "THIS WAY?",
] as const;

export type KeyName = (typeof KEY_NAMES)[number];
export type KeyboardMessage = (typeof KEYBOARD_MESSAGES)[number];
export type KeyLabel = KeyName | KeyboardMessage;
