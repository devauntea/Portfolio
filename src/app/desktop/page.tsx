"use client";

/* DevauntaeOS — the portfolio as a retro computer. A short boot screen,
   then a desktop of folders and apps: windows for the reading material,
   fullscreen spaces for the Résumé folder, the walkable Gallery, and the
   Game Room. No scrolling required — everything is a click away. */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useOs } from "@/lib/os-store";
import { useUi } from "@/lib/ui-store";
import { Desktop } from "@/components/os/Desktop";
import { ThemeApplier } from "@/components/os/apps";
import { OwnerSync } from "@/components/owner/Owner";
import { BootTour } from "@/components/os/BootTour";
import { MouseTrail } from "@/components/os/MouseTrail";
import { LEGACY_NAV } from "@/data/profile";

const ResumeSpace = dynamic(
  () => import("@/components/spaces/ResumeSpace").then((m) => ({ default: m.ResumeSpace })),
  { ssr: false },
);
const GallerySpace = dynamic(
  () => import("@/components/spaces/GallerySpace").then((m) => ({ default: m.GallerySpace })),
  { ssr: false },
);
const GamesSpace = dynamic(
  () => import("@/components/spaces/GamesSpace").then((m) => ({ default: m.GamesSpace })),
  { ssr: false },
);

const BOOT_LINES = [
  "DEVAUNTAE-OS v5.0 — BIOS OK",
  "mounting /worlds ... done",
  "loading personality drivers ... done",
  "4 agents found (dormant)",
  "startup items: resume.folder",
  "starting desktop —",
];

function BootScreen({ onDone }: { onDone: () => void }) {
  const autoResume = useUi((s) => s.autoResume);
  const [lines, setLines] = useState(0);
  const script = autoResume
    ? BOOT_LINES
    : BOOT_LINES.filter((l) => !l.startsWith("startup items"));
  const total = script.length;
  useEffect(() => {
    if (lines >= total) {
      const t = setTimeout(onDone, 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLines((n) => n + 1), 260);
    return () => clearTimeout(t);
  }, [lines, total, onDone]);
  return (
    <button
      onClick={onDone}
      aria-label="Skip boot"
      className="crt-scanlines fixed inset-0 z-[80] block w-full cursor-pointer bg-cosmos text-left"
    >
      <div className="p-6 font-mono text-xs leading-relaxed text-sprout sm:p-10 sm:text-sm">
        {script.slice(0, lines).map((l) => (
          <p key={l}>{l}</p>
        ))}
        <span className="inline-block h-4 w-2 animate-pulse bg-sprout align-middle" aria-hidden />
      </div>
    </button>
  );
}

export default function Home() {
  const space = useOs((s) => s.space);
  const booted = useOs((s) => s.booted);
  const setBooted = useOs((s) => s.setBooted);
  const claimStartup = useOs((s) => s.claimStartup);
  const enterSpace = useOs((s) => s.enterSpace);

  // Land on the desktop. Opening the résumé at boot is an explicit opt-in.
  const [tourRunning, setTourRunning] = useState(false);
  useEffect(() => {
    if (!booted) return;
    const t = setTimeout(() => {
      const { autoResume, tourSeen } = useUi.getState();
      if (!claimStartup()) return;
      if (!tourSeen) setTourRunning(true);
      else if (autoResume) enterSpace("resume");
    }, 500);
    return () => clearTimeout(t);
  }, [booted, claimStartup, enterSpace]);

  useEffect(() => () => useOs.getState().exitSpace(), []);

  return (
    <main>
      <MouseTrail />
      {booted && space === null && (
        <Link className="legacy-desk-return" href="/">{LEGACY_NAV.backToDesk}</Link>
      )}
      <ThemeApplier />
      <OwnerSync />

      <Desktop />

      <AnimatePresence>
        {space === "resume" && (
          <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ResumeSpace autoOpen />
          </motion.div>
        )}
        {space === "gallery" && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GallerySpace />
          </motion.div>
        )}
        {space === "games" && (
          <motion.div key="games" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GamesSpace />
          </motion.div>
        )}
      </AnimatePresence>

      {tourRunning && <BootTour />}

      {!booted && <BootScreen onDone={setBooted} />}
    </main>
  );
}
