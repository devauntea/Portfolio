/* Pure game math for the Agent Garden pet-care game.
   No React, no zustand, no browser APIs, lib/agent-store.ts wraps these
   functions, and scripts/simulate-48h.mjs runs the same code in Node to
   verify a full 48-hour cycle. Keep the syntax erasable (no enums) so
   `node` can strip types and import this file directly. */

export const HOUR_MS = 3_600_000;
export const NAP_MS = 5 * 60_000; // a nap locks the agent for 5 real minutes

export const AP_START = 10;
export const AP_MAX = 20;
export const AP_REGEN_PER_HOUR = 1;

/** Stat drain per hour while awake. Sleep pauses all decay; naps refill energy. */
export const DECAY_PER_HOUR = { hunger: 5, happiness: 3, energy: 2 } as const;
/** Crossing below this emits a "low" warning event (once per crossing). */
export const LOW_STAT = 15;

export type CareAction = "feed" | "play" | "train" | "nap";
export const AP_COST: Record<CareAction, number> = {
  feed: 1,
  play: 1,
  train: 2,
  nap: 0, // costs 5 minutes of the agent's availability instead
};

export const FEED_HUNGER = 30;
export const FEED_HAPPINESS = 10;
export const PLAY_HAPPINESS = 25;
export const TRAIN_ENERGY_COST = 10;

export type LifeStatus = "dormant" | "awake" | "asleep";

export interface Vitals {
  hunger: number; // 0–100 (0 = starving)
  happiness: number; // 0–100
  energy: number; // 0–100
}

export interface AgentCare {
  status: LifeStatus;
  vitals: Vitals;
  /** hidden productivity multiplier, starts at 1 (=100%) */
  productivity: number;
  /** epoch ms when a napping agent wakes, else null */
  sleepUntil: number | null;
  timesFed: number;
}

export interface TickEvent {
  kind: "woke" | "dormant" | "low";
  stat?: keyof Vitals;
  value?: number;
}

export const clamp01 = (v: number): number => Math.max(0, Math.min(100, v));

export const freshVitals = (): Vitals => ({
  hunger: 80,
  happiness: 70,
  energy: 90,
});

export const dormantAgent = (): AgentCare => ({
  status: "dormant",
  vitals: { hunger: 0, happiness: 0, energy: 0 },
  productivity: 1,
  sleepUntil: null,
  timesFed: 0,
});

/** 0–4 mood index from happiness (faces live in the UI layer). */
export function moodIndex(happiness: number): 0 | 1 | 2 | 3 | 4 {
  if (happiness < 15) return 0;
  if (happiness < 35) return 1;
  if (happiness < 60) return 2;
  if (happiness < 85) return 3;
  return 4;
}

/** Average happiness of non-dormant agents, drives the campfire color. */
export function overallHappiness(agents: AgentCare[]): number {
  const live = agents.filter((a) => a.status !== "dormant");
  if (live.length === 0) return 0;
  return live.reduce((s, a) => s + a.vitals.happiness, 0) / live.length;
}

/** AP regen via timestamp math: whole elapsed hours grant points; the
    remainder stays banked in lastRegen so partial progress is never lost. */
export function regenAP(
  ap: number,
  lastRegen: number,
  now: number,
): { ap: number; lastRegen: number } {
  const hours = Math.floor((now - lastRegen) / HOUR_MS);
  if (hours <= 0) return { ap, lastRegen };
  if (ap >= AP_MAX) return { ap, lastRegen: now };
  return {
    ap: Math.min(AP_MAX, ap + hours * AP_REGEN_PER_HOUR),
    lastRegen: lastRegen + hours * HOUR_MS,
  };
}

/** Spend AP for an action. Pure; the store applies the result. */
export function spendAP(
  ap: number,
  action: CareAction,
): { ok: boolean; ap: number } {
  const cost = AP_COST[action];
  if (ap < cost) return { ok: false, ap };
  return { ok: true, ap: ap - cost };
}

function decay(v: Vitals, hours: number): Vitals {
  return {
    hunger: clamp01(v.hunger - DECAY_PER_HOUR.hunger * hours),
    happiness: clamp01(v.happiness - DECAY_PER_HOUR.happiness * hours),
    energy: clamp01(v.energy - DECAY_PER_HOUR.energy * hours),
  };
}

/** Advance one agent across the window [now - elapsedMs, now].
    Dormant agents are statues: nothing changes. Sleep pauses decay; if the
    nap ends inside the window, only the time after waking decays. Any stat
    reaching 0 sends the agent dormant. Crossing LOW_STAT downward emits a
    "low" warning exactly once per crossing. */
export function tickAgent(
  a: AgentCare,
  elapsedMs: number,
  now: number,
): { agent: AgentCare; events: TickEvent[] } {
  if (a.status === "dormant" || elapsedMs <= 0) return { agent: a, events: [] };

  const events: TickEvent[] = [];
  let agent: AgentCare = { ...a, vitals: { ...a.vitals } };
  let awakeMs = elapsedMs;

  if (agent.status === "asleep") {
    const wakeAt = agent.sleepUntil ?? now;
    if (now < wakeAt) {
      return { agent, events }; // still napping: decay fully paused
    }
    // woke during this window; only the time since waking decays
    awakeMs = Math.min(elapsedMs, now - wakeAt);
    agent = { ...agent, status: "awake", sleepUntil: null };
    events.push({ kind: "woke" });
  }

  const before = agent.vitals;
  agent.vitals = decay(agent.vitals, awakeMs / HOUR_MS);

  for (const stat of ["hunger", "happiness", "energy"] as const) {
    if (
      before[stat] >= LOW_STAT &&
      agent.vitals[stat] < LOW_STAT &&
      agent.vitals[stat] > 0
    ) {
      events.push({ kind: "low", stat, value: Math.round(agent.vitals[stat]) });
    }
  }

  if (Object.values(agent.vitals).some((v) => v <= 0)) {
    agent = { ...agent, status: "dormant" };
    events.push({ kind: "dormant" });
  }

  return { agent, events };
}

/* ---------- interactions (pure; AP accounting via spendAP in the store) ---------- */

export function applyFeed(a: AgentCare): AgentCare {
  return {
    ...a,
    timesFed: a.timesFed + 1,
    vitals: {
      ...a.vitals,
      hunger: clamp01(a.vitals.hunger + FEED_HUNGER),
      happiness: clamp01(a.vitals.happiness + FEED_HAPPINESS),
    },
  };
}

export function applyPlay(a: AgentCare): AgentCare {
  return {
    ...a,
    vitals: {
      ...a.vitals,
      happiness: clamp01(a.vitals.happiness + PLAY_HAPPINESS),
    },
  };
}

/** Training gain scales with minigame mashes: 5% floor, +1% per 3 mashes, 15% cap. */
export function trainGain(mashes: number): number {
  return Math.min(15, 5 + Math.floor(mashes / 3));
}

export function applyTrain(a: AgentCare, mashes: number): AgentCare {
  return {
    ...a,
    productivity:
      Math.round((a.productivity + trainGain(mashes) / 100) * 100) / 100,
    vitals: { ...a.vitals, energy: clamp01(a.vitals.energy - TRAIN_ENERGY_COST) },
  };
}

export function applyNap(a: AgentCare, now: number): AgentCare {
  return {
    ...a,
    status: "asleep",
    sleepUntil: now + NAP_MS,
    vitals: { ...a.vitals, energy: 100 },
  };
}

export function applyActivate(a: AgentCare): AgentCare {
  return { ...a, status: "awake", sleepUntil: null, vitals: freshVitals() };
}
