/** 83456 → "1:23.45" — minutes, seconds, hundredths. */
export function formatRunTime(ms: number): string {
  const safe = Math.max(0, Math.floor(ms / 10));
  const hundredths = safe % 100;
  const totalSeconds = Math.floor(safe / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}
