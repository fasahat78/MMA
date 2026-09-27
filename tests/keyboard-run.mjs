// Headless browser test for Keyboard Run V0 — the brief's §37 definition of
// done. Expects a server on BASE_URL (default http://localhost:4317/):
//   npm run build && npm run preview -- --port 4317
//   npm run test:keyboard-run
// Uses the `window.__KR_E2E__` seam to read game state and teleport.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const ROUTE = BASE + "#/play/keyboard-run";
const errors = [];
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// Software WebGL so the test runs on machines/CI without a GPU.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.addInitScript(() => {
  window.__KR_E2E__ = true;
});

const state = () => page.evaluate(() => window.__KR__.state());
const teleport = (feet) => page.evaluate((f) => window.__KR__.teleport(f), feet);
const waitReady = () => page.waitForFunction(() => !!window.__KR__, null, { timeout: 30000 });
const timerText = () => page.getByRole("timer").innerText();
/** Waits (in game terms, not wall-clock) until the state matches. */
async function until(predicate, arg, timeout = 10000) {
  try {
    await page.waitForFunction(
      ([src, a]) => new Function("s", "a", `return (${src})(s, a)`)(window.__KR__.state(), a),
      [predicate.toString(), arg],
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}
/** Holds a key until the state matches, then releases it. */
async function holdUntil(key, predicate, arg) {
  await page.keyboard.down(key);
  const ok = await until(predicate, arg);
  await page.keyboard.up(key);
  return ok;
}

// 1–2. The home page links to the game; the 3D world and player appear.
await page.goto(BASE);
await page.getByRole("button", { name: /Keyboard Run/ }).click();
await waitReady();
check("Home page card opens the game", page.url().endsWith("#/play/keyboard-run"));
check("Game route opens with one canvas", (await page.locator("canvas").count()) === 1);
await until((st) => st.grounded);
let s = await state();
check("Player spawns standing on the start road", s.grounded && Math.abs(s.position[2] - -5) < 0.2, JSON.stringify(s.position));
check("Timer shows 0:00.00 before moving", (await timerText()) === "0:00.00");
check("Controls card is shown", await page.getByText("Get to the FINISH flag").isVisible());

// 3. Movement is responsive; 14. timer displays and runs.
check("W moves the player forward", await holdUntil("KeyW", (st) => st.position[2] > -2));
s = await state();
check("Moving starts the timer", s.runTimeMs > 0 && (await timerText()) !== "0:00.00");

// 5. Sprint engages and disengages (speeds from data/movement.ts: 6 and 6 × 1.6).
await teleport([0, 0, -6]);
await page.keyboard.down("KeyW");
check("Walking reaches base speed", await until((st) => Math.abs(st.speed - 6) < 0.01));
await page.keyboard.down("ShiftLeft");
check("Shift sprints", await until((st) => Math.abs(st.speed - 9.6) < 0.01));
await page.keyboard.up("ShiftLeft");
check("Releasing Shift stops sprinting", await until((st) => Math.abs(st.speed - 6) < 0.01));
await page.keyboard.up("KeyW");
check("Player stops when keys are released", await until((st) => st.speed === 0));

// 6. Jump.
await teleport([0, 0, 0]);
await until((st) => st.grounded);
const groundY = (await state()).position[1];
check("Space jumps", await holdUntil("Space", (st, y) => st.position[1] - y > 0.8, groundY));
check("Player lands after jumping", await until((st, y) => st.grounded && Math.abs(st.position[1] - y) < 0.05, groundY));

// 12. Checkpoint.
await teleport([0, 1.6, 39.2]);
check("Checkpoint activates", await until((st) => st.checkpoint === 1));
check("HUD shows checkpoint 1 of 2", await page.getByText("🚩 1/2").isVisible());

// 11. Falling respawns at the checkpoint.
await teleport([0, -20, 39.2]);
check("Falling respawns at the checkpoint", await until((st) => Math.abs(st.position[2] - 39.2) < 0.5 && st.grounded && st.position[1] > 1.6));

// R returns to the checkpoint instantly.
await teleport([0, 0, 0]);
await until((st) => st.grounded);
await page.keyboard.press("KeyR");
check("R returns to the last checkpoint", await until((st) => Math.abs(st.position[2] - 39.2) < 0.5));

// Esc pauses (mouse not captured in headless) and resumes.
await page.keyboard.press("Escape");
check("Esc pauses the game", await page.getByRole("dialog", { name: "Paused" }).isVisible());
const pausedTime = (await state()).runTimeMs;
await page.waitForTimeout(400); // deliberate: nothing should change
check("Clock stops while paused", (await state()).runTimeMs === pausedTime);
await page.getByRole("button", { name: /Keep going/ }).click();
check("Resume closes the pause panel", !(await page.getByRole("dialog", { name: "Paused" }).isVisible()));

// 13. Finish line; fires once.
await teleport([0, 7.6, 97]);
await holdUntil("KeyW", (st) => st.finished);
check("Finish panel appears", await page.getByRole("dialog", { name: "Finished" }).isVisible());
check("Run is marked finished", (await state()).finished);
const finishedAt = (await state()).runTimeMs;
await page.waitForTimeout(300); // deliberate: nothing should change
check("Timer stops at the finish", (await state()).runTimeMs === finishedAt);

// 15. Restart without refreshing.
await page.keyboard.press("Enter");
await until((st) => !st.finished && st.runTimeMs === 0);
await page.getByRole("dialog", { name: "Finished" }).waitFor({ state: "detached" });
s = await state();
check("Enter restarts the run", !s.finished && s.runTimeMs === 0 && Math.abs(s.position[2] - -5) < 0.2);
check("Timer resets to 0:00.00", (await timerText()) === "0:00.00");
check("Checkpoints reset", s.checkpoint === 0 && (await page.getByText("🚩 0/2").isVisible()));

// Resizing the window keeps the game playable.
await page.setViewportSize({ width: 800, height: 600 });
await page.waitForFunction(() => document.querySelector("canvas")?.clientWidth === 800);
const canvasBox = await page.locator("canvas").boundingBox();
check("Canvas follows a window resize", canvasBox && Math.round(canvasBox.width) === 800 && Math.round(canvasBox.height) === 600);
const beforeResizeMove = (await state()).position[2];
check("Controls still work after resizing", await holdUntil("KeyW", (st, z) => st.position[2] > z + 1, beforeResizeMove));

// Leaving and coming back starts cleanly.
await page.getByRole("button", { name: "Back to VQVB home" }).click();
await page.locator("canvas").waitFor({ state: "detached" });
check("Home button leaves the game", (await page.locator("canvas").count()) === 0 && !(await page.evaluate(() => !!window.__KR__)));
await page.goto(ROUTE);
await waitReady();
await until((st) => st.grounded);
check("Returning to the game shows one fresh canvas", (await page.locator("canvas").count()) === 1 && (await state()).runTimeMs === 0);
check("Controls work after returning", await holdUntil("KeyD", (st) => Math.abs(st.position[0]) > 0.5));

// Keys don't scroll the page while playing.
check("Page did not scroll", (await page.evaluate(() => window.scrollY)) === 0);

// Touch-only devices get a friendly message instead of the game.
const phone = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
await phone.goto(ROUTE);
check("Phones see the 'Keyboard needed' message", await phone.getByText("Keyboard needed!").isVisible());
check("Phones do not load the 3D engine", (await phone.locator("canvas").count()) === 0);

check("No console errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll keyboard-run browser checks passed");
process.exit(failures ? 1 : 0);
