// E2E for the site hub + StoryZ section: hub routes to both sections, the
// story library lists Zoya's stories, and a story reads end-to-end.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
let failures = 0;
const errors = [];

function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// Hub is the site landing page.
await page.goto(BASE, { waitUntil: "networkidle" });
check("Hub shows both sections", (await page.getByText("Maze Mates").isVisible()) && (await page.getByText("StoryZ").isVisible()));

// Hub -> StoryZ
await page.getByText("📖 Read").click();
await page.getByText("Dear Reader").waitFor({ timeout: 10000 });
check("Story library opens", await page.getByText("Zoya's Little Book").isVisible());
check("Dear Reader shown", await page.getByText("Dear Reader").isVisible());
check("All 4 stories listed", (await page.locator("button:has-text('Read →')").count()) === 4);
check("About the author shown", await page.getByText("About the Author").isVisible());

// Open a story -> title page, then the story text.
// .first() because the notebook thumbnails share the same captions.
await page.getByRole("button", { name: /The Cat That Loves to Eat/ }).first().click();
check("Story route is shareable", page.url().includes("#/stories/cat"));
check("Title page shows", await page.getByText("STORY ONE").isVisible());
await page.getByRole("button", { name: /Read the story/ }).click();
check("Story text shows", await page.getByText(/There once was a cat who loved to eat/).isVisible());
check("Punchline shows", await page.getByText(/wrappers everywhere/).isVisible());
check("The End shown", await page.getByText(/The End/).isVisible());

// Next story chains through the book.
await page.getByRole("button", { name: /Next story/ }).click();
check("Next story opens", page.url().includes("#/stories/basketball"));

// Deep link straight to a story works (what you'd send to family).
await page.goto(BASE + "#/stories/fridge", { waitUntil: "networkidle" });
check("Deep link to a story works", await page.getByText("The Fridge That Ate Its Own Food").first().isVisible());

// Hub -> game still works.
await page.goto(BASE, { waitUntil: "networkidle" });
await page.getByText("▶ Play").click();
check("Hub routes into the game", await page.getByText("Maze Mates").first().isVisible());

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
