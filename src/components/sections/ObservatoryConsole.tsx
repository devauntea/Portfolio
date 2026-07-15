"use client";

/* The Summit console at the observatory: social links, email, résumé
   download, the telescope (a constellation that spells THANK YOU), the
   owner lock, and a quiet hint about the glowing green door — the DOM path
   to /garden for anyone who can't click the 3D door. */

import { useState } from "react";
import Link from "next/link";
import { CONTACT } from "@/data/profile";
import { useUi } from "@/lib/ui-store";
import { GameModal } from "@/components/ui/GameModal";
import { OwnerGate, OwnerDashboard } from "@/components/owner/Owner";
import { chime } from "@/lib/sound";

function TelescopeView({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <GameModal open={open} onClose={onClose} label="Telescope view">
      <div className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-full border-8 border-panel bg-cosmos shadow-[inset_0_0_60px_rgb(0_0_0/0.9)]">
        <div className="relative flex h-full w-full flex-col items-center justify-center gap-3">
          {/* scattered backdrop stars */}
          {Array.from({ length: 26 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="absolute h-0.5 w-0.5 rounded-full bg-starlight"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `${(i * 23) % 100}%`,
                animation: `twinkle ${2 + (i % 4)}s ease-in-out infinite`,
                animationDelay: `${(i % 5) * 0.4}s`,
              }}
            />
          ))}
          {/* the message, written in stars */}
          {["THANK", "YOU"].map((word) => (
            <p key={word} className="flex gap-2 font-mono text-2xl font-bold tracking-[0.35em] text-starlight">
              {word.split("").map((ch, i) => (
                <span
                  key={i}
                  className="glow-lumen"
                  style={{ animation: `twinkle ${2.4 + (i % 3) * 0.6}s ease-in-out infinite`, animationDelay: `${i * 0.18}s` }}
                >
                  {ch}
                </span>
              ))}
            </p>
          ))}
          <p className="absolute bottom-6 font-mono text-[9px] uppercase tracking-widest text-faint">
            — for making it all the way up —
          </p>
        </div>
      </div>
    </GameModal>
  );
}

export function ObservatoryConsole() {
  const owner = useUi((s) => s.owner);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [dashOpen, setDashOpen] = useState(false);

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-lg font-bold text-starlight">The Observatory</h2>
      <p className="mt-1 text-xs text-faint">
        End of the descent. The console below keeps every way to reach me.
      </p>

      <div className="mt-4 rounded-xl border border-seam bg-cosmos/70 p-3 font-mono text-xs">
        <div className="mb-2 flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-rose" />
          <span className="h-2 w-2 rounded-full bg-gilt" />
          <span className="h-2 w-2 rounded-full bg-sprout" />
          <span className="ml-2 text-[10px] text-faint">uplink.console</span>
        </div>
        <ul className="space-y-1.5">
          <li>
            <span className="text-faint">mail → </span>
            <a href={`mailto:${CONTACT.email}`} data-cursor="hand" className="text-lumen underline">
              {CONTACT.email}
            </a>
          </li>
          {CONTACT.links.map((l) => (
            <li key={l.label}>
              <span className="text-faint">{l.label.toLowerCase()} → </span>
              <a href={l.href} data-cursor="hand" className="text-lumen underline">
                {l.href.replace("https://", "")}
              </a>
            </li>
          ))}
          <li>
            <span className="text-faint">résumé → </span>
            <a href={CONTACT.resumeHref} download data-cursor="hand" className="text-gilt underline">
              download (placeholder pdf)
            </a>
          </li>
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setScopeOpen(true);
            chime();
          }}
          data-cursor="hand"
          className="rounded-xl bg-gilt px-4 py-2 text-sm font-semibold text-cosmos transition-transform hover:-translate-y-px"
        >
          🔭 look through the telescope
        </button>
        {owner ? (
          <button
            onClick={() => setDashOpen(true)}
            data-cursor="hand"
            className="rounded-xl border border-sprout/60 px-3 py-2 font-mono text-[11px] text-sprout transition-colors hover:bg-sprout/10"
          >
            ⛺ owner dashboard
          </button>
        ) : (
          <button
            onClick={() => setGateOpen(true)}
            data-cursor="hand"
            aria-label="Owner login"
            className="rounded-xl border border-seam px-3 py-2 font-mono text-[11px] text-faint transition-colors hover:text-starlight"
          >
            🔒 owner
          </button>
        )}
      </div>

      <p className="mt-4 text-[11px] italic text-faint/70">
        …and on the deck outside, a small door glows green.{" "}
        <Link href="/garden" data-cursor="hand" className="text-sprout underline">
          It isn&apos;t locked.
        </Link>
      </p>

      <TelescopeView open={scopeOpen} onClose={() => setScopeOpen(false)} />
      <OwnerGate open={gateOpen} onClose={() => setGateOpen(false)} />
      <OwnerDashboard open={dashOpen} onClose={() => setDashOpen(false)} />
    </div>
  );
}
