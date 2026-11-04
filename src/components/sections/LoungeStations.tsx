"use client";

/* The Outdoor Lounge's hobby stations as cards, the 3D clearing behind
   shows the physical versions (lit boulder holds, spinning clay, kinetic
   sculpture). The photography card gets a mini polaroid row that
   "develops" on click. */

import { useState } from "react";
import { motion } from "framer-motion";
import { HOBBIES } from "@/data/profile";
import { chime } from "@/lib/sound";

const POLAROIDS = ["#7ee0ff", "#ffd45e", "#ff6e9a"];

function PolaroidRow() {
  const [developed, setDeveloped] = useState<number[]>([]);
  return (
    <div className="mt-2 flex gap-2">
      {POLAROIDS.map((c, i) => {
        const dev = developed.includes(i);
        return (
          <button
            key={i}
            onClick={() => {
              if (!dev) {
                setDeveloped((d) => [...d, i]);
                chime();
              }
            }}
            data-cursor="hand"
            aria-label={dev ? "Developed polaroid (placeholder)" : "Click to develop a polaroid"}
            className="h-14 w-12 rotate-[-2deg] rounded-sm border border-seam bg-starlight p-1 transition-transform hover:rotate-0 odd:rotate-2"
          >
            <div
              className="h-9 w-full rounded-[2px] transition-all duration-700"
              style={{ background: dev ? `linear-gradient(135deg, ${c}, var(--panel))` : "#22283e" }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function LoungeStations() {
  return (
    <div className="glass rounded-2xl p-5">
      <h2 className="text-lg font-bold text-starlight">The Outdoor Lounge</h2>
      <p className="mt-1 text-xs text-faint">
        A sunlit clearing off the library floor, with a station for every
        hobby out there in the grass.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {HOBBIES.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-seam bg-cosmos/60 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {h.icon}
              </span>
              <h3 className="text-sm font-semibold text-starlight">{h.name}</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-faint">{h.blurb}</p>
            {h.id === "photo" && <PolaroidRow />}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
