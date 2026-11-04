"use client";

/* Owner-side pet-care state for the Agent Garden. All game math lives in
   lib/garden-sim.ts (pure, Node-testable); this store wraps it with zustand,
   persists to localStorage, and adds the activation theater (progress bar +
   console logs + a durable server log line).

   Timestamps, not timers: tick() advances vitals/AP by wall-clock elapsed
   time, so decay and regen catch up correctly after the tab was closed.
   lastTick/lastRegen start at 0 and are armed on the first tick to avoid
   Date.now() at module init (SSR/purity). */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AgentId } from "@/data/agents";
import { AGENTS, agentDef } from "@/data/agents";
import {
  AP_START,
  applyActivate,
  applyFeed,
  applyNap,
  applyPlay,
  applyTrain,
  dormantAgent,
  regenAP,
  spendAP,
  tickAgent,
  trainGain,
  NAP_MS,
  type AgentCare,
  type CareAction,
  type TickEvent,
} from "./garden-sim";

export type ToyId = "ball" | "feather-wand" | "puzzle-cube";
export const TOYS: { id: ToyId; label: string; icon: string }[] = [
  { id: "ball", label: "Bouncy Ball", icon: "⚾" },
  { id: "feather-wand", label: "Feather Wand", icon: "🪶" },
  { id: "puzzle-cube", label: "Puzzle Cube", icon: "🧩" },
];

export type EmoteKind = "hearts" | "play" | "train" | "wake";
export interface Emote {
  n: number; // nonce, bump triggers the reaction animation
  kind: EmoteKind;
}

export interface GardenEvent {
  id: AgentId;
  ev: TickEvent;
}

export interface CareResult {
  ok: boolean;
  note: string;
}

const STEPS = [
  "handshake: opening agent link…",
  "loading config + risk rails…",
  "verifying human-in-the-loop guards…",
  "warming runtime…",
  "status → ONLINE",
];

const ALL_IDS: AgentId[] = AGENTS.map((a) => a.id);

const freshAgents = (): Record<AgentId, AgentCare> =>
  Object.fromEntries(ALL_IDS.map((id) => [id, dormantAgent()])) as Record<
    AgentId,
    AgentCare
  >;

const zeroEmotes = (): Record<AgentId, Emote> =>
  Object.fromEntries(ALL_IDS.map((id) => [id, { n: 0, kind: "hearts" }])) as Record<
    AgentId,
    Emote
  >;

interface GardenState {
  agents: Record<AgentId, AgentCare>;
  ap: number;
  lastRegen: number; // 0 = not armed yet
  lastTick: number; // 0 = not armed yet
  toyIndex: number;
  // activation theater (ephemeral)
  activating: AgentId | null;
  progress: number;
  logs: string[];
  // reaction nonces (ephemeral)
  emote: Record<AgentId, Emote>;

  /** Advance the world clock. Returns events (wakes, dormancies, low warnings). */
  tick: () => GardenEvent[];
  care: (id: AgentId, action: Exclude<CareAction, "train">) => CareResult;
  train: (id: AgentId, mashes: number) => CareResult;
  cycleToy: () => (typeof TOYS)[number];
  activate: (id: AgentId) => Promise<void>;
}

