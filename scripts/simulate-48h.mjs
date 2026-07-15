/* 48-hour Agent Garden simulation against the REAL game math
   (src/lib/garden-sim.ts — imported directly; Node strips the types).
   Drives a virtual clock through activation, care actions, naps, neglect,
   dormancy, and AP regeneration, asserting exact values at every step.

   Run: node scripts/simulate-48h.mjs   (exit 0 = all assertions pass) */

import {
  AP_COST,
  AP_MAX,
  AP_START,
  HOUR_MS,
  NAP_MS,
  applyActivate,
  applyFeed,
  applyNap,
  applyPlay,
  applyTrain,
  dormantAgent,
  freshVitals,
  moodIndex,
  overallHappiness,
  regenAP,
  spendAP,
  tickAgent,
  trainGain,
} from "../src/lib/garden-sim.ts";

let passed = 0;
let failed = 0;
function eq(label, actual, expected) {
  const a = typeof actual === "number" ? Math.round(actual * 1000) / 1000 : actual;
  const e = typeof expected === "number" ? Math.round(expected * 1000) / 1000 : expected;
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`  ✗ ${label}: expected ${e}, got ${a}`);
  }
}
function ok(label, cond) {
  eq(label, !!cond, true);
}

const T0 = 1_750_000_000_000; // fixed epoch — fully deterministic
let now = T0;

/* ---------- world state (mirrors the store's shape) ---------- */
const ids = ["paper-wing", "echo-fox", "cash-raptor", "fortress-tortoise"];
const agents = Object.fromEntries(ids.map((id) => [id, dormantAgent()]));
let ap = AP_START;
let lastRegen = T0;
let lastTick = T0;
const eventLog = [];

function tickWorld(ms) {
  now += ms;
  for (const id of ids) {
    const { agent, events } = tickAgent(agents[id], now - lastTick, now);
    agents[id] = agent;
    for (const ev of events) eventLog.push({ id, ...ev, at: (now - T0) / HOUR_MS });
  }
  ({ ap, lastRegen } = regenAP(ap, lastRegen, now));
  lastTick = now;
}

function act(id, action, fn) {
  const s = spendAP(ap, action);
  ok(`AP available for ${action}`, s.ok);
  ap = s.ap;
  agents[id] = fn(agents[id]);
}

console.log("— Agent Garden 48h simulation —\n");

/* Hour 0: dormant statues don't tick */
console.log("[h0] dormant baseline");
tickWorld(HOUR_MS);
eq("dormant hunger untouched", agents["paper-wing"].vitals.hunger, 0);
eq("dormant stays dormant", agents["paper-wing"].status, "dormant");
eq("AP regenerated to 11 while idle", ap, AP_START + 1);

/* Activate all four */
console.log("[h1] activate all agents");
for (const id of ids) agents[id] = applyActivate(agents[id]);
eq("activated status", agents["echo-fox"].status, "awake");
eq("fresh hunger", agents["echo-fox"].vitals.hunger, 80);
eq("fresh happiness", agents["echo-fox"].vitals.happiness, 70);
eq("fresh energy", agents["echo-fox"].vitals.energy, 90);
eq("productivity starts at 1", agents["echo-fox"].productivity, 1);

/* Exact decay after one hour awake */
console.log("[h2] decay rates (5/3/2 per hour)");
tickWorld(HOUR_MS);
eq("hunger -5", agents["paper-wing"].vitals.hunger, 75);
eq("happiness -3", agents["paper-wing"].vitals.happiness, 67);
eq("energy -2", agents["paper-wing"].vitals.energy, 88);

/* Feed */
console.log("[h2] feed paper-wing (+30 hgr, +10 hap, 1⚡)");
const apBeforeFeed = ap;
act("paper-wing", "feed", applyFeed);
eq("hunger +30 clamped", agents["paper-wing"].vitals.hunger, 100);
eq("happiness +10", agents["paper-wing"].vitals.happiness, 77);
eq("feed cost 1 AP", ap, apBeforeFeed - AP_COST.feed);
eq("timesFed increments", agents["paper-wing"].timesFed, 1);

/* Play */
console.log("[h2] play with echo-fox (+25 hap, 1⚡)");
act("echo-fox", "play", applyPlay);
eq("happiness +25", agents["echo-fox"].vitals.happiness, 92);

/* Train */
console.log("[h2] train cash-raptor (30 mashes → +15%, -10 nrg, 2⚡)");
eq("trainGain(0) floor", trainGain(0), 5);
eq("trainGain(30) cap", trainGain(30), 15);
eq("trainGain(9)", trainGain(9), 8);
const apBeforeTrain = ap;
act("cash-raptor", "train", (a) => applyTrain(a, 30));
eq("productivity 1 → 1.15", agents["cash-raptor"].productivity, 1.15);
eq("train energy cost", agents["cash-raptor"].vitals.energy, 78);
eq("train cost 2 AP", ap, apBeforeTrain - AP_COST.train);

