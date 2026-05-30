// Win-loop E2E: solves the first maze end-to-end and verifies the full loop —
// Win screen, gems earned, save persistence, and next-map unlock.
// Uses the guarded __MMA_E2E__ seam in MazeScene to drive movement deterministically.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
let failures = 0;
const errors = [];

function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
// Reduced motion => each maze step is synchronous, so stepping is reliable.
const context = await browser.newContext({
  viewport: { width: 390, height: 780 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// Enable the test seam and start from a clean save before any app code runs.
await page.addInitScript(() => {
  window.__MMA_E2E__ = true;
  try {
    localStorage.removeItem("mma:progress");
  } catch {}
});

await page.goto(BASE, { waitUntil: "networkidle" });

// Home -> Map Select -> Jungle Maze.
await page.getByText("▶ Play").click();
await page.getByRole("button", { name: /Jungle Maze/ }).click();
await page.waitForSelector("canvas", { timeout: 15000 });

// Wait for the solver to publish the shortest path.
await page.waitForFunction(() => Array.isArray(window.__MMA_SOLUTION__) && window.__MMA_SOLUTION__.length > 0, {
  timeout: 10000,
});
const solution = await page.evaluate(() => window.__MMA_SOLUTION__);
check("Solver produced a path", Array.isArray(solution) && solution.length > 0);

// Walk the path to the exit.
for (const dir of solution) {
  await page.evaluate((d) => window.__MMA_STEP__(d), dir);
}

// Win screen appears.
await page.waitForSelector("text=Maze Complete!", { timeout: 10000 });
check("Win screen shown", await page.getByText("Maze Complete!").isVisible());
check("First-time bonus shown", await page.getByText("First-time bonus").isVisible());
check("Earned-this-run total shown", await page.getByText("Earned this run").isVisible());
check("New maze unlocked message", await page.getByText("A new maze is unlocked!").isVisible());

// Save reflects completion + gems.
const progress = await page.evaluate(() => JSON.parse(localStorage.getItem("mma:progress")));
check("Jungle marked complete in save", progress.completedMapIds.includes("jungle"));
check("Completion recorded under Easy mode", (progress.completedMapModes?.jungle ?? []).includes("easy"));
check("Gems earned (>= 70 from finish+first)", progress.totalGems >= 70);

// Next map is now unlocked in Map Select.
await page.getByRole("button", { name: "Next Maze" }).click();
await page.waitForFunction(() => Array.isArray(window.__MMA_SOLUTION__) && window.__MMA_SOLUTION__.length > 0, {
  timeout: 10000,
});
check("Next maze (Ice Cream) launched", true);

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
