import type { ReactNode } from "react";
import { Button } from "./Button";
import { GemCounter } from "./GemCounter";

interface Props {
  title: string;
  emoji?: string;
  gems?: number;
  onBack?: () => void;
  children: ReactNode;
  /** Tailwind gradient classes for the page background. */
  gradient?: string;
}

// Shared page chrome: gradient background, header with back + title + gems.
export function ScreenShell({
  title,
  emoji,
  gems,
  onBack,
  children,
  gradient = "from-sky-200 via-fuchsia-100 to-amber-100",
}: Props) {
  return (
    <div className={`min-h-full bg-gradient-to-b ${gradient}`}>
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-10 pt-5">
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button variant="ghost" onClick={onBack} aria-label="Go back" className="px-4 py-2">
                ←
              </Button>
            )}
            <h1 className="text-2xl font-black text-slate-700 drop-shadow-sm sm:text-3xl">
              {emoji && <span aria-hidden>{emoji} </span>}
              {title}
            </h1>
          </div>
          {gems !== undefined && <GemCounter gems={gems} />}
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
