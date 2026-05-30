// E2E for power-ups: walk onto a shield and a stun (via the E2E seam) and
// verify the invulnerability / stun HUD countdowns activate.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
let failures = 0;
const errors = [];

function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
// Reduced motion => steps are synchronous, so we can walk a path instantly.
const context = await browser.newContext({
  viewport: { width: 390, height: 780 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

// Pin a maze seed so the walk-to-power-up path is deterministic (won't
// accidentally cross the exit on some random layouts).
await page.addInitScript(() => {
  window.__MMA_E2E__ = true;
  window.__MMA_SEED__ = 4242;
  try {
    localStorage.removeItem("mma:progress");
  } catch {}
});

await page.goto(BASE, { waitUntil: "networkidle" });

// Medium mode (slow chaser, generous grace) so we can reach a power-up safely.
await page.getByText("▶ Play").click();
await page.getByRole("radio", { name: /Medium/ }).click();
await page.getByRole("button", { name: /Jungle Maze/ }).click();
await page.waitForSelector("canvas", { timeout: 15000 });
await page.waitForFunction(() => window.__MMA_POWERUPS__ && window.__MMA_PATHTO__, { timeout: 10000 });

const powerups = await page.evaluate(() => window.__MMA_POWERUPS__);
check("Shield placed in maze", powerups.shields.length >= 1);
check("Stun placed in maze", powerups.stuns.length >= 1);

async function walkTo(cell) {
  const path = await page.evaluate((c) => window.__MMA_PATHTO__(c.r, c.c), cell);
  for (const dir of path) {
    await page.evaluate((d) => window.__MMA_STEP__(d), dir);
  }
}

// Walk onto the shield -> invulnerability countdown appears.
await walkTo(powerups.shields[0]);
await page.waitForSelector("text=/🛡️\\s*\\d+s/", { timeout: 5000 });
check("Shield (invulnerability) HUD active", await page.getByText(/🛡️\s*\d+s/).isVisible());

// Walk onto the stun -> chaser-stun countdown appears.
await walkTo(powerups.stuns[0]);
await page.waitForSelector("text=/⚡\\s*\\d+s/", { timeout: 5000 });
check("Stun HUD active", await page.getByText(/⚡\s*\d+s/).isVisible());

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
