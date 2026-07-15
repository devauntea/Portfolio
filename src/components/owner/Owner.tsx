"use client";

/* Owner-only surface: the password gate (server-checked → httpOnly cookie,
   same contract as the garden) and the dashboard — live agent statuses
   from the shared garden store, an Add Agent placeholder, and the manual
   activation steps so Devauntae can always find them on the site itself. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AGENTS } from "@/data/agents";
import { useGarden } from "@/lib/agent-store";
import { useUi } from "@/lib/ui-store";
import { GameModal } from "@/components/ui/GameModal";
import { StatusPill } from "@/components/garden/OwnerHud";

/** Sync the owner flag from the httpOnly cookie once per page load. */
export function OwnerSync() {
  const setOwner = useUi((s) => s.setOwner);
  useEffect(() => {
    fetch("/api/agent-link")
      .then((r) => r.json())
      .then((d) => setOwner(!!d.owner))
      .catch(() => {});
  }, [setOwner]);
  return null;
}

export function OwnerGate({ open, onClose }: { open: boolean; onClose: () => void }) {
  const setOwner = useUi((s) => s.setOwner);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    const res = await fetch("/api/agent-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    setBusy(false);
    if (res.ok) {
      setPw("");
      setOwner(true);
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Access denied.");
    }
  }

  return (
    <GameModal open={open} onClose={onClose} label="Owner login">
      <h2 className="font-mono text-sm font-bold text-lumen">THE ARCHIVIST&apos;S KEY</h2>
      <p className="mt-2 text-sm text-faint">
        The Archive opens fully only for its keeper — the agent dashboard and
        the garden behind the green door.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <motion.div animate={err ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="owner password"
            autoFocus
            data-cursor="hand"
            className="h-11 w-full rounded-xl border border-seam bg-cosmos/60 px-4 text-sm text-starlight outline-none transition-colors placeholder:text-faint/50 focus-visible:border-lumen focus-visible:ring-2 focus-visible:ring-lumen/40"
          />
        </motion.div>
        {err && (
          <p role="alert" className="text-xs text-rose">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || pw.length === 0}
          data-cursor="hand"
          className="w-full rounded-xl bg-gilt py-2.5 font-semibold text-cosmos transition-transform hover:-translate-y-px disabled:opacity-40"
        >
          {busy ? "Turning the key…" : "Unlock"}
        </button>
        <p className="text-center text-[11px] text-faint/60">
          Checked server-side (OWNER_PASSWORD in .env.local); the secret never
          reaches the browser bundle.
        </p>
      </form>
    </GameModal>
  );
}

const ACTIVATION_STEPS: { name: string; steps: string }[] = [
  {
    name: "1 · Job Application Agent (Paper Wing)",
    steps:
      "Build a Node.js script with Puppeteer/Playwright that applies on LinkedIn/Indeed. Keep credentials in a .env file. Run it on a schedule (Vercel Cron or AWS Lambda) and expose a small status API endpoint. Then point the garden's data source at that endpoint.",
  },
  {
    name: "2 · Web Search Agent (Echo Fox)",
    steps:
      "Create a Python/FastAPI service that queries SerpAPI (or drives headless Chrome). Deploy it, add a status endpoint, and update the garden's data source.",
  },
  {
    name: "3 · YouTube/Pinterest Agent (Cash Raptor)",
    steps:
      "Use Remotion for Shorts and the Canva API for pins; schedule posts. Host the script on a schedule and expose an endpoint returning the last action and earnings.",
  },
  {
    name: "4 · Investment Agent (Fortress Tortoise)",
    steps:
      "Start with Alpaca paper trading. Only when confident, consider a real brokerage. Expose daily P&L and positions through an endpoint.",
  },
];

export function OwnerDashboard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const agents = useGarden((s) => s.agents);
  const setOwner = useUi((s) => s.setOwner);

  async function unlink() {
    await fetch("/api/agent-link", { method: "DELETE" });
    setOwner(false);
    onClose();
  }

  return (
    <GameModal open={open} onClose={onClose} label="Owner dashboard">
      <h2 className="font-mono text-sm font-bold text-sprout">KEEPER&apos;S DASHBOARD</h2>

      <h3 className="mt-4 font-mono text-[10px] uppercase tracking-widest text-faint">Manage agents</h3>
      <ul className="mt-2 space-y-1.5">
        {AGENTS.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded-xl border border-seam bg-cosmos/50 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium text-starlight">{a.name}</div>
              <div className="text-[10px] text-faint">{a.type}</div>
            </div>
            <StatusPill status={agents[a.id].status} />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex gap-2">
        <Link
          href="/garden"
          data-cursor="hand"
          className="flex-1 rounded-xl bg-gilt py-2 text-center font-mono text-[11px] font-semibold text-cosmos transition-transform hover:-translate-y-px"
        >
          🌱 open the garden
        </Link>
        <button
          disabled
          title="Placeholder — wire a real registration flow later"
          className="flex-1 rounded-xl border border-dashed border-seam py-2 font-mono text-[11px] text-faint opacity-60"
        >
          + add agent (soon)
        </button>
      </div>

      <h3 className="mt-5 font-mono text-[10px] uppercase tracking-widest text-faint">
        Making them real — manual activation steps
      </h3>
      <div className="no-scrollbar mt-2 max-h-44 space-y-2 overflow-y-auto">
        {ACTIVATION_STEPS.map((s) => (
          <details key={s.name} className="rounded-xl border border-seam bg-cosmos/50 p-2.5">
            <summary data-cursor="hand" className="cursor-pointer text-xs font-medium text-starlight">
              {s.name}
            </summary>
            <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{s.steps}</p>
          </details>
        ))}
        <p className="text-[11px] leading-relaxed text-faint/80">
          Wire all endpoints into one Next.js API route (or a small aggregator).
          The garden frontend already consumes one status shape — just update
          the API URLs when the real services exist.
        </p>
      </div>

      <button
        onClick={unlink}
        data-cursor="hand"
        className="mt-4 w-full rounded-xl border border-seam py-2 font-mono text-[11px] text-faint transition-colors hover:text-starlight"
      >
        hang up the key
      </button>
    </GameModal>
  );
}
