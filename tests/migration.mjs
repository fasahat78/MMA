// E2E for the save migration shim: seed a legacy v1 save, load the app, and
// verify it upgrades to the current schema (gameMode + per-map modes) without
// losing data — the real runtime path used by returning players.
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

// Seed a v1-shaped save (pre-gameMode, pre-completedMapModes) before app code.
await page.addInitScript(() => {
  localStorage.setItem(
    "mma:progress",
    JSON.stringify({
      version: 1,
      totalGems: 120,
      selectedCharacterId: "penguin",
      unlockedCharacterIds: ["penguin"],
      unlockedAccessoryIds: ["hat_cap"],
      equippedAccessoryIds: ["hat_cap"], // old flat shape
      completedMapIds: ["jungle", "ice_cream"],
      unlockedSecretMapIds: [],
      completedSecretMapIds: [],
      soundEnabled: true,
      musicEnabled: true,
    }),
  );
});

await page.goto(BASE, { waitUntil: "networkidle" });
// Touch the store so the migrated state is written back to localStorage.
await page.getByText("🐾 Characters").click();
await page.getByRole("button", { name: "Go back" }).click();

const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("mma:progress")));
check("Upgraded to current version (4)", saved.version === 4);
check("gameMode backfilled to easy", saved.gameMode === "easy");
check("musicTrackId backfilled", typeof saved.musicTrackId === "string" && saved.musicTrackId.length > 0);
check("Gems preserved", saved.totalGems === 120);
check("Completions preserved", saved.completedMapIds.includes("jungle"));
check(
  "Prior completions attributed to Easy",
  (saved.completedMapModes?.jungle ?? []).includes("easy") &&
    (saved.completedMapModes?.ice_cream ?? []).includes("easy"),
);
check("equippedAccessories upgraded to per-category object", saved.equippedAccessories?.hat === "hat_cap");

check("No console/page errors", errors.length === 0);
if (errors.length) console.log("Errors:\n" + errors.join("\n"));

await browser.close();
console.log(`\n${failures === 0 ? "ALL PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
