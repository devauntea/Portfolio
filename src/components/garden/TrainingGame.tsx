"use client";

/* Training Post minigame: 5 seconds of button-mashing (click/tap or Space).
   More mashes → bigger productivity gain (see trainGain in garden-sim).
   AP is only spent when the round finishes, closing early costs nothing.
   Each trainee gets a fresh <Round> via key-remount, so there is no
   reset-state-in-effect (React 19 lint). */

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentDef } from "@/data/agents";
import { trainGain, AP_COST } from "@/lib/garden-sim";
import { GameModal } from "@/components/ui/GameModal";

const ROUND_MS = 5000;

export function TrainingGame({
  agent,
  onDone,
  onCancel,
}: {
  agent: AgentDef | null;
  onDone: (mashes: number) => void;
  onCancel: () => void;
}) {
  return (
    <GameModal open={!!agent} onClose={onCancel} variant="pixel" label="Training">
      {agent && <Round key={agent.id} agent={agent} onDone={onDone} />}
    </GameModal>
  );
}

function Round({
  agent,
  onDone,
}: {
  agent: AgentDef;
  onDone: (mashes: number) => void;
}) {
  const [mashes, setMashes] = useState(0);
  const [msLeft, setMsLeft] = useState(ROUND_MS);
  const [running, setRunning] = useState(false);
  const finished = useRef(false);

  const mash = useCallback(() => {
    if (finished.current) return;
    setRunning(true); // first hit starts the clock
    setMashes((m) => m + 1);
  }, []);

  // countdown (endAt timestamp math, hidden-tab timer throttling only
  // delays the *display*, not the deadline)
  useEffect(() => {
    if (!running) return;
    const endAt = Date.now() + ROUND_MS;
    const t = setInterval(() => {
      const left = Math.max(0, endAt - Date.now());
      setMsLeft(left);
      if (left === 0 && !finished.current) {
        finished.current = true;
        clearInterval(t);
      }
    }, 100);
    return () => clearInterval(t);
  }, [running]);

  // hand the result back once the round ends
  useEffect(() => {
    if (msLeft !== 0) return;
    const t = setTimeout(() => onDone(mashes), 650); // brief "TIME!" beat
    return () => clearTimeout(t);
  }, [msLeft, mashes, onDone]);

  // Space mashes too
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        mash();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mash]);

  const pct = Math.round((msLeft / ROUND_MS) * 100);

  return (
    <div className="text-center">
      <h2 className="font-mono text-sm text-gilt">TRAINING POST</h2>
      <p className="mt-2 text-xs text-faint">
        {agent.name} trains <span className="text-starlight">{agent.skill}</span>.
        Mash the button (or Space) for {ROUND_MS / 1000}s! Costs {AP_COST.train}⚡ when the bell rings.
      </p>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-sm border border-seam bg-cosmos">
        <div
          className="h-full bg-rose transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>

      <button
        onClick={mash}
        disabled={msLeft === 0}
        data-cursor="hand"
        className="mt-4 w-full select-none rounded-xl bg-gilt py-6 font-mono text-sm text-cosmos transition-transform active:scale-95 disabled:opacity-50"
      >
        {msLeft === 0 ? "⏰ TIME!" : running ? "💥 MASH!" : "▶ START MASHING!"}
      </button>

      <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-faint">
        <span>
          hits: <span className="text-starlight">{mashes}</span>
        </span>
        <span>
          gain: <span className="text-sprout">+{trainGain(mashes)}%</span> productivity
        </span>
      </div>
      <p className="mt-2 text-[10px] text-faint/60">close before the bell to cancel (no AP spent)</p>
    </div>
  );
}
