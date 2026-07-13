import { useState } from "react";
import { notebookPages } from "../data/stories";

// "From Zoya's Notebook" — the original handwritten pages. Tap one to read it
// full size. Images that haven't been added yet are skipped, and if none are
// present the whole section stays hidden.
export function NotebookGallery() {
  const [missing, setMissing] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);

  const available = notebookPages.filter((p) => !missing[p.id]);
  if (available.length === 0) return null;

  const openPage = notebookPages.find((p) => p.id === open);

  return (
    <section className="mt-8 rounded-[2rem] border-2 border-dashed border-pink-300 bg-[#FFF7EE] p-6">
      <h2 className="text-center text-xl font-black text-stone-700">From Zoya's Notebook</h2>
      <p className="mx-auto mt-2 max-w-md text-center text-stone-500">
        A peek at the very first pages, written and drawn by hand — before the stories became a
        book.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        {notebookPages.map((page) => (
          <button
            key={page.id}
            onClick={() => setOpen(page.id)}
            className={`btn-pop overflow-hidden rounded-2xl bg-white p-2 shadow-sm ring-2 ring-transparent hover:ring-pink-300 ${
              missing[page.id] ? "hidden" : ""
            }`}
          >
            <img
              src={page.src}
              alt={`Zoya's handwritten page: ${page.caption}`}
              loading="lazy"
              className="h-56 w-full rounded-xl object-cover object-top"
              onError={() => setMissing((m) => ({ ...m, [page.id]: true }))}
            />
            <span className="mt-2 block text-xs font-extrabold leading-snug text-stone-600">
              {page.caption}
            </span>
          </button>
        ))}
      </div>

      {/* Full-size viewer */}
      {openPage && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-stone-900/70 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-label={openPage.caption}
        >
          <div className="max-h-full w-full max-w-lg overflow-y-auto">
            <img
              src={openPage.src}
              alt={`Zoya's handwritten page: ${openPage.caption}`}
              className="w-full rounded-2xl bg-white shadow-2xl"
            />
            <button
              onClick={() => setOpen(null)}
              className="btn-pop mx-auto mt-4 block rounded-2xl bg-white px-6 py-3 font-extrabold text-stone-700 shadow"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
