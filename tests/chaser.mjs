// E2E for the post-MVP difficulty modes: selects Hard, enters a maze, and
// verifies the chaser catches a stationary player and the Retry flow works.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
let failures = 0;
const errors = [];

function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 780 } });
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.addInitScript(() => {
  try {
    localStorage.removeItem("mma:progress");
  } catch {}
});

await page.goto(BASE, { waitUntil: "networkidle" });

// Choose Hard mode, then enter the first maze.
await page.getByText("▶ Play").click();
await page.getByRole("radio", { name: /Hard/ }).click();
check("Hard mode persisted", (await page.evaluate(() => JSON.parse(localStorage.getItem("mma:progress")).gameMode)) === "hard");

await page.getByRole("button", { name: /Jungle Maze/ }).click();
await page.waitForSelector("canvas", { timeout: 15000 });
check("Chaser HUD badge shown", await page.getByText("👻").first().isVisible());

// Stand still — the fast chaser should reach us.
await page.waitForSelector("text=Caught!", { timeout: 20000 });
check("Player gets caught (Hard)", await page.getByText("Caught!").isVisible());
check("No gems awarded on catch", (await page.evaluate(() => JSON.parse(localStorage.getItem("mma:progress")).totalGems)) === 0);
check("Jungle NOT marked complete on catch", (await page.evaluate(() => JSON.parse(localStorage.getItem("mma:progress")).completedMapIds.length)) === 0);

// Retry re-rolls a fresh maze.
await page.getByRole("button", { name: "🔁 Try Again" }).click();
await page.waitForSelector("canvas", { timeout: 10000 });
check("Retry returns to gameplay", (await page.locator("canvas").count()) === 1);
check("Caught overlay cleared on retry", (await page.getByText("Caught!").count()) === 0);

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
