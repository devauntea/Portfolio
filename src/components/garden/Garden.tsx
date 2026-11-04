"use client";

/* Agent Garden orchestrator, the pet-care game shell.
   Public visitors get the frozen island diorama + lore modals. Owners get
   the live game: vitals ticking on wall-clock time, AP economy, station
   targeting (click a station, then a creature), the training minigame,
   toasts, and a durable care journal (memory/garden_journal.md via an
   owner-gated API). Owner status is confirmed by the server (httpOnly
   cookie), so none of this is spoofable client-side. */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { AGENTS, agentDef, type AgentId } from "@/data/agents";
import { useGarden } from "@/lib/agent-store";
import { AP_MAX, HOUR_MS, moodIndex, type AgentCare } from "@/lib/garden-sim";
import type { HeldAction, StationId } from "./IslandScene";
import { AgentLink } from "./AgentLink";
import { AgentLoreModal } from "./AgentLoreModal";
import { OwnerHud } from "./OwnerHud";
import { TrainingGame } from "./TrainingGame";

const IslandScene = dynamic(
  () => import("./IslandScene").then((m) => ({ default: m.IslandScene })),
  { ssr: false },
);
const PixelGarden = dynamic(
  () => import("./PixelGarden").then((m) => ({ default: m.PixelGarden })),
  { ssr: false },
);

const HELD_HINT: Record<Exclude<HeldAction, null>, string> = {
  feed: "🍖 Holding kibble. Click a creature to feed it",
  train: "💪 Training armed. Click the creature to coach",
  nap: "🌙 Nap time. Click the creature to tuck in",
};

function statusPhrase(care: AgentCare): string {
  if (care.status === "dormant") return "dormant";
  if (care.status === "asleep") return "napping, energy restored";
  const { hunger, happiness, energy } = care.vitals;
  if (hunger < 35) return `hungry (${Math.round(hunger)}%), wants food`;
  if (energy < 35) return `tired (${Math.round(energy)}% energy)`;
  const words = ["miserable", "gloomy", "content", "happy", "ecstatic"];
  return `${words[moodIndex(happiness)]} (${Math.round(happiness)}%)`;
}

/* AP chip with a "next point" countdown (clock state lives in an effect) */
function ApChip() {
  const ap = useGarden((s) => s.ap);
  const lastRegen = useGarden((s) => s.lastRegen);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  const minsToNext =
    ap >= AP_MAX || lastRegen === 0
      ? null
      : Math.max(0, Math.ceil((lastRegen + HOUR_MS - now) / 60000));
  return (
    <div
      role="status"
      aria-label={`${ap} of ${AP_MAX} action points`}
      className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[9px] text-starlight"
    >
      <span aria-hidden>⚡</span>
      {ap}
      <span className="text-faint">/{AP_MAX}</span>
      {minsToNext !== null && <span className="text-[8px] text-faint">+1 in {minsToNext}m</span>}
    </div>
  );
}

