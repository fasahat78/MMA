// Block Dash on phones and tablets: emulated iPhone and iPad, in WebKit
// (Safari's engine) and Chromium. Drives the Roblox-style touch controls
// with touch pointer events: floating stick on the left half, drag-to-look
// on the right half, jump button. Needs a server like tests/keyboard-run.mjs:
//   npm run build && npm run preview -- --port 4317
//   npm run test:block-dash-touch
import { chromium, devices, webkit } from "playwright";
import { playerMovement } from "../src/keyboard-run/data/movement.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const TOP_SPEED = playerMovement.baseSpeed * playerMovement.sprintMultiplier;
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/**
 * Fires a touch pointer event. `x`/`y` are fractions (0–1) of the viewport;
 * the event goes to whatever element is at that point, like a real finger.
 */
async function touch(page, type, x, y, pointerId, target) {
  await page.evaluate(
    ({ type, x, y, pointerId, target }) => {
      const cx = window.innerWidth * x;
      const cy = window.innerHeight * y;
      // Captured pointers keep reporting to the element that started them.
      window.__touchTargets ??= {};
      const el =
        target === "jump"
          ? document.querySelector('button[aria-label="Jump"]')
          : (type === "pointerdown" ? null : window.__touchTargets[pointerId]) ?? document.elementFromPoint(cx, cy);
      if (type === "pointerdown") window.__touchTargets[pointerId] = el;
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: "touch",
          isPrimary: pointerId === 1,
          clientX: cx,
          clientY: cy,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { type, x, y, pointerId, target },
  );
}

async function run(engineName, launcher, deviceName, extraArgs) {
  const label = `${deviceName} (${engineName})`;
  const browser = await launcher.launch({ args: extraArgs });
  const context = await browser.newContext({ ...devices[deviceName] });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    window.__KR_E2E__ = true;
    // Open all stages; these checks run on Stage 3 (spawn at z = -5).
    if (!localStorage.getItem("block-dash-progress")) {
      localStorage.setItem("block-dash-progress", JSON.stringify({ version: 1, wins: 0, unlockedStage: 5, completedStageIds: [], bestTimes: {} }));
    }
  });

  const state = () => page.evaluate(() => window.__KR__.state());
  // Headless WebKit renders on the CPU and advances slowly: be patient, and
  // check speeds rather than distances. Predicates run in the page, so pass
  // values in via `arg`.
  const until = async (predicate, arg, timeout = 30000) => {
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
  };

  await page.goto(BASE);
  await page.getByRole("button", { name: /Block Dash/ }).click();
  await page.getByRole("button", { name: "Play stage 3" }).tap();
  const loaded = await page.waitForFunction(() => !!window.__KR__, null, { timeout: 60000 }).then(() => true, () => false);
  check(`${label}: game loads`, loaded);
  if (!loaded) {
    await browser.close();
    return;
  }
  await until((s) => s.grounded);
  check(`${label}: move + look hints and jump button shown`,
    (await page.getByText("Drag here to move").isVisible()) &&
      (await page.getByText("Drag here to look around").isVisible()) &&
      (await page.getByRole("button", { name: "Jump" }).isVisible()));
  // Bigger controls (Zoya kept missing them): a touch just outside the visible
  // jump circle still lands on the jump button, and the stick is big.
  const nearMiss = await page.evaluate(() => {
    const circle = document.querySelector('button[aria-label="Jump"] span').getBoundingClientRect();
    const el = document.elementFromPoint(circle.left - 20, circle.top - 20);
    return el?.closest('button[aria-label="Jump"]') ? "jump" : el?.className?.slice(0, 40);
  });
  check(`${label}: a near miss beside the jump circle still jumps`, nearMiss === "jump", `hit: ${nearMiss}`);
  const jumpSize = await page.evaluate(() => document.querySelector('button[aria-label="Jump"] span').getBoundingClientRect().width);
  check(`${label}: jump button is big (≥ 130 px)`, jumpSize >= 130, `${jumpSize}px`);
  check(`${label}: touch instructions shown`, await page.getByText("push further to run faster").isVisible());
  check(`${label}: no sprint hint on touch`, !(await page.getByText("to sprint!").isVisible()));

  // Floating stick: appears where the thumb lands (mid-left, not the corner).
  await touch(page, "pointerdown", 0.3, 0.55, 1);
  const stickBox = await page.locator(".kr-stick").boundingBox();
  const vp = page.viewportSize();
  check(`${label}: stick appears under the thumb`,
    !!stickBox && Math.abs(stickBox.x + stickBox.width / 2 - vp.width * 0.3) < 4 && Math.abs(stickBox.y + stickBox.height / 2 - vp.height * 0.55) < 4);

  // A small push walks slowly; a full push runs at top speed.
  const start = (await state()).position[2];
  await touch(page, "pointermove", 0.3, 0.55 - 20 / vp.height, 1);
  check(`${label}: small push moves slowly`,
    await until((s, a) => s.position[2] > a.start + 0.1 && s.speed > 1 && s.speed < a.top / 2, { start, top: TOP_SPEED }));
  await touch(page, "pointermove", 0.3, 0.55 - 120 / vp.height, 1);
  check(`${label}: full push runs at top speed`, await until((s, top) => Math.abs(s.speed - top) < 0.05, TOP_SPEED));
  check(`${label}: move hint goes away after moving`, !(await page.getByText("Drag here to move").isVisible()));

  // Jump with a second finger while running.
  const groundY = (await state()).position[1];
  await touch(page, "pointerdown", 0.9, 0.9, 2, "jump");
  check(`${label}: jump works while running (two fingers)`, await until((s, y) => s.position[1] - y > 0.8 && s.speed > 1, groundY));
  await touch(page, "pointerup", 0.9, 0.9, 2, "jump");
  await touch(page, "pointerup", 0.3, 0.4, 1);
  check(`${label}: letting go stops`, await until((s) => s.grounded && s.speed === 0));

  // Drag on the right half turns the camera.
  const yaw0 = (await state()).yaw;
  await touch(page, "pointerdown", 0.75, 0.4, 3);
  await touch(page, "pointermove", 0.75 + 100 / vp.width, 0.4, 3);
  await touch(page, "pointerup", 0.75 + 100 / vp.width, 0.4, 3);
  const yaw1 = (await state()).yaw;
  check(`${label}: dragging the right side turns the camera`, yaw1 < yaw0 - 0.3, `yaw ${yaw0.toFixed(2)} → ${yaw1.toFixed(2)}`);
  check(`${label}: look hint goes away after looking`, !(await page.getByText("Drag here to look around").isVisible()));
  check(`${label}: no stick left behind by the look drag`, !(await page.locator(".kr-stick").isVisible()));

  // After turning, "up" on the stick follows the camera (walks along the new heading).
  await page.evaluate(() => window.__KR__.teleport([0, 0, 0]));
  await until((s) => s.grounded);
  const before = (await state()).position;
  await touch(page, "pointerdown", 0.3, 0.6, 4);
  await touch(page, "pointermove", 0.3, 0.6 - 120 / vp.height, 4);
  await until((s, p) => Math.hypot(s.position[0] - p[0], s.position[2] - p[2]) > 0.5, before);
  await touch(page, "pointerup", 0.3, 0.4, 4);
  const after = (await state()).position;
  const heading = Math.atan2(after[0] - before[0], after[2] - before[2]);
  const diff = Math.atan2(Math.sin(heading - yaw1), Math.cos(heading - yaw1));
  check(`${label}: stick moves in the camera's direction`, Math.abs(diff) < 0.2, `heading ${heading.toFixed(2)} vs camera ${yaw1.toFixed(2)}`);

  // Bug fix (Zoya: "losing control, the control is getting stuck"): iPad Safari
  // can drop a finger's lift. A new thumb must take over the stick, and lifting
  // every finger must release everything.
  await page.evaluate(() => window.__KR__.teleport([0, 0, 0]));
  await until((s) => s.grounded);
  await touch(page, "pointerdown", 0.3, 0.6, 11);
  await touch(page, "pointermove", 0.3, 0.6 - 120 / vp.height, 11); // run forward, then the lift is "lost"
  check(`${label}: (stuck-stick setup) running forward`, await until((s, top) => Math.abs(s.speed - top) < 0.05, TOP_SPEED));
  await touch(page, "pointerdown", 0.25, 0.5, 12); // new thumb
  await touch(page, "pointermove", 0.25 + 120 / vp.width, 0.5, 12); // push right
  const rightNow = await until((s, a) => {
    // Moving mostly sideways now, not forward.
    return s.speed > 1 && Math.abs(s.yaw - a) < 10;
  }, yaw1);
  const p1 = (await state()).position;
  await page.waitForTimeout(600);
  const p2 = (await state()).position;
  const sideways = Math.abs(p2[0] - p1[0]) > Math.abs(p2[2] - p1[2]);
  check(`${label}: a new thumb takes over a stuck stick`, rightNow && sideways, `dx ${(p2[0] - p1[0]).toFixed(2)} dz ${(p2[2] - p1[2]).toFixed(2)}`);
  // Now "lose" that lift too, then all fingers leave the screen.
  await page.evaluate(() => {
    // Desktop WebKit can't construct TouchEvent; a plain event with an empty
    // `touches` list exercises the same "no fingers left" handler.
    const ev = new Event("touchend", { bubbles: true });
    Object.defineProperty(ev, "touches", { value: [] });
    document.dispatchEvent(ev);
  });
  check(`${label}: lifting every finger releases a stuck stick`, await until((s) => s.speed === 0));
  // A stuck jump press must not swallow the next jump.
  await touch(page, "pointerdown", 0.9, 0.9, 13, "jump"); // pressed, lift "lost"
  await until((s) => s.grounded && s.speed === 0);
  await page.waitForTimeout(1500);
  const yBefore = (await state()).position[1];
  await touch(page, "pointerdown", 0.9, 0.9, 14, "jump");
  check(`${label}: jump still works after a lost jump lift`, await until((s, y) => s.position[1] - y > 0.8, yBefore));
  await touch(page, "pointerup", 0.9, 0.9, 14, "jump");

  // ↺ lives in the top bar now (not next to jump).
  await page.evaluate(() => window.__KR__.teleport([0, 0, 5]));
  await until((s) => s.grounded);
  await page.getByRole("button", { name: "Back to last checkpoint" }).tap();
  check(`${label}: ↺ returns to the last checkpoint`, await until((s) => Math.abs(s.position[2] - -5) < 0.5));

  // Pause hides the thumb controls; resume brings them back.
  await page.getByRole("button", { name: "Pause" }).tap();
  check(`${label}: pause shows the panel and hides the controls`,
    (await page.getByRole("dialog", { name: "Paused" }).isVisible()) && !(await page.getByRole("button", { name: "Jump" }).isVisible()));
  await page.getByRole("button", { name: /Keep going/ }).tap();
  check(`${label}: resume brings the controls back`, await page.getByRole("button", { name: "Jump" }).isVisible());

  check(`${label}: page did not scroll`, (await page.evaluate(() => window.scrollY)) === 0);

  // Rotating the device keeps the game filling the screen.
  await page.setViewportSize({ width: vp.height, height: vp.width });
  const fits = await page
    .waitForFunction(([w, h]) => {
      const c = document.querySelector("canvas");
      return c && Math.abs(c.clientWidth - w) < 2 && Math.abs(c.clientHeight - h) < 2;
    }, [vp.height, vp.width], { timeout: 5000 })
    .then(() => true, () => false);
  check(`${label}: rotating keeps the game full-screen`, fits);
  check(`${label}: jump button still on screen after rotating`, await page.getByRole("button", { name: "Jump" }).isVisible());

  check(`${label}: no page errors`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

const SWIFTSHADER = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
await run("WebKit", webkit, "iPad Pro 11", []);
await run("WebKit", webkit, "iPhone 15", []);
await run("Chromium", chromium, "iPad Pro 11", SWIFTSHADER);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll Block Dash touch checks passed");
process.exit(failures ? 1 : 0);
