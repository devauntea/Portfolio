"use client";

/* Public read-only lore modal for a creature: name, type, lore. No live data,
   no controls — that's the whole point of the public view. */

import { AGENTS } from "@/data/agents";
import { GameModal } from "@/components/ui/GameModal";

const HUE: Record<string, string> = {
  teleporter: "var(--lumen)",
  ember: "var(--ember)",
  gold: "var(--gilt)",
  toxic: "var(--sprout)",
};

export function AgentLoreModal({
  agentId,
  onClose,
}: {
  agentId: string | null;
  onClose: () => void;
}) {
  const agent = AGENTS.find((a) => a.id === agentId) ?? null;
  return (
    <GameModal open={!!agent} onClose={onClose} label={agent?.name}>
      {agent && (
        <>
          <h2 className="text-xl font-bold" style={{ color: HUE[agent.hue] }}>
            {agent.name}
          </h2>
          <p className="mt-0.5 font-mono text-[11px] uppercase tracking-widest text-faint">
            {agent.type}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-starlight/90">{agent.lore}</p>
          <p className="mt-5 rounded-xl border border-seam bg-cosmos/40 p-3 text-xs italic text-faint">
            Dormant to visitors. The owner can wake it through the Agent Link.
          </p>
        </>
      )}
    </GameModal>
  );
}