export function Garden({ initialOwner }: { initialOwner: boolean }) {
  const [owner, setOwner] = useState(initialOwner);
  const [linkOpen, setLinkOpen] = useState(false);
  const [selected, setSelected] = useState<AgentId | null>(null);
  const [pixelView, setPixelView] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [held, setHeld] = useState<HeldAction>(null);
  const [trainee, setTrainee] = useState<AgentId | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalLines, setJournalLines] = useState<string[]>([]);

  const tick = useGarden((s) => s.tick);
  const careAction = useGarden((s) => s.care);
  const trainAction = useGarden((s) => s.train);
  const cycleToy = useGarden((s) => s.cycleToy);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const journal = useCallback(
    (line: string) => {
      if (!owner) return;
      fetch("/api/garden-journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line }),
      }).catch(() => {});
    },
    [owner],
  );

  // world clock: catch up on mount, then every 30s. Emits care alerts.
  useEffect(() => {
    const run = () => {
      const events = tick();
      if (!owner) return; // world advances, but alerts are an owner affordance
      for (const { id, ev } of events) {
        const name = agentDef(id).name;
        if (ev.kind === "woke") {
          setToast(`☀️ ${name} woke up from its nap, fully rested.`);
          journal(`${name} woke up from its nap (energy 100).`);
        } else if (ev.kind === "dormant") {
          setToast(`💀 ${name} ran out of care and went dormant!`);
          journal(`${name} went DORMANT from neglect. Reactivate it at its statue.`);
        } else if (ev.kind === "low") {
          setToast(`⚠️ ${name}: ${ev.stat} at ${ev.value}%. Nearly dormant!`);
          journal(`ALERT: ${name} ${ev.stat} dropped to ${ev.value}%, close to dormancy.`);
        }
      }
    };
    run();
    const t = setInterval(run, 30_000);
    return () => clearInterval(t);
  }, [tick, journal, owner]);

  // Esc cancels a held action
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHeld(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const doCare = useCallback(
    (id: AgentId, action: "feed" | "play" | "nap") => {
      const r = careAction(id, action);
      setToast(r.note);
      if (r.ok) journal(r.note);
    },
    [careAction, journal],
  );

  function handleStation(s: StationId) {
    if (s === "toys") {
      const toy = cycleToy();
      setToast(`Toy chest: ${toy.icon} ${toy.label} is out!`);
      return;
    }
    const map: Record<Exclude<StationId, "toys">, Exclude<HeldAction, null>> = {
      food: "feed",
      train: "train",
      nap: "nap",
    };
    setHeld((h) => (h === map[s] ? null : map[s]));
  }

  function startTraining(id: AgentId) {
    const st = useGarden.getState();
    if (st.agents[id].status !== "awake") {
      setToast(`${agentDef(id).name} can't train right now.`);
    } else if (st.ap < 2) {
      setToast("Not enough AP for training (needs 2⚡).");
    } else {
      setTrainee(id);
    }
  }

  function handleTarget(id: AgentId) {
    if (!held) return;
    if (held === "train") startTraining(id);
    else doCare(id, held);
    setHeld(null);
  }

  function handleTrainDone(mashes: number) {
    if (!trainee) return;
    const r = trainAction(trainee, mashes);
    setToast(r.note);
    if (r.ok) journal(`${r.note} (${mashes} hits in the minigame)`);
    setTrainee(null);
  }

  function selectCreature(id: AgentId) {
    if (owner) {
      document
        .getElementById(`hud-${id}`)
        ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    } else {
      setSelected(id);
    }
  }

  function statusReport() {
    const st = useGarden.getState();
    const parts = AGENTS.map((a) => `${a.name}: ${statusPhrase(st.agents[a.id])}`);
    const line = `Agent Garden status: ${parts.join(". ")}. AP remaining: ${st.ap}.`;
    setToast(line);
    journal(line);
  }

  async function openJournal() {
    setJournalOpen(true);
    try {
      const res = await fetch("/api/garden-journal");
      const d = await res.json();
      setJournalLines(Array.isArray(d.lines) ? d.lines : []);
    } catch {
      setJournalLines(["(journal unavailable)"]);
    }
  }

  async function logout() {
    await fetch("/api/agent-link", { method: "DELETE" });
    setOwner(false);
    setPixelView(false);
    setHeld(null);
    setToast("Agent Link closed. The island is a quiet diorama again.");
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-cosmos">
      {/* scene */}
      {pixelView && owner ? (
        <div className="absolute inset-0 flex items-center justify-center overflow-y-auto p-4 pb-56 pt-24">
          <PixelGarden
            held={held}
            onSelect={selectCreature}
            onTarget={handleTarget}
            onStation={handleStation}
          />
        </div>
      ) : (
        <div className="absolute inset-0">
          <Canvas dpr={[1, 1.75]} camera={{ position: [0, 3.6, 10], fov: 50 }}>
            <IslandScene
              owner={owner}
              held={held}
              onSelect={selectCreature}
              onTarget={handleTarget}
              onStation={handleStation}
            />
          </Canvas>
        </div>
      )}

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between p-4 sm:p-6">
        <div className="pointer-events-auto">
          <Link
            href="/"
            data-cursor="hand"
            className="font-mono text-xs text-faint transition-colors hover:text-starlight"
          >
            ← back through the door
          </Link>
          <h1 className="glow-lumen mt-2 font-mono text-lg text-starlight">AGENT GARDEN</h1>
          <p className="mt-1 max-w-xs text-xs text-faint">
            {owner
              ? "Owner mode: feed, play, train, nap. Keep every stat above zero."
              : "A floating island of four agent creatures. Click one to read its lore."}
          </p>
        </div>
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {owner && (
              <button
                onClick={() => setPixelView((v) => !v)}
                data-cursor="hand"
                className="rounded-lg border border-seam px-3 py-1.5 font-mono text-[9px] text-lumen transition-colors hover:bg-seam/40"
              >
                {pixelView ? "◲ 3D VIEW" : "▦ PIXEL VIEW"}
              </button>
            )}
            {owner ? (
              <button
                onClick={logout}
                data-cursor="hand"
                className="rounded-lg border border-seam px-3 py-1.5 font-mono text-[11px] text-faint transition-colors hover:text-starlight"
              >
                unlink
              </button>
            ) : (
              <button
                onClick={() => setLinkOpen(true)}
                data-cursor="hand"
                className="flex items-center gap-1 rounded-lg border border-gilt/50 px-3 py-1.5 font-mono text-[9px] text-gilt transition-colors hover:bg-gilt/10"
              >
                🔒 AGENT LINK
              </button>
            )}
          </div>
          {owner && (
            <div className="flex items-center gap-2">
              <button
                onClick={statusReport}
                data-cursor="hand"
                className="rounded-lg border border-seam px-2.5 py-1 font-mono text-[8px] text-faint transition-colors hover:text-starlight"
              >
                STATUS
              </button>
              <button
                onClick={openJournal}
                data-cursor="hand"
                className="rounded-lg border border-seam px-2.5 py-1 font-mono text-[8px] text-faint transition-colors hover:text-starlight"
              >
                JOURNAL
              </button>
              <ApChip />
            </div>
          )}
        </div>
      </div>

      {/* held-action banner */}
      <AnimatePresence>
        {owner && held && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 font-mono text-[9px] text-gilt"
          >
            {HELD_HINT[held]} <span className="text-faint">(Esc to cancel)</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* owner HUD row */}
      {owner && !pixelView && (
        <div className="no-scrollbar pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex snap-x gap-3 overflow-x-auto p-4 sm:grid sm:grid-cols-4 sm:p-6">
          {AGENTS.map((a) => (
            <div key={a.id} id={`hud-${a.id}`} className="w-64 shrink-0 snap-center sm:w-auto">
              <OwnerHud
                agent={a}
                onCare={doCare}
                onTrain={startTraining}
                onActivated={(id) => {
                  const name = agentDef(id).name;
                  setToast(`⚡ ${name}'s statue cracks open. It's awake!`);
                  journal(`${name} activated: statue to living creature, vitals reset.`);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="glass pointer-events-none absolute left-1/2 top-28 z-40 w-max max-w-[85vw] -translate-x-1/2 rounded-2xl px-4 py-2 text-center text-sm"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* journal drawer */}
      <AnimatePresence>
        {journalOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="glass fixed inset-y-0 right-0 z-50 w-[min(24rem,92vw)] overflow-y-auto rounded-l-2xl p-5"
            aria-label="Garden journal"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-mono text-xs text-starlight">GARDEN JOURNAL</h2>
              <button
                onClick={() => setJournalOpen(false)}
                data-cursor="hand"
                aria-label="Close journal"
                className="rounded-md p-1 text-faint transition-colors hover:text-starlight"
              >
                ✕
              </button>
            </div>
            {journalLines.length === 0 ? (
              <p className="text-xs text-faint/70">No entries yet. Go care for somebody.</p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-faint">
                {journalLines.join("\n")}
              </pre>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <AgentLoreModal agentId={selected} onClose={() => setSelected(null)} />
      <TrainingGame
        agent={trainee ? agentDef(trainee) : null}
        onDone={handleTrainDone}
        onCancel={() => setTrainee(null)}
      />
      <AgentLink
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        onUnlocked={() => {
          setOwner(true);
          setToast("Agent Link established. Welcome back, caretaker.");
        }}
      />
    </div>
  );
}
