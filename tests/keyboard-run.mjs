// Headless browser test for Block Dash (V0.1) — the brief's §37 definition of
// done. Expects a server on BASE_URL (default http://localhost:4317/):
//   npm run build && npm run preview -- --port 4317
//   npm run test:keyboard-run
// Uses the `window.__KR_E2E__` seam to read game state and teleport.
import { chromium } from "playwright";
// Positions and speeds come from the game's own data, so course edits don't break this.
import { sandboxStage } from "../src/keyboard-run/data/stages/sandbox.ts";
import { playerMovement } from "../src/keyboard-run/data/movement.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const ROUTE = BASE + "#/play/block-dash";
const OLD_ROUTE = BASE + "#/play/keyboard-run";
const zone = (id) => sandboxStage.obstacles.find((o) => o.id === id);
/** Feet position on a zone's floor. */
const zoneFloor = (id) => {
  const z = zone(id);
  return [z.position[0], z.position[1] - z.size[1] / 2, z.position[2]];
};
const CP1 = zoneFloor("checkpoint-1");
const FINISH = zoneFloor("finish");
const CHECKPOINTS = sandboxStage.obstacles.filter((o) => o.type === "checkpoint").length;
const WALK = playerMovement.baseSpeed;
const SPRINT = WALK * playerMovement.sprintMultiplier;
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
await page.getByRole("button", { name: /Block Dash/ }).click();
await waitReady();
check("Home page card opens the game", page.url().endsWith("#/play/block-dash"));
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
check("Sprint hint appears once running", await page.getByText("to sprint!").isVisible());

// 5. Sprint engages and disengages (speeds from data/movement.ts).
await teleport([0, 0, -6]);
await page.keyboard.down("KeyW");
check("Walking reaches base speed", await until((st, a) => Math.abs(st.speed - a) < 0.01, WALK));
await page.keyboard.down("ShiftLeft");
check("Shift sprints", await until((st, a) => Math.abs(st.speed - a) < 0.01, SPRINT));
check("Sprint hint goes away after sprinting", await page.getByText("to sprint!").waitFor({ state: "detached" }).then(() => true, () => false));
await page.keyboard.up("ShiftLeft");
check("Releasing Shift stops sprinting", await until((st, a) => Math.abs(st.speed - a) < 0.01, WALK));
await page.keyboard.up("KeyW");
check("Player stops when keys are released", await until((st) => st.speed === 0));

// 6. Jump.
await teleport([0, 0, 0]);
await until((st) => st.grounded);
const groundY = (await state()).position[1];
check("Space jumps", await holdUntil("Space", (st, y) => st.position[1] - y > 0.8, groundY));
check("Player lands after jumping", await until((st, y) => st.grounded && Math.abs(st.position[1] - y) < 0.05, groundY));

// 12. Checkpoint.
await teleport(CP1);
check("Checkpoint activates", await until((st) => st.checkpoint === 1));
check(`HUD shows checkpoint 1 of ${CHECKPOINTS}`, await page.getByText(`🚩 1/${CHECKPOINTS}`).isVisible());

// 11. Falling respawns at the checkpoint.
await teleport([CP1[0], -20, CP1[2]]);
check("Falling respawns at the checkpoint", await until((st, cp) => Math.abs(st.position[2] - cp[2]) < 0.5 && st.grounded && st.position[1] > cp[1], CP1));

// R returns to the checkpoint instantly.
await teleport([0, 0, 0]);
await until((st) => st.grounded);
await page.keyboard.press("KeyR");
check("R returns to the last checkpoint", await until((st, cp) => Math.abs(st.position[2] - cp[2]) < 0.5, CP1));

// Esc pauses (mouse not captured in headless) and resumes.
await page.keyboard.press("Escape");
check("Esc pauses the game", await page.getByRole("dialog", { name: "Paused" }).isVisible());
const pausedTime = (await state()).runTimeMs;
await page.waitForTimeout(400); // deliberate: nothing should change
check("Clock stops while paused", (await state()).runTimeMs === pausedTime);
await page.getByRole("button", { name: /Keep going/ }).click();
check("Resume closes the pause panel", !(await page.getByRole("dialog", { name: "Paused" }).isVisible()));

// 13. Finish line; fires once.
await teleport([FINISH[0], FINISH[1], FINISH[2] - 3]);
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
check("Checkpoints reset", s.checkpoint === 0 && (await page.getByText(`🚩 0/${CHECKPOINTS}`).isVisible()));

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

// The V0 address still opens the game.
await page.goto(OLD_ROUTE);
await waitReady();
check("Old #/play/keyboard-run link still works", (await page.locator("canvas").count()) === 1);

// Keys don't scroll the page while playing.
check("Page did not scroll", (await page.evaluate(() => window.scrollY)) === 0);

// Touch-only devices get a friendly message instead of the game.
const phone = await browser.newPage({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
await phone.goto(ROUTE);
check("Phones see the 'Keyboard needed' message", await phone.getByText("Keyboard needed!").isVisible());
check("Phones do not load the 3D engine", (await phone.locator("canvas").count()) === 0);

check("No console errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll Block Dash browser checks passed");
process.exit(failures ? 1 : 0);
