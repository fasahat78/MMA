import { useState } from "react";
import { NUMBER_WORDS, accentStyles, getStory, stories } from "./data/stories";
import { StoryArt } from "./components/StoryArt";

interface Props {
  storyId: string;
  onBack: () => void;
  onOpenStory: (id: string) => void;
}

// A story, read like the book: a title page, then the story page.
export function StoryReaderScreen({ storyId, onBack, onOpenStory }: Props) {
  const story = getStory(storyId);
  const [page, setPage] = useState(0);

  if (!story) {
    return (
      <div className="grid min-h-full place-items-center bg-[#FDF3E7] p-8 text-center">
        <div>
          <p className="text-xl font-black text-stone-700">Story not found.</p>
          <button
            onClick={onBack}
            className="btn-pop mt-4 rounded-2xl bg-white px-5 py-3 font-extrabold text-stone-600 shadow"
          >
            ← Back to stories
          </button>
        </div>
      </div>
    );
  }

  const a = accentStyles[story.accent];
  const index = stories.findIndex((s) => s.id === story.id);
  const nextStory = stories[index + 1];
  const isTitlePage = page === 0;

  return (
    <div className="min-h-full bg-[#FDF3E7]">
      <div className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <button
          onClick={onBack}
          className="btn-pop mb-5 min-h-[44px] rounded-2xl bg-white/70 px-4 py-2 text-sm font-extrabold text-stone-600 shadow-sm"
        >
          ← All stories
        </button>

        {isTitlePage ? (
          // Title page
          <div
            className={`rounded-[2rem] border-2 border-dashed ${a.ring} ${a.card} p-10 text-center`}
          >
            <div className="flex justify-center">
              <StoryArt art={story.art} size={120} />
            </div>
            <p className={`mt-5 text-xs font-black uppercase tracking-[0.2em] ${a.chip}`}>
              Story {NUMBER_WORDS[story.number]}
            </p>
            <h1 className={`mt-2 text-2xl font-black leading-snug sm:text-3xl ${a.title}`}>
              {story.title}
            </h1>
          </div>
        ) : (
          // Story page
          <article className="rounded-[2rem] border-2 border-dashed border-orange-300 bg-[#FFF7EE] p-6 sm:p-8">
            <div className="mb-4 flex items-center gap-3">
              <StoryArt art={story.art} size={56} />
              <h1 className={`text-xl font-black leading-snug ${a.title}`}>{story.title}</h1>
            </div>

            <div className="space-y-4">
              {story.blocks.map((block, i) =>
                block.kind === "highlight" ? (
                  <p
                    key={i}
                    className={`rounded-2xl ${a.panel} p-5 text-lg leading-relaxed text-stone-700`}
                  >
                    {block.text}
                  </p>
                ) : block.kind === "closing" ? (
                  <p
                    key={i}
                    className="pt-2 text-center text-lg font-bold leading-relaxed text-stone-700"
                  >
                    {block.text}
                  </p>
                ) : (
                  <p key={i} className="text-lg leading-relaxed text-stone-600">
                    {block.text}
                  </p>
                ),
              )}
            </div>

            <p className="mt-8 text-center text-sm font-bold text-stone-400">The End 🌟</p>
          </article>
        )}

        {/* Pager */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setPage(0)}
            disabled={isTitlePage}
            className="btn-pop min-h-[48px] rounded-2xl bg-white px-5 py-3 font-extrabold text-stone-600 shadow disabled:opacity-40"
          >
            ← Back
          </button>

          <span className="text-sm font-bold text-stone-400">{isTitlePage ? "1 / 2" : "2 / 2"}</span>

          {isTitlePage ? (
            <button
              onClick={() => setPage(1)}
              className="btn-pop min-h-[48px] rounded-2xl bg-stone-700 px-6 py-3 font-extrabold text-[#FDF3E7] shadow"
            >
              Read the story →
            </button>
          ) : nextStory ? (
            <button
              onClick={() => {
                setPage(0);
                onOpenStory(nextStory.id);
              }}
              className="btn-pop min-h-[48px] rounded-2xl bg-stone-700 px-5 py-3 font-extrabold text-[#FDF3E7] shadow"
            >
              Next story →
            </button>
          ) : (
            <button
              onClick={onBack}
              className="btn-pop min-h-[48px] rounded-2xl bg-stone-700 px-5 py-3 font-extrabold text-[#FDF3E7] shadow"
            >
              Finish 🎉
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
