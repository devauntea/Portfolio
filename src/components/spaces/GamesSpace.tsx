"use client";

/* The Game Room space — a two-cabinet retro arcade:
     🚀 VOID PATROL — the playable space shooter (enemies drop items;
        rare 📼 cartridges light up the shelf).
     🕹️ THE DEN — the original pixel room: walk the avatar, inspect
        the cartridge collection.
   The shelf on the right lists the games Devauntae actually loves; each
   cartridge collected in the shooter highlights the next one and shows
   its memory. Esc leaves (a second press if a dialog is open). */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GAMES } from "@/data/profile";
import { GameRoom } from "@/components/sections/GameRoom";
import { SpaceShooter } from "@/components/sections/SpaceShooter";
import { useOs } from "@/lib/os-store";
import { setAmbient, chime } from "@/lib/sound";

type Cabinet = "patrol" | "den";

export function GamesSpace() {
  const exitSpace = useOs((s) => s.exitSpace);
  const [cabinet, setCabinet] = useState<Cabinet>("patrol");
  const [litCount, setLitCount] = useState(0); // cartridges collected in the shooter

  useEffect(() => {
    setAmbient("game");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="dialog"]')) exitSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitSpace]);

  const litIndex = litCount === 0 ? -1 : (litCount - 1) % GAMES.length;

  return (
    <div className="crt-scanlines fixed inset-0 z-[60] overflow-y-auto bg-cosmos" aria-label="Game room space">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-1.5">
          <span className="bevel-out bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-starlight">
            🕹️ The Game Room
          </span>
          {(
            [
              ["patrol", "🚀 void patrol"],
              ["den", "🕹️ the den"],
            ] as [Cabinet, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setCabinet(id);
                chime();
              }}
              data-cursor="hand"
              aria-pressed={cabinet === id}
              className={`${cabinet === id ? "bevel-in text-gilt" : "bevel-out text-faint"} bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={exitSpace}
          data-cursor="hand"
          className="bevel-out bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-starlight active:bevel-in"
        >
          ← desktop (Esc)
        </button>
      </div>

      {/* cabinet + shelf */}
      <div className="flex min-h-full items-center justify-center p-4 pt-16">
        <div className="flex w-full max-w-6xl flex-col gap-4 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {cabinet === "patrol" ? (
              <div className="glass rounded-2xl p-4">
                <SpaceShooter onCartridge={() => setLitCount((n) => n + 1)} />
              </div>
            ) : (
              <GameRoom />
            )}
          </div>

          {/* the shelf: games Devauntae loves */}
          <aside
            className="w-full shrink-0 lg:w-72"
            aria-label="Games Devauntae loves"
          >
            <div className="bevel-out bg-panel p-3">
              <p className="titlebar-gradient px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-starlight">
                games i love
              </p>
              <p className="mt-2 px-1 font-mono text-[9px] leading-relaxed text-faint">
                {litCount === 0
                  ? "roguelikes, tactical shooters, sandboxes. shoot down a ▮ cartridge in Void Patrol to hear why."
                  : `${litCount} cartridge${litCount > 1 ? "s" : ""} recovered from the void:`}
              </p>
              <ul className="mt-2 space-y-1.5">
                {GAMES.map((g, i) => {
                  const lit = litCount > 0 && i <= litIndex;
                  const current = i === litIndex;
                  return (
                    <li
                      key={g.id}
                      className={`bevel-in p-2 transition-colors ${lit ? "bg-cosmos/40" : "bg-cosmos/80 opacity-60"}`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="h-3 w-2.5 rounded-sm"
                          style={{ background: g.color, opacity: lit ? 1 : 0.4 }}
                        />
                        <span className={`font-mono text-[11px] font-bold ${lit ? "text-starlight" : "text-faint"}`}>
                          {g.name}
                        </span>
                        {current && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="ml-auto text-xs"
                            aria-hidden
                          >
                            📼
                          </motion.span>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {current && (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-1 text-[10px] leading-relaxed text-faint"
                          >
                            {g.memory}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
