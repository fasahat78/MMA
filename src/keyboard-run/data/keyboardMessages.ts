// Content-controlled key text (brief §15). Stages may only print labels from
// these lists — the `KeyLabel` type enforces it at compile time. Keep phrases
// playful-mysterious, never frightening. No user-generated text.

export const KEY_NAMES = [
  "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P",
  "A", "S", "D", "F", "G", "H", "J", "K", "L",
  "Z", "X", "C", "V", "B", "N", "M",
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "0",
  "SHIFT", "SPACE", "ENTER", "ESC", "TAB", "↑", "↓", "←", "→", "?", "!",
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
] as const;

export type KeyName = (typeof KEY_NAMES)[number];
export type KeyboardMessage = (typeof KEYBOARD_MESSAGES)[number];
export type KeyLabel = KeyName | KeyboardMessage;
