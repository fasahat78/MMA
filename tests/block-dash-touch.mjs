// Block Dash on phones and tablets: emulated iPhone and iPad, in WebKit
// (Safari's engine) and Chromium. Drives the on-screen stick and buttons
// with touch pointer events. Needs a server like tests/keyboard-run.mjs:
//   npm run build && npm run preview -- --port 4317
//   npm run test:block-dash-touch
import { chromium, devices, webkit } from "playwright";
import { playerMovement } from "../src/keyboard-run/data/movement.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const ROUTE = BASE + "#/play/block-dash";
const WALK = playerMovement.baseSpeed;
const SPRINT = WALK * playerMovement.sprintMultiplier;
let failures = 0;

function check(name, ok, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/** Fires a touch pointer event at a point inside an element (x/y as 0–1 of its box). */
async function touch(page, selector, type, fx, fy, pointerId) {
  await page.evaluate(
    ({ selector, type, fx, fy, pointerId }) => {
      const el = document.querySelector(selector);
      const r = el.getBoundingClientRect();
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerId,
          pointerType: "touch",
          isPrimary: pointerId === 1,
          clientX: r.left + r.width * fx,
          clientY: r.top + r.height * fy,
          bubbles: true,
          cancelable: true,
        }),
      );
    },
    { selector, type, fx, fy, pointerId },
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
  });

  const state = () => page.evaluate(() => window.__KR__.state());
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

  // The home page card opens the game on a touch device.
  await page.goto(BASE);
  await page.getByRole("button", { name: /Block Dash/ }).click();
  const loaded = await page.waitForFunction(() => !!window.__KR__, null, { timeout: 60000 }).then(() => true, () => false);
  check(`${label}: game loads`, loaded);
  if (!loaded) {
    await browser.close();
    return;
  }
  await until((s) => s.grounded);
  check(`${label}: no "keyboard needed" message`, !(await page.getByText("Keyboard needed").isVisible()));
  check(`${label}: joystick and JUMP button shown`, (await page.locator(".kr-stick").isVisible()) && (await page.getByRole("button", { name: "Jump" }).isVisible()));
  check(`${label}: touch instructions shown`, await page.getByText("push it all the way to sprint").isVisible());

  // Half-push forward walks slower than full speed; full push sprints.
  const start = (await state()).position[2];
  await touch(page, ".kr-stick", "pointerdown", 0.5, 0.5, 1);
  await touch(page, ".kr-stick", "pointermove", 0.5, 0.3, 1);
  // Headless WebKit renders on the CPU and advances slowly, so check speed, not distance.
  // (Predicates run inside the page: pass values in via the second argument.)
  const halfOk = await until((s, a) => s.position[2] > a.start + 0.1 && s.speed > 1 && s.speed < a.walk - 0.5, { start, walk: WALK });
  check(`${label}: half push walks forward, below top speed`, halfOk, JSON.stringify({ start, ...(await state()) }));
  await touch(page, ".kr-stick", "pointermove", 0.5, -0.4, 1);
  check(`${label}: full push sprints`, await until((s, v) => Math.abs(s.speed - v) < 0.05, SPRINT));
  check(`${label}: sprint hint clears after sprinting`, await page.getByText("to sprint!").waitFor({ state: "detached", timeout: 5000 }).then(() => true, () => false));
  await touch(page, ".kr-stick", "pointerup", 0.5, -0.4, 1);
  check(`${label}: letting go stops`, await until((s) => s.speed === 0));

  // Jump with a second finger while the first is on the stick.
  await page.evaluate(() => window.__KR__.teleport([0, 0, -2]));
  await until((s) => s.grounded);
  const groundY = (await state()).position[1];
  await touch(page, ".kr-stick", "pointerdown", 0.5, 0.5, 1);
  await touch(page, ".kr-stick", "pointermove", 0.5, 0.2, 1);
  await touch(page, 'button[aria-label="Jump"]', "pointerdown", 0.5, 0.5, 2);
  check(`${label}: JUMP works while moving (two fingers)`, await until((s, y) => s.position[1] - y > 0.8 && s.speed > 1, groundY));
  await touch(page, 'button[aria-label="Jump"]', "pointerup", 0.5, 0.5, 2);
  await touch(page, ".kr-stick", "pointerup", 0.5, 0.2, 1);
  check(`${label}: lands after jumping`, await until((s) => s.grounded));

  // ↺ goes back to the start (no checkpoint yet).
  await page.evaluate(() => window.__KR__.teleport([0, 0, 5]));
  await until((s) => s.grounded);
  await page.getByRole("button", { name: "Back to last checkpoint" }).tap();
  check(`${label}: ↺ returns to the last checkpoint`, await until((s) => Math.abs(s.position[2] - -5) < 0.5));

  // Pause hides the thumb controls; resume brings them back.
  await page.getByRole("button", { name: "Pause" }).tap();
  check(`${label}: pause shows the panel and hides the controls`, (await page.getByRole("dialog", { name: "Paused" }).isVisible()) && !(await page.locator(".kr-stick").isVisible()));
  await page.getByRole("button", { name: /Keep going/ }).tap();
  check(`${label}: resume brings the controls back`, await page.locator(".kr-stick").isVisible());

  // Page doesn't scroll or zoom from play.
  check(`${label}: page did not scroll`, (await page.evaluate(() => window.scrollY)) === 0);

  // Rotating the device keeps the game filling the screen.
  const vp = page.viewportSize();
  await page.setViewportSize({ width: vp.height, height: vp.width });
  const fits = await page
    .waitForFunction(([w, h]) => {
      const c = document.querySelector("canvas");
      return c && Math.abs(c.clientWidth - w) < 2 && Math.abs(c.clientHeight - h) < 2;
    }, [vp.height, vp.width], { timeout: 5000 })
    .then(() => true, () => false);
  check(`${label}: rotating keeps the game full-screen`, fits);
  check(`${label}: controls still on screen after rotating`, await page.locator(".kr-stick").isVisible());

  check(`${label}: no page errors`, errors.length === 0, errors.join(" | "));
  await browser.close();
}

const SWIFTSHADER = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
await run("WebKit", webkit, "iPhone 15", []);
await run("WebKit", webkit, "iPad Pro 11", []);
await run("Chromium", chromium, "iPhone 15", SWIFTSHADER);

console.log(failures ? `\n${failures} check(s) failed` : "\nAll Block Dash touch checks passed");
process.exit(failures ? 1 : 0);
