// Headless smoke test for Maze Mates Adventure.
// Verifies: clean boot, menu navigation, maze (Phaser canvas) loads,
// locked-state messaging, the Parent Gate flow, and localStorage persistence.
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4317/";
const errors = [];
let failures = 0;

function check(name, ok) {
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) failures++;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });

page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: "networkidle" });

// 1. Home renders.
check("Home title visible", await page.getByText("Maze Mates").first().isVisible());

// 2. Play -> Map Select with 12 maps; only the first is enabled.
await page.getByText("▶ Play").click();
check("Map select shows", await page.getByText("Choose a Maze").isVisible());
const mapButtons = page.locator("button:has-text('Maze')");
check("12 maze cards present", (await mapButtons.count()) >= 12);
check(
  "Locked map shows hint",
  await page.getByText("Complete the previous maze to unlock.").first().isVisible(),
);

// 3. Enter Jungle Maze -> Phaser canvas mounts.
await page.getByRole("button", { name: /Jungle Maze/ }).click();
await page.waitForSelector("canvas", { timeout: 15000 });
check("Maze canvas mounted", (await page.locator("canvas").count()) === 1);
check("HUD gem counter visible", await page.getByText(/💎\s*0\s*\//).isVisible());

// 4. Back out to map select.
await page.getByRole("button", { name: "Back to map select" }).click();
check("Back to map select", await page.getByText("Choose a Maze").isVisible());

// 5. Characters screen + Parent Gate flow.
await page.getByRole("button", { name: "Go back" }).click();
await page.getByText("🐾 Characters").click();
check("Character shop shows", await page.getByText("Characters").first().isVisible());
await page.getByText("Ask a grown-up to unlock faster").click();
check("Parent gate prompt", await page.getByText("Ask a grown-up").first().isVisible());
await page.getByPlaceholder("PARENT").fill("parent");
await page.getByRole("button", { name: "Continue" }).click();
check("Demo shop shows (no real money)", await page.getByText("No real money will be charged").isVisible());
// Grant 500 gems via the mock pack.
await page.getByText("Small Gem Pack").click();
check("Mock grant confirmation", await page.getByText("All done!").isVisible());
await page.getByRole("button", { name: "Yay!" }).click();
check("Gems granted to 500", await page.getByText(/\b500\b/).first().isVisible());

// 6. Secret maps locked until all 12 main maps complete.
await page.getByRole("button", { name: "Go back" }).click();
await page.getByText("🗺️ Secret Maps").click();
check("Secret maps hidden message", await page.getByText("Secret maps are hidden.").isVisible());

// 7. localStorage persistence: gems survive a reload.
await page.reload({ waitUntil: "networkidle" });
const saved = await page.evaluate(() => localStorage.getItem("mma:progress"));
const parsed = saved ? JSON.parse(saved) : {};
check("Progress persisted with version", parsed.version === 2);
check("Granted gems persisted (>=500)", (parsed.totalGems ?? 0) >= 500);

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
