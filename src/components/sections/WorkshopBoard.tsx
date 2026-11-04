"use client";

/* The Workshop's project board. Each project is an orb; clicking expands
   its card (name, blurb, tech, demo-link placeholder). Cards are draggable
   inside the board for tinkering, and any project can be pinned, pins
   persist in localStorage via the ui-store. Pinned orbs float to the
   front of the rack. */

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PROJECTS, type Project } from "@/data/profile";
import { useUi } from "@/lib/ui-store";
import { chime, thunk } from "@/lib/sound";

function Orb({ p, active, onClick }: { p: Project; active: boolean; onClick: () => void }) {
  const pinned = useUi((s) => s.pinned.includes(p.id));
  return (
    <button
      onClick={onClick}
      data-cursor="hand"
      aria-expanded={active}
      aria-label={`${p.name}${pinned ? " (pinned)" : ""}`}
      className={`relative h-14 w-14 rounded-full transition-transform hover:scale-110 ${active ? "scale-110" : ""}`}
      style={{
        background: `radial-gradient(circle at 32% 30%, color-mix(in srgb, ${p.hue} 80%, white), color-mix(in srgb, ${p.hue} 45%, transparent) 60%, transparent 78%)`,
        boxShadow: active ? `0 0 26px color-mix(in srgb, ${p.hue} 60%, transparent)` : `0 0 14px color-mix(in srgb, ${p.hue} 30%, transparent)`,
      }}
    >
      <span className="pointer-events-none absolute inset-0 grid place-items-center text-xl drop-shadow" aria-hidden>
        {p.art}
      </span>
      {pinned && (
        <span className="absolute -right-1 -top-1 text-xs" aria-hidden>
          📌
        </span>
      )}
    </button>
  );
}

export function WorkshopBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const pinned = useUi((s) => s.pinned);
  const togglePin = useUi((s) => s.togglePin);

  const ordered = [...PROJECTS].sort(
    (a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)),
  );
  const active = PROJECTS.find((p) => p.id === activeId) ?? null;

  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-lg font-bold text-starlight">The Workshop</h2>
      <p className="mt-1 text-xs text-faint">
        Projects hang here as orbs. Click one, drag its card around, and pin the
        ones worth keeping on the board.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        {ordered.map((p) => (
          <Orb
            key={p.id}
            p={p}
            active={activeId === p.id}
            onClick={() => {
              setActiveId(activeId === p.id ? null : p.id);
              chime();
            }}
          />
        ))}
      </div>

      <div ref={boardRef} className="relative mt-4 min-h-[13rem]">
        <AnimatePresence mode="popLayout">
          {active && (
            <motion.article
              key={active.id}
              drag
              dragConstraints={boardRef}
              dragMomentum={false}
              whileDrag={{ scale: 1.03, rotate: 0.6 }}
              initial={{ opacity: 0, scale: 0.8, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              data-cursor="hand"
              aria-label={`${active.name} card (draggable)`}
              className="cursor-grab rounded-2xl border border-seam bg-cosmos/70 p-4 active:cursor-grabbing"
              style={{ boxShadow: `0 0 30px color-mix(in srgb, ${active.hue} 22%, transparent)` }}
            >
              {/* preview banner, art glyph over a project-tinted gradient */}
              <div
                className="mb-3 grid h-24 place-items-center overflow-hidden rounded-xl border border-seam"
                aria-hidden
                style={{
                  background: `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${active.hue} 55%, transparent), transparent 70%), linear-gradient(135deg, color-mix(in srgb, ${active.hue} 30%, var(--cosmos)), var(--cosmos))`,
                }}
              >
                <span className="text-4xl drop-shadow-[0_2px_6px_rgb(0_0_0/0.5)]">{active.art}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold" style={{ color: active.hue }}>
                  {active.name}
                </h3>
                <button
                  onClick={() => {
                    togglePin(active.id);
                    if (pinned.includes(active.id)) thunk();
                    else chime();
                  }}
                  data-cursor="hand"
                  aria-pressed={pinned.includes(active.id)}
                  className="shrink-0 rounded-full border border-seam px-2 py-0.5 font-mono text-[10px] text-faint transition-colors hover:text-starlight"
                >
                  {pinned.includes(active.id) ? "📌 pinned" : "📍 pin"}
                </button>
              </div>
              {/* mini screenshot placeholder */}
              <div
                className="mt-3 h-20 rounded-lg border border-seam"
                style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${active.hue} 35%, transparent), var(--panel))` }}
                aria-label="Screenshot placeholder"
              />
              <p className="mt-3 text-xs leading-relaxed text-faint">{active.blurb}</p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {active.tech.map((t) => (
                  <span key={t} className="rounded bg-seam/60 px-1.5 py-0.5 font-mono text-[10px] text-lumen">
                    {t}
                  </span>
                ))}
              </div>
              {active.link && (
                <a
                  href={active.link}
                  target="_blank"
                  rel="noreferrer"
                  data-cursor="hand"
                  className="mt-3 inline-block text-xs text-lumen underline"
                >
                  {active.link.includes("github.com") ? "view on GitHub ↗" : "live site ↗"}
                </a>
              )}
            </motion.article>
          )}
        </AnimatePresence>
        {!active && (
          <p className="absolute inset-0 grid place-items-center font-mono text-[11px] text-faint/60">
            ( pick an orb )
          </p>
        )}
      </div>
    </div>
  );
}