/* Nap mechanics: instant 100 energy, 5-minute lock, decay paused */
console.log("[h2] fortress-tortoise naps (5 real minutes)");
act("fortress-tortoise", "nap", (a) => applyNap(a, now));
eq("nap energy 100", agents["fortress-tortoise"].vitals.energy, 100);
eq("nap status", agents["fortress-tortoise"].status, "asleep");
eq("nap is free", AP_COST.nap, 0);
const hungerAtNap = agents["fortress-tortoise"].vitals.hunger;
tickWorld(3 * 60_000); // 3 minutes in — still asleep
eq("still asleep at 3m", agents["fortress-tortoise"].status, "asleep");
eq("no decay while asleep", agents["fortress-tortoise"].vitals.hunger, hungerAtNap);
tickWorld(12 * 60_000); // 15 minutes total — woke at 5m, 10m awake since
eq("awake after nap", agents["fortress-tortoise"].status, "awake");
ok("woke event emitted", eventLog.some((e) => e.id === "fortress-tortoise" && e.kind === "woke"));
eq(
  "post-wake decay only for time awake (10m)",
  agents["fortress-tortoise"].vitals.hunger,
  hungerAtNap - 5 * (10 / 60),
);

/* AP regen: cap at 20, partial hours preserved */
console.log("[h2→h14] AP regeneration to cap");
tickWorld(12 * HOUR_MS + 30 * 60_000); // +12.5h
ok("AP capped at 20", ap <= AP_MAX);
eq("AP is at cap", ap, AP_MAX);
const apAtCap = ap;
const s1 = spendAP(ap, "feed");
ap = s1.ap;
agents["paper-wing"] = applyFeed(agents["paper-wing"]);
tickWorld(30 * 60_000); // the banked half hour + this = 1h → +1 AP
eq("banked partial hour grants the point", ap, apAtCap);

/* Insufficient AP refuses */
console.log("[misc] spendAP guards");
const broke = spendAP(1, "train");
eq("train refused at 1 AP", broke.ok, false);
eq("refused spend keeps AP", broke.ap, 1);

/* Low-stat warning fires exactly once per crossing */
console.log("[neglect] low warnings + dormancy");
const fox = () => agents["echo-fox"];
// fast-forward until echo-fox hunger crosses 15 (it decays 5/h)
while (fox().vitals.hunger >= 15 && fox().status === "awake") tickWorld(HOUR_MS);
const lowEvents = eventLog.filter((e) => e.id === "echo-fox" && e.kind === "low" && e.stat === "hunger");
eq("exactly one low-hunger warning", lowEvents.length, 1);
ok("warning value below threshold", (lowEvents[0]?.value ?? 99) < 15);

/* Dormancy at zero, then frozen */
while (fox().status === "awake") tickWorld(HOUR_MS);
eq("echo-fox went dormant", fox().status, "dormant");
ok("dormant event emitted", eventLog.some((e) => e.id === "echo-fox" && e.kind === "dormant"));
const dormantVitals = { ...fox().vitals };
tickWorld(5 * HOUR_MS);
eq("dormant agents frozen (hunger)", fox().vitals.hunger, dormantVitals.hunger);
eq("dormant agents frozen (happiness)", fox().vitals.happiness, dormantVitals.happiness);

/* Reactivation restores the creature */
console.log("[revive] reactivate echo-fox");
agents["echo-fox"] = applyActivate(agents["echo-fox"]);
eq("revived status", fox().status, "awake");
eq("revived vitals", fox().vitals.hunger, freshVitals().hunger);

/* Run the clock out to 48h total */
const elapsedH = (now - T0) / HOUR_MS;
if (elapsedH < 48) tickWorld(Math.ceil(48 - elapsedH) * HOUR_MS);
console.log(`[h48] world advanced ${((now - T0) / HOUR_MS).toFixed(1)}h total`);
for (const id of ids) {
  const a = agents[id];
  ok(`${id} vitals in range`, Object.values(a.vitals).every((v) => v >= 0 && v <= 100));
}
ok("every untouched agent eventually went dormant", agents["paper-wing"].status === "dormant");
ok("AP still within [0, 20]", ap >= 0 && ap <= AP_MAX);

/* helpers */
console.log("[misc] mood + campfire helpers");
eq("moodIndex(10)", moodIndex(10), 0);
eq("moodIndex(20)", moodIndex(20), 1);
eq("moodIndex(50)", moodIndex(50), 2);
eq("moodIndex(70)", moodIndex(70), 3);
eq("moodIndex(90)", moodIndex(90), 4);
eq(
  "overallHappiness ignores dormant",
  overallHappiness([dormantAgent(), { ...dormantAgent(), status: "awake", vitals: { hunger: 50, happiness: 60, energy: 50 } }]),
  60,
);
eq("overallHappiness of all-dormant is 0", overallHappiness([dormantAgent()]), 0);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
