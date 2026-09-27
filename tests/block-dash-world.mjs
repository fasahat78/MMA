// Block Dash World 1 flow for a brand-new player: the map, locked stages,
// finishing Stage 1, Wins, "Next stage", and progress surviving a reload.
// Needs a server like tests/keyboard-run.mjs:
//   npm run build && npm run preview -- --port 4317
//   npm run test:block-dash-world
import { chromium } from "playwright";
import { world1 } from "../src/keyboard-run/data/stages/world1.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const errors = [];
let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// One context = one "device": tabs in it share saved progress.
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await context.addInitScript(() => {
  window.__KR_E2E__ = true;
});

/** Waits (briefly) for something to appear — screens render just after a click. */
const shows = (locator) => locator.first().waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
const heading = () => page.getByRole("heading", { name: "World 1" });
const winsBadge = (n) => page.getByLabel(`${n} Wins`);

// Brand-new player.
await page.goto(BASE);
await page.getByRole("button", { name: /Block Dash/ }).click();
check("Card opens the World 1 map", await shows(heading()));
check("New player has 0 Wins", await shows(winsBadge(0)));
check("Stage 1 is open", await page.getByRole("button", { name: "Play stage 1" }).isEnabled());
const lockedCount = await page.getByRole("button", { name: /Stage \d is locked/ }).count();
check("Stages 2–5 are locked", lockedCount === 4, `${lockedCount} locked`);
check("Map shows the Wins each stage pays", (await page.getByText("+16 Wins").isVisible()) && (await page.getByText("+1 Win").isVisible()));

// A locked stage's address goes back to the map.
await page.goto(BASE + "#/play/block-dash/stage/w1-s4");
check("Locked stage link falls back to the map", (await heading().isVisible()) && (await page.locator("canvas").count()) === 0);

// Finish Stage 1 (teleport near the ENTER key, then run through the line).
await page.getByRole("button", { name: "Play stage 1" }).click();
await page.waitForFunction(() => !!window.__KR__, null, { timeout: 30000 });
check("Stage 1 loads", await page.getByText("World 1 · Stage 1").isVisible());
const s1 = world1.stages[0];
const fin = s1.obstacles.find((o) => o.id === "finish");
const floor = fin.position[1] - fin.size[1] / 2;
await page.keyboard.down("KeyW");
await page.waitForFunction(() => window.__KR__.state().runTimeMs > 0, null, { timeout: 30000 });
await page.evaluate((f) => window.__KR__.teleport(f), [fin.position[0], floor, fin.position[2] - 2.5]);
await page.waitForFunction(() => window.__KR__.state().finished, null, { timeout: 30000 });
await page.keyboard.up("KeyW");
check("Finish panel shows Stage 1 done", await shows(page.getByRole("dialog", { name: "Finished" }).getByText("Stage 1 done!")));
check("Finishing Stage 1 pays 1 Win", await page.getByText("+1 Win").isVisible());
check("Finish announces Stage 2 is open", await page.getByText("Stage 2 is open!").isVisible());

// Enter = Next stage.
await page.keyboard.press("Enter");
await page.waitForFunction(() => location.hash.endsWith("/stage/w1-s2"), null, { timeout: 10000 }).catch(() => {});
await page.waitForFunction(() => !!window.__KR__ && window.__KR__.state().runTimeMs === 0, null, { timeout: 30000 }).catch(() => {});
check("Enter goes to Stage 2", page.url().endsWith("#/play/block-dash/stage/w1-s2") && (await page.getByText("World 1 · Stage 2").isVisible()));

// Back to the map: progress shows.
await page.getByRole("button", { name: "Back to the World 1 map" }).click();
check("Map now shows 1 Win", await shows(winsBadge(1)));
check("Stage 1 is marked done with a best time", (await shows(page.getByText("✓ Done"))) && (await page.getByText("✓ Done").count()) === 1 && (await page.getByText(/^Best \d:\d\d\.\d\d$/).count()) === 1);
check("Stage 2 is open, 3 still locked", (await page.getByRole("button", { name: "Play stage 2" }).isEnabled()) && (await page.getByRole("button", { name: /Stage \d is locked/ }).count()) === 3);

// Progress survives a reload.
await page.reload();
check("Progress is saved after reloading", (await shows(winsBadge(1))) && (await page.getByRole("button", { name: "Play stage 2" }).isEnabled()));

// Bug fix: a map left open in another tab updates when a stage is finished
// elsewhere (Zoya: "finished stage 1 but 2 is still locked").
const otherTab = await context.newPage();
await otherTab.goto(BASE + "#/play/block-dash");
await otherTab.getByRole("heading", { name: "World 1" }).waitFor();
const lockedBefore = await otherTab.getByRole("button", { name: /Stage \d is locked/ }).count();
await page.goto(BASE + "#/play/block-dash/stage/w1-s2");
await page.waitForFunction(() => !!window.__KR__, null, { timeout: 30000 });
const s2 = world1.stages[1];
const fin2 = s2.obstacles.find((o) => o.id === "finish");
await page.keyboard.down("KeyW");
await page.waitForFunction(() => window.__KR__.state().runTimeMs > 0, null, { timeout: 30000 });
await page.evaluate((f) => window.__KR__.teleport(f), [fin2.position[0], fin2.position[1] - fin2.size[1] / 2, fin2.position[2] - fin2.size[2] / 2 - 1]);
await page.waitForFunction(() => window.__KR__.state().finished, null, { timeout: 30000 });
await page.keyboard.up("KeyW");
const updated = await otherTab
  .getByRole("button", { name: "Play stage 3" })
  .waitFor({ timeout: 5000 })
  .then(() => true, () => false);
check("A map open in another tab unlocks Stage 3 without reloading", lockedBefore === 3 && updated, `locked before: ${lockedBefore}`);
check("Stepping onto the ENTER key finishes (whole key is the finish line)", await shows(page.getByRole("dialog", { name: "Finished" })));
await otherTab.close();

check("No console errors", errors.length === 0, errors.join(" | "));
await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll Block Dash World 1 checks passed");
process.exit(failures ? 1 : 0);
