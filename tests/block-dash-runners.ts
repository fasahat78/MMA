// Block Dash runners + Wins spending (no browser). Run with: node tests/block-dash-runners.ts
import { runners, getRunner, DEFAULT_RUNNER_ID } from "../src/keyboard-run/data/runners.ts";
import { characters } from "../src/data/characters.ts";
import { teleportPrice } from "../src/keyboard-run/data/economy.ts";
import { world1 } from "../src/keyboard-run/data/stages/world1.ts";
import {
  buyRunner,
  buyTeleport,
  chooseRunner,
  nextTeleportPrice,
  spendTeleport,
  teleportCharges,
  defaultProgress,
  migrateProgress,
  ownsRunner,
  recordFinish,
  selectedRunner,
  walletWins,
  type BlockDashProgress,
} from "../src/keyboard-run/state/progress.ts";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✅" : "❌"} ${name}${!ok && detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

// --- The roster ---------------------------------------------------------------
const ids = runners.map((r) => r.id);
check("Runner ids are unique", new Set(ids).size === ids.length);
check("Every Maze Mates animal has a Block Dash runner", characters.every((c) => ids.includes(c.id)), characters.filter((c) => !ids.includes(c.id)).map((c) => c.id).join(", "));
check("Blocky (the original runner) is the free default", getRunner(DEFAULT_RUNNER_ID).cost === 0 && selectedRunner(defaultProgress).id === "blocky");
check("Penguin is free, like in Maze Mates", getRunner("penguin").cost === 0);
check("Prices only go up down the list after the free ones", runners.every((r, i, all) => i === 0 || r.cost >= all[i - 1].cost));
check("Unknown runner ids fall back to Blocky", getRunner("dragon").id === "blocky");
const allStagesOnce = world1.stages.reduce((sum, s) => sum + s.winReward, 0);
check("Finishing every stage once can buy every runner", runners.reduce((sum, r) => sum + r.cost, 0) <= allStagesOnce);

// --- Buying and choosing ---------------------------------------------------------
const withWins = (wins: number): BlockDashProgress => ({ ...defaultProgress, wins });
const cat = getRunner("cat");
const bird = getRunner("bird");

check("A new player owns only the free runners", runners.every((r) => ownsRunner(defaultProgress, r) === (r.cost === 0)));

const poor = buyRunner(withWins(cat.cost - 1), cat);
check("Can't buy a runner without enough Wins", !poor.ok && poor.reason === "not-enough-wins");

const start = withWins(cat.cost + 5);
const bought = buyRunner(start, cat);
check("Buying a runner owns it and puts it on", bought.ok && ownsRunner(bought.progress, cat) && selectedRunner(bought.progress).id === "cat");
check("Buying spends Wins from the wallet but not from Wins earned", bought.ok && walletWins(bought.progress) === 5 && bought.progress.wins === start.wins);
check("Buying doesn't change the old progress object", start.ownedRunnerIds.length === 0 && start.selectedRunnerId === "blocky");
check("Can't buy the same runner twice", bought.ok && (() => {
  const again = buyRunner(bought.progress, cat);
  return !again.ok && again.reason === "owned";
})());
check("Free runners can't be bought (already yours)", (() => {
  const r = buyRunner(defaultProgress, getRunner("penguin"));
  return !r.ok && r.reason === "owned";
})());

check("Choosing an owned runner switches to it", selectedRunner(chooseRunner(defaultProgress, getRunner("penguin"))).id === "penguin");
check("Choosing a runner you don't own does nothing", chooseRunner(defaultProgress, bird) === defaultProgress);

check("Finishing a stage adds to the wallet after spending", bought.ok && (() => {
  const after = recordFinish(bought.progress, world1.stages[1], 30_000).progress;
  return walletWins(after) === 5 + world1.stages[1].winReward;
})());

// --- Teleports ------------------------------------------------------------------------
check("Teleports cost 5, then 15, then 45 (3× each time)", teleportPrice(0) === 5 && teleportPrice(1) === 15 && teleportPrice(2) === 45);
check("A new player has no teleports", teleportCharges(defaultProgress) === 0 && spendTeleport(defaultProgress) === null);
check("Can't buy a teleport without enough Wins", (() => {
  const r = buyTeleport(withWins(4));
  return !r.ok && r.reason === "not-enough-wins";
})());
{
  let p = withWins(100);
  const one = buyTeleport(p);
  check("Buying a teleport adds a charge and spends 5 Wins", one.ok && teleportCharges(one.progress) === 1 && walletWins(one.progress) === 95);
  p = one.ok ? one.progress : p;
  const two = buyTeleport(p);
  check("The next teleport costs 15", two.ok && nextTeleportPrice(p) === 15 && walletWins(two.progress) === 80 && teleportCharges(two.progress) === 2);
  p = two.ok ? two.progress : p;
  const used = spendTeleport(p);
  check("Using a teleport spends a charge but no Wins", used !== null && teleportCharges(used) === 1 && walletWins(used) === 80);
  check("Using a teleport doesn't make the next one cheaper", used !== null && nextTeleportPrice(used) === 45);
  check("Teleports and runners share one wallet", used !== null && (() => {
    const r = buyRunner(used, getRunner("monkey"));
    return r.ok && walletWins(r.progress) === 50;
  })());
}
{
  const p0 = recordFinish(defaultProgress, world1.stages[0], 40_000).progress;
  const tele = recordFinish(p0, world1.stages[0], 10_000, true);
  check("A teleported finish pays Wins but can't set a best time", tele.winsEarned === 1 && !tele.isNewBest && tele.progress.bestTimes["w1-s1"] === 40_000);
  const firstTele = recordFinish(defaultProgress, world1.stages[1], 10_000, true);
  check("A teleported first clear still opens the next stage", firstTele.unlockedNext && firstTele.progress.bestTimes["w1-s2"] === undefined);
}

// --- Saves ---------------------------------------------------------------------------
const v1 = { version: 1, wins: 31, unlockedStage: 6, completedStageIds: ["w1-s1"], bestTimes: { "w1-s1": 40_000 } };
const migrated = migrateProgress(v1);
check("A version 1 save keeps its Wins and stages", migrated.wins === 31 && migrated.unlockedStage === 6 && migrated.bestTimes["w1-s1"] === 40_000);
check("A version 1 save starts as Blocky with nothing bought", migrated.version === 3 && migrated.teleportsBought === 0 && migrated.ownedRunnerIds.length === 0 && migrated.selectedRunnerId === "blocky");
const junk = migrateProgress({ ...v1, ownedRunnerIds: ["cat", "cat", "dragon", 7, "penguin"], selectedRunnerId: "robot" });
check("Broken runner lists are cleaned (duplicates, unknown and free ids)", JSON.stringify(junk.ownedRunnerIds) === JSON.stringify(["cat"]));
const badTeleports = migrateProgress({ ...v1, teleportsBought: 2.7, teleportsUsed: 9 });
check("Broken teleport counts are cleaned (never more used than bought)", badTeleports.teleportsBought === 2 && badTeleports.teleportsUsed === 2);
check("A chosen runner that isn't owned falls back to Blocky", selectedRunner(junk).id === "blocky");
check("A save with runners survives a save/load round trip", bought.ok && JSON.stringify(migrateProgress(JSON.parse(JSON.stringify(bought.progress)))) === JSON.stringify(bought.progress));

console.log(failures ? `\n${failures} check(s) failed` : "\nAll Block Dash runner checks passed");
process.exit(failures ? 1 : 0);
