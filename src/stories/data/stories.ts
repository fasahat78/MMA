// "Zoya's Little Book of Silly Stories" — written & illustrated by Zoya Feroze.
// Text transcribed from the book; each story keeps the book's structure of
// plain paragraphs plus a tinted "highlight" panel for the punchline.

export type ArtKey = "cat" | "basketball" | "bird" | "fridge" | "rainbow";

export type Accent = "peach" | "blue" | "purple" | "green";

export type StoryBlock =
  | { kind: "text"; text: string }
  | { kind: "highlight"; text: string }
  | { kind: "closing"; text: string };

export interface Story {
  id: string;
  number: number;
  title: string;
  art: ArtKey;
  accent: Accent;
  blocks: StoryBlock[];
}

// Tailwind classes per accent, echoing the printed book's palette.
export const accentStyles: Record<
  Accent,
  { card: string; chip: string; title: string; panel: string; ring: string }
> = {
  peach: {
    card: "bg-orange-100",
    chip: "text-orange-500",
    title: "text-stone-700",
    panel: "bg-orange-100/70",
    ring: "ring-orange-300",
  },
  blue: {
    card: "bg-sky-100",
    chip: "text-sky-600",
    title: "text-slate-600",
    panel: "bg-sky-100/70",
    ring: "ring-sky-300",
  },
  purple: {
    card: "bg-violet-100",
    chip: "text-violet-500",
    title: "text-violet-800",
    panel: "bg-violet-100/70",
    ring: "ring-violet-300",
  },
  green: {
    card: "bg-emerald-100",
    chip: "text-emerald-600",
    title: "text-emerald-800",
    panel: "bg-emerald-100/70",
    ring: "ring-emerald-300",
  },
};

export const stories: Story[] = [
  {
    id: "cat",
    number: 1,
    title: "The Cat That Loves to Eat",
    art: "cat",
    accent: "peach",
    blocks: [
      {
        kind: "text",
        text: 'There once was a cat who loved to eat. He loved food so much that he would sneak into the pantry whenever nobody was looking — and every day he ate more and more, until he grew rounder and rounder. "I am so full!" said the cat.',
      },
      {
        kind: "text",
        text: "One day, his owner caught him and locked the pantry door. But the clever (and very determined) cat found another way in.",
      },
      {
        kind: "highlight",
        text: "The next morning, the owner opened the pantry… and it was completely empty! There were wrappers everywhere. The owner was sooooo mad at the cat.",
      },
    ],
  },
  {
    id: "basketball",
    number: 2,
    title: "The Basketball That Bounced By Itself",
    art: "basketball",
    accent: "blue",
    blocks: [
      {
        kind: "text",
        text: "Some high school kids were playing basketball when something strange happened — the ball started bouncing all by itself! Everybody was amazed. It dribbled and scored without anyone touching it at all.",
      },
      {
        kind: "highlight",
        text: "But the kids stopped playing, because the ball was doing everything for them — and soon they lost the match.",
      },
      {
        kind: "text",
        text: "Then, just as suddenly as it began, the spell disappeared. The children never used that strange basketball again.",
      },
    ],
  },
  {
    id: "bird",
    number: 3,
    title: "The Bird That Looked Ugly",
    art: "bird",
    accent: "purple",
    blocks: [
      {
        kind: "text",
        text: "A little bird thought he was ugly, and he wished he looked different. So he visited a salon and tried on wig after wig after wig — but none of them felt right.",
      },
      {
        kind: "highlight",
        text: 'Sad, the bird decided to give up. "Come back tomorrow," said the kind salon owner.',
      },
      {
        kind: "text",
        text: 'The next day, the bird returned. The salon owner smiled and said, "Just be yourself."',
      },
      {
        kind: "closing",
        text: "So the bird went outside exactly as he was — and everyone loved him. The bird felt very, very happy.",
      },
    ],
  },
  {
    id: "fridge",
    number: 4,
    title: "The Fridge That Ate Its Own Food",
    art: "fridge",
    accent: "green",
    blocks: [
      {
        kind: "text",
        text: "A girl put some food inside her fridge and went away. When she came back and opened the fridge… it was completely empty!",
      },
      {
        kind: "text",
        text: "Then she noticed something strange: the fridge had eyes. And a mouth! It had eaten its own food.",
      },
      {
        kind: "highlight",
        text: "She quickly snapped a picture, and soon it went viral — everyone wanted to see the fridge that ate its own food.",
      },
    ],
  },
];

export const NUMBER_WORDS = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX"];

export const bookMeta = {
  title: "Zoya's Little Book of Silly Stories",
  author: "Zoya Feroze",
  tagline: "A collection of silly and magical stories.",
  dearReader: [
    "These are stories imagined by a young storyteller named Zoya. Some are funny, some are magical, and some have little lessons hidden inside.",
    "Open the book and let your imagination bounce, fly, and eat all the snacks!",
  ],
  aboutAuthor:
    "Zoya Feroze loves making up funny stories about animals, magical objects, and silly adventures. This is her first book — and there are many more stories still waiting inside her imagination.",
  quote:
    "Imagination can turn a cat into a snack thief and a fridge into an internet celebrity.",
};

export function getStory(id: string): Story | undefined {
  return stories.find((s) => s.id === id);
}
