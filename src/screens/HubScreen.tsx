import { StoryArt } from "../stories/components/StoryArt";
import { stories } from "../stories/data/stories";

interface Props {
  onPlayGame: () => void;
  onOpenStories: () => void;
  onPlayBlockDash: () => void;
}

// Site landing page: the front door to everything on vqvb.com.
export function HubScreen({ onPlayGame, onOpenStories, onPlayBlockDash }: Props) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-sky-200 via-fuchsia-100 to-amber-100">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col items-center px-6 pb-16 pt-12">
        <h1 className="pop-in text-center text-5xl font-black text-white drop-shadow-[0_3px_0_rgba(168,85,247,0.55)] sm:text-6xl">
          vqvb
        </h1>
        <p className="mt-3 text-center text-lg font-extrabold text-slate-600">
          Games and stories by Zoya ✨
        </p>

        <div className="mt-10 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Game */}
          <button
            onClick={onPlayGame}
            className="btn-pop flex flex-col items-center rounded-[2rem] bg-white/85 p-8 text-center shadow-xl ring-4 ring-transparent hover:ring-fuchsia-300"
          >
            <span className="text-6xl" aria-hidden>
              🐧
            </span>
            <span className="mt-4 text-2xl font-black text-fuchsia-700">Maze Mates</span>
            <span className="mt-1 font-bold text-slate-500">
              Race through 12 mazes, collect gems, dress up your mate.
            </span>
            <span className="mt-4 rounded-full bg-emerald-500 px-6 py-2 font-extrabold text-white">
              ▶ Play
            </span>
          </button>

          {/* Block Dash — named by Zoya */}
          <button
            onClick={onPlayBlockDash}
            className="btn-pop relative flex flex-col items-center rounded-[2rem] bg-gradient-to-b from-indigo-100 to-sky-100 p-8 text-center shadow-xl ring-4 ring-transparent hover:ring-indigo-300"
          >
            <span className="absolute right-5 top-5 rounded-full bg-fuchsia-500 px-2.5 py-0.5 text-xs font-black text-white">
              NEW
            </span>
            <span className="text-6xl" aria-hidden>
              ⌨️
            </span>
            <span className="mt-4 text-2xl font-black text-indigo-700">Block Dash</span>
            <span className="mt-1 font-bold text-slate-500">
              Run, sprint and jump across giant keys. Needs a keyboard!
            </span>
            <span className="mt-4 rounded-full bg-indigo-600 px-6 py-2 font-extrabold text-white">
              ▶ Run
            </span>
          </button>

          {/* StoryZ */}
          <button
            onClick={onOpenStories}
            className="btn-pop flex flex-col items-center rounded-[2rem] bg-[#FDEBD2] p-8 text-center shadow-xl ring-4 ring-transparent hover:ring-orange-300"
          >
            <StoryArt art="rainbow" size={72} />
            <span className="mt-4 text-2xl font-black text-stone-700">StoryZ</span>
            <span className="mt-1 font-bold text-stone-500">
              Zoya's Little Book of Silly Stories — {stories.length} stories to read.
            </span>
            <span className="mt-4 rounded-full bg-stone-700 px-6 py-2 font-extrabold text-[#FDF3E7]">
              📖 Read
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
