import { NUMBER_WORDS, accentStyles, bookMeta, stories } from "./data/stories";
import { StoryArt } from "./components/StoryArt";

interface Props {
  onOpenStory: (id: string) => void;
  onHome: () => void;
}

// The StoryZ library — Zoya's book, on the web.
export function StoriesHomeScreen({ onOpenStory, onHome }: Props) {
  return (
    <div className="min-h-full bg-[#FDF3E7]">
      <div className="mx-auto max-w-3xl px-5 pb-16 pt-6">
        <button
          onClick={onHome}
          className="btn-pop mb-6 min-h-[44px] rounded-2xl bg-white/70 px-4 py-2 text-sm font-extrabold text-stone-600 shadow-sm"
        >
          ← Home
        </button>

        {/* Cover */}
        <header className="rounded-[2rem] border-2 border-dashed border-orange-300 bg-[#FDEBD2] p-8 text-center">
          <div className="flex justify-center">
            <StoryArt art="rainbow" size={120} />
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight text-stone-700 sm:text-4xl">
            Zoya's Little Book
            <br />
            of Silly Stories
          </h1>
          <p className="mt-3 font-bold text-stone-500">
            Written &amp; Illustrated by {bookMeta.author}
          </p>
        </header>

        {/* Dear Reader */}
        <section className="mt-6 rounded-[2rem] border-2 border-dashed border-sky-300 bg-[#FFF7EE] p-6 text-center">
          <h2 className="text-xl font-black text-stone-700">Dear Reader</h2>
          {bookMeta.dearReader.map((p) => (
            <p key={p} className="mt-3 leading-relaxed text-stone-600">
              {p}
            </p>
          ))}
        </section>

        {/* Stories */}
        <h2 className="mb-3 mt-8 text-center text-lg font-black uppercase tracking-widest text-stone-400">
          The Stories
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {stories.map((story) => {
            const a = accentStyles[story.accent];
            return (
              <button
                key={story.id}
                onClick={() => onOpenStory(story.id)}
                className={`btn-pop flex flex-col items-center rounded-[1.75rem] ${a.card} p-6 text-center shadow-sm ring-2 ring-transparent hover:${a.ring}`}
              >
                <StoryArt art={story.art} size={92} />
                <span className={`mt-3 text-xs font-black uppercase tracking-widest ${a.chip}`}>
                  Story {NUMBER_WORDS[story.number]}
                </span>
                <span className={`mt-1 text-lg font-black leading-snug ${a.title}`}>
                  {story.title}
                </span>
                <span className="mt-3 rounded-full bg-white/70 px-4 py-1.5 text-sm font-extrabold text-stone-600">
                  Read →
                </span>
              </button>
            );
          })}
        </div>

        {/* Quote */}
        <blockquote className="mt-8 rounded-[2rem] bg-[#5B4636] p-8 text-center">
          <p className="text-lg font-bold italic leading-relaxed text-[#FDF3E7]">
            “{bookMeta.quote}”
          </p>
          <footer className="mt-3 font-bold text-orange-300">— {bookMeta.author}</footer>
        </blockquote>

        {/* About the author */}
        <section className="mt-6 rounded-[2rem] border-2 border-dashed border-orange-300 bg-[#FDEBD2] p-6 text-center">
          <h2 className="text-xl font-black text-stone-700">About the Author</h2>
          <p className="mt-3 leading-relaxed text-stone-600">{bookMeta.aboutAuthor}</p>
        </section>
      </div>
    </div>
  );
}