export const useGarden = create<GardenState>()(
  persist(
    (set, get) => ({
      agents: freshAgents(),
      ap: AP_START,
      lastRegen: 0,
      lastTick: 0,
      toyIndex: 0,
      activating: null,
      progress: 0,
      logs: [],
      emote: zeroEmotes(),

      tick: () => {
        const now = Date.now();
        const st = get();
        if (st.lastTick === 0) {
          set({ lastTick: now, lastRegen: now });
          return [];
        }
        const events: GardenEvent[] = [];
        const nextAgents = { ...st.agents };
        for (const id of ALL_IDS) {
          const { agent, events: evs } = tickAgent(
            st.agents[id],
            now - st.lastTick,
            now,
          );
          nextAgents[id] = agent;
          for (const ev of evs) events.push({ id, ev });
        }
        const { ap, lastRegen } = regenAP(st.ap, st.lastRegen, now);
        set({ agents: nextAgents, ap, lastRegen, lastTick: now });
        return events;
      },

      care: (id, action) => {
        const st = get();
        const a = st.agents[id];
        const def = agentDef(id);
        if (a.status === "dormant") {
          return { ok: false, note: `${def.name} is dormant. Activate it first.` };
        }
        if (a.status === "asleep") {
          const mins = Math.max(1, Math.ceil(((a.sleepUntil ?? 0) - Date.now()) / 60000));
          return { ok: false, note: `${def.name} is napping (~${mins}m left). Shhh.` };
        }
        const spent = spendAP(st.ap, action);
        if (!spent.ok) {
          return { ok: false, note: `Not enough AP. Wait for it to regenerate.` };
        }
        let agent = a;
        let note = "";
        let kind: EmoteKind = "hearts";
        if (action === "feed") {
          agent = applyFeed(a);
          note = `${def.name} devoured the ${def.favoriteFood}! +30 hunger, +10 happiness.`;
          kind = "hearts";
        } else if (action === "play") {
          const toy = TOYS[st.toyIndex];
          agent = applyPlay(a);
          note = `${def.name} chased the ${toy.label} ${toy.icon} +25 happiness.`;
          kind = "play";
        } else {
          agent = applyNap(a, Date.now());
          note = `${def.name} curled up on a mushroom, energy 100, back in ${Math.round(
            NAP_MS / 60000,
          )}m.`;
          kind = "wake";
        }
        set({
          ap: spent.ap,
          agents: { ...st.agents, [id]: agent },
          emote: { ...st.emote, [id]: { n: st.emote[id].n + 1, kind } },
        });
        return { ok: true, note };
      },

      train: (id, mashes) => {
        const st = get();
        const a = st.agents[id];
        const def = agentDef(id);
        if (a.status !== "awake") {
          return { ok: false, note: `${def.name} can't train right now.` };
        }
        const spent = spendAP(st.ap, "train");
        if (!spent.ok) {
          return { ok: false, note: "Not enough AP for training (needs 2⚡)." };
        }
        const agent = applyTrain(a, mashes);
        set({
          ap: spent.ap,
          agents: { ...st.agents, [id]: agent },
          emote: { ...st.emote, [id]: { n: st.emote[id].n + 1, kind: "train" } },
        });
        return {
          ok: true,
          note: `${def.name} trained ${def.skill}: +${trainGain(mashes)}% productivity (now ×${agent.productivity.toFixed(2)}).`,
        };
      },

      cycleToy: () => {
        const next = (get().toyIndex + 1) % TOYS.length;
        set({ toyIndex: next });
        return TOYS[next];
      },

      activate: async (id) => {
        if (get().activating) return;
        const name = agentDef(id).name;
        set({ activating: id, progress: 0, logs: [] });
        for (let i = 0; i < STEPS.length; i++) {
          await new Promise((r) => setTimeout(r, 520));
          const line = `[${name}] ${STEPS[i]}`;
          console.log(line);
          set((st) => ({
            progress: Math.round(((i + 1) / STEPS.length) * 100),
            logs: [...st.logs, line],
          }));
        }
        set((st) => ({
          agents: { ...st.agents, [id]: applyActivate(st.agents[id]) },
          activating: null,
          emote: { ...st.emote, [id]: { n: st.emote[id].n + 1, kind: "wake" } },
        }));
        // Durable audit line on the server (best-effort, owner-gated there).
        fetch("/api/agent-activation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, name }),
        }).catch(() => {});
      },
    }),
    {
      name: "archive-garden-v1",
      partialize: (s) => ({
        agents: s.agents,
        ap: s.ap,
        lastRegen: s.lastRegen,
        lastTick: s.lastTick,
        toyIndex: s.toyIndex,
      }),
    },
  ),
);
