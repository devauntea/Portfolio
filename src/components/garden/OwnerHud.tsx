"use client";

/* Owner HUD card for one agent: live vitals, mood face, and the care
   actions (feed / play / train / nap). DORMANT agents show the Activate
   flow instead, the same simulated sequence as before (progress bar +
   console logs + a durable server log line), after which the statue wakes
   into the pet-care game. All game actions route through Garden.tsx so
   toasts and the journal stay centralized. */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { AgentDef, AgentId } from "@/data/agents";
import { useGarden } from "@/lib/agent-store";
import { AP_COST, moodIndex, type LifeStatus } from "@/lib/garden-sim";

const HUE: Record<string, string> = {
  teleporter: "var(--lumen)",
  ember: "var(--ember)",
  gold: "var(--gilt)",
  toxic: "var(--sprout)",
};

export const MOOD_FACES = ["😴", "😐", "🙂", "😊", "🤩"] as const;
const MOOD_TEXT = ["dozing", "meh", "content", "happy", "ecstatic"] as const;

export function StatusPill({ status }: { status: LifeStatus }) {
  const map: Record<LifeStatus, [string, string]> = {
    dormant: ["DORMANT", "text-faint border-faint/40"],
    awake: ["AWAKE", "text-sprout border-sprout/50"],
    asleep: ["ASLEEP", "text-lumen border-lumen/50"],
  };
  const [label, cls] = map[status];
  return (
    <span className={`rounded-full border px-2 py-0.5 font-mono text-[8px] ${cls}`}>
      {label}
    </span>
  );
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.round(value);
  return (
    <div className="flex items-center gap-1.5" aria-label={`${label} ${v} of 100`}>
      <span className="w-8 text-[9px] uppercase text-faint">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-sm bg-cosmos">
        <div
          className="h-full rounded-sm transition-[width] duration-500"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
      <span className="w-7 text-right font-mono text-[9px] text-starlight">{v}</span>
    </div>
  );
}

export function OwnerHud({
  agent,
  onCare,
  onTrain,
  onActivated,
}: {
  agent: AgentDef;
  onCare: (id: AgentId, action: "feed" | "play" | "nap") => void;
  onTrain: (id: AgentId) => void;
  onActivated: (id: AgentId) => void;
}) {
  const care = useGarden((s) => s.agents[agent.id]);
  const ap = useGarden((s) => s.ap);
  const activating = useGarden((s) => s.activating);
  const progress = useGarden((s) => s.progress);
  const logs = useGarden((s) => s.logs);
  const activate = useGarden((s) => s.activate);

  const isActivating = activating === agent.id;
  const color = HUE[agent.hue];
  const mood = moodIndex(care.vitals.happiness);

  // coarse wall clock for the nap countdown; ticking in an interval keeps
  // render pure and ~15s accuracy is plenty for a 5-minute nap
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const napMins =
    care.status === "asleep" && care.sleepUntil
      ? Math.max(0, Math.ceil((care.sleepUntil - now) / 60000))
      : null;

  const awake = care.status === "awake";

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass w-full rounded-xl p-3"
      style={{ boxShadow: `0 0 24px color-mix(in srgb, ${color} 16%, transparent)` }}
      aria-label={`${agent.name} care panel`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-mono text-[10px]" style={{ color }}>
            {agent.name}
          </h3>
          <p className="mt-1 truncate text-[10px] text-faint">{agent.type}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={care.status} />
          {care.status !== "dormant" && (
            <span className="text-base leading-none" title={MOOD_TEXT[mood]} aria-label={`mood: ${MOOD_TEXT[mood]}`}>
              {MOOD_FACES[mood]}
            </span>
          )}
        </div>
      </div>

      {care.status === "dormant" && !isActivating && (
        <p className="mt-3 rounded-lg border border-seam bg-cosmos/50 p-2 text-[10px] leading-relaxed text-faint">
          A stone statue on the island. Activate it to begin care.
        </p>
      )}

      {care.status !== "dormant" && (
        <div className="mt-3 space-y-1.5">
          <Bar label="Hgr" value={care.vitals.hunger} color="var(--ember)" />
          <Bar label="Hap" value={care.vitals.happiness} color="var(--gilt)" />
          <Bar label="Nrg" value={care.vitals.energy} color="var(--lumen)" />
        </div>
      )}

      {care.status === "asleep" && (
        <p className="mt-2 text-[10px] text-lumen">
          💤 Napping, back in ~{napMins ?? "…"}m
        </p>
      )}

      {isActivating ? (
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-cosmos">
            <div
              className="h-full rounded-full bg-sprout transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <pre className="no-scrollbar mt-2 max-h-16 overflow-y-auto rounded bg-cosmos/70 p-2 font-mono text-[9px] leading-relaxed text-sprout">
            {logs.join("\n")}
          </pre>
        </div>
      ) : care.status === "dormant" ? (
        <button
          onClick={() => activate(agent.id).then(() => onActivated(agent.id))}
          disabled={!!activating}
          data-cursor="hand"
          className="mt-3 w-full rounded-lg bg-gilt py-2 font-mono text-[9px] text-cosmos transition-transform hover:-translate-y-px disabled:opacity-40"
        >
          ▶ ACTIVATE
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onCare(agent.id, "feed")}
            disabled={!awake || ap < AP_COST.feed}
            data-cursor="hand"
            title={`${agent.favoriteFood} · +30 hunger +10 happiness`}
            className="rounded-lg border border-seam py-1.5 font-mono text-[8px] text-starlight transition-colors hover:bg-seam/40 disabled:opacity-35"
          >
            🍖 FEED <span className="text-faint">{AP_COST.feed}⚡</span>
          </button>
          <button
            onClick={() => onCare(agent.id, "play")}
            disabled={!awake || ap < AP_COST.play}
            data-cursor="hand"
            title="+25 happiness"
            className="rounded-lg border border-seam py-1.5 font-mono text-[8px] text-starlight transition-colors hover:bg-seam/40 disabled:opacity-35"
          >
            ⚾ PLAY <span className="text-faint">{AP_COST.play}⚡</span>
          </button>
          <button
            onClick={() => onTrain(agent.id)}
            disabled={!awake || ap < AP_COST.train}
            data-cursor="hand"
            title={`Train ${agent.skill} (minigame)`}
            className="rounded-lg border border-seam py-1.5 font-mono text-[8px] text-starlight transition-colors hover:bg-seam/40 disabled:opacity-35"
          >
            💪 TRAIN <span className="text-faint">{AP_COST.train}⚡</span>
          </button>
          <button
            onClick={() => onCare(agent.id, "nap")}
            disabled={!awake}
            data-cursor="hand"
            title="Energy → 100, asleep 5 real minutes"
            className="rounded-lg border border-seam py-1.5 font-mono text-[8px] text-starlight transition-colors hover:bg-seam/40 disabled:opacity-35"
          >
            🌙 NAP
          </button>
        </div>
      )}
    </motion.div>
  );
}
