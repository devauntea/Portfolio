"use client";

/* Glassmorphism owner-login. Posts the password to the server route (which
   checks OWNER_PASSWORD and sets an httpOnly cookie), the secret never enters
   the client bundle. Shows an error on a wrong password. */

import { useState } from "react";
import { motion } from "framer-motion";
import { GameModal } from "@/components/ui/GameModal";

export function AgentLink({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
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
      onUnlocked();
      onClose();
    } else {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? "Access denied.");
    }
  }

  return (
    <GameModal open={open} onClose={onClose} label="Agent Link">
      <h2 className="font-mono text-sm text-lumen">AGENT LINK</h2>
      <p className="mt-3 text-sm text-faint">
        Owner access wakes the caretaker tools: live HUDs, the pixel view, and
        agent activation. Visitors can keep exploring the cavern.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
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
          {busy ? "Linking…" : "Establish Link"}
        </button>
        <p className="text-center text-[11px] text-faint/60">
          Auth is checked server-side (OWNER_PASSWORD in .env.local), so the secret
          never ships to the browser. Change it before you deploy.
        </p>
      </form>
    </GameModal>
  );
}
