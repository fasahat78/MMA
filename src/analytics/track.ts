import { track as vercelTrack } from "@vercel/analytics";

// Thin wrapper around Vercel Web Analytics custom events. No-ops on localhost
// (dev/preview/tests) so it never logs or errors there, and is best-effort in
// production so analytics can never break gameplay.
type EventProps = Record<string, string | number | boolean | null>;

const isLocalhost =
  typeof window !== "undefined" &&
  /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?)/.test(window.location.hostname);

export function track(name: string, props?: EventProps) {
  if (isLocalhost) return;
  try {
    vercelTrack(name, props);
  } catch {
    // ignore — analytics is non-critical
  }
}
