import { useCallback, useEffect, useState } from "react";

// Minimal hash router (no dependency). The site now has two sections, and
// hash routes make them shareable: #/game, #/stories, #/stories/<id>.
function normalize(hash: string): string {
  const path = hash.replace(/^#/, "");
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

export function useHashRoute(): { path: string; navigate: (path: string) => void } {
  const [path, setPath] = useState(() => normalize(window.location.hash));

  useEffect(() => {
    const onChange = () => setPath(normalize(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((next: string) => {
    window.location.hash = next;
    // Reading a story / entering a game should start at the top.
    window.scrollTo(0, 0);
  }, []);

  return { path, navigate };
}
