"use client";

/* DevauntaeOS: the desktop. Icons open windows (About/Projects/Hobbies/
   Contact/Display/README) or fullscreen spaces (Résumé/Gallery/Game Room);
   the taskbar shows a Start menu, buttons for open windows, the sound
   toggle, and a clock. The garden hides in the Start menu — and as a lone
   plant icon in the corner for the observant. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useOs, type AppId, type SpaceId } from "@/lib/os-store";
import { useUi } from "@/lib/ui-store";
import { setAmbient, chime } from "@/lib/sound";
import { APPS } from "./apps";
import { OsWindow } from "./Window";
import { MemeWallpaper } from "./MemeWallpaper";

const DESKTOP_ICONS: {
  id: string;
  label: string;
  icon: string;
  kind: "app" | "space" | "garden";
  target?: AppId | SpaceId;
}[] = [
  { id: "about", label: "About Me", icon: "👤", kind: "app", target: "about" },
  { id: "projects", label: "Projects", icon: "🧰", kind: "app", target: "projects" },
  { id: "resume", label: "Résumé", icon: "🗂️", kind: "space", target: "resume" },
  { id: "gallery", label: "Gallery", icon: "🖼️", kind: "space", target: "gallery" },
  { id: "games", label: "Game Room", icon: "🕹️", kind: "space", target: "games" },
  { id: "hobbies", label: "Hobbies", icon: "🌿", kind: "app", target: "hobbies" },
  { id: "contact", label: "Contact", icon: "📡", kind: "app", target: "contact" },
  { id: "display", label: "Display", icon: "🎨", kind: "app", target: "display" },
  { id: "music", label: "Music", icon: "🎧", kind: "app", target: "music" },
  { id: "readme", label: "README.txt", icon: "📄", kind: "app", target: "readme" },
];

function DesktopIcon({
  label,
  icon,
  onOpen,
}: {
  label: string;
  icon: string;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      data-cursor="hand"
      aria-label={`Open ${label}`}
      className="group flex w-20 flex-col items-center gap-1 p-1 focus-visible:outline focus-visible:outline-1 focus-visible:outline-lumen"
    >
      <span className="grid h-12 w-12 place-items-center bg-panel/60 text-2xl transition-transform group-hover:-translate-y-0.5 group-active:translate-y-0 bevel-out">
        {icon}
      </span>
      <span className="max-w-full truncate bg-cosmos/70 px-1 font-mono text-[10px] leading-tight text-starlight">
        {label}
      </span>
    </button>
  );
}

function Clock() {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = () =>
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="bevel-in bg-panel px-2.5 py-1 font-mono text-[10px] tabular-nums text-starlight">
      {time ?? "--:--"}
    </span>
  );
}

function StartMenu({ onClose }: { onClose: () => void }) {
  const openWindow = useOs((s) => s.openWindow);
  const enterSpace = useOs((s) => s.enterSpace);
  return (
    <motion.nav
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.12 }}
      aria-label="Start menu"
      className="bevel-out absolute bottom-11 left-1 z-[70] w-56 bg-panel p-1 shadow-[6px_6px_0_rgb(0_0_0/0.35)]"
    >
      <p className="titlebar-gradient mb-1 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-starlight">
        DevauntaeOS
      </p>
      {DESKTOP_ICONS.map((it) => (
        <button
          key={it.id}
          onClick={() => {
            if (it.kind === "app") openWindow(it.target as AppId);
            else enterSpace(it.target as SpaceId);
            chime();
            onClose();
          }}
          data-cursor="hand"
          className="flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] text-starlight hover:bg-seam/50"
        >
          <span aria-hidden>{it.icon}</span> {it.label}
          {it.kind === "space" && <span className="ml-auto text-[9px] text-faint">↗ space</span>}
        </button>
      ))}
      <div className="my-1 border-t border-seam" />
      <Link
        href="/garden"
        data-cursor="hand"
        onClick={onClose}
        className="flex w-full items-center gap-2 px-2 py-1.5 font-mono text-[11px] text-sprout hover:bg-seam/50"
      >
        <span aria-hidden>🌱</span> Agent Garden
        <span className="ml-auto text-[9px] text-faint">hidden</span>
      </Link>
    </motion.nav>
  );
}

export function Desktop() {
  const windows = useOs((s) => s.windows);
  const space = useOs((s) => s.space);
  const openWindow = useOs((s) => s.openWindow);
  const enterSpace = useOs((s) => s.enterSpace);
  const focusWindow = useOs((s) => s.focusWindow);
  const soundOn = useUi((s) => s.soundOn);
  const toggleSound = useUi((s) => s.toggleSound);
  const trailOn = useUi((s) => s.trailOn);
  const toggleTrail = useUi((s) => s.toggleTrail);
  const [startOpen, setStartOpen] = useState(false);

  // desktop ambience whenever no space is active
  useEffect(() => {
    if (space === null) setAmbient(soundOn ? "title" : null);
  }, [space, soundOn]);

  return (
    <div className="desktop-pattern fixed inset-0 overflow-hidden" onClick={() => startOpen && setStartOpen(false)}>
      <MemeWallpaper />
      {/* icon grid */}
      <div className="absolute left-3 top-3 z-10 grid grid-cols-3 gap-2 sm:left-4 sm:top-4 sm:grid-cols-1 sm:gap-3">
        {DESKTOP_ICONS.map((it) => (
          <DesktopIcon
            key={it.id}
            label={it.label}
            icon={it.icon}
            onOpen={() => {
              if (it.kind === "app") openWindow(it.target as AppId);
              else enterSpace(it.target as SpaceId);
              chime();
            }}
          />
        ))}
      </div>

      {/* the lone plant in the corner — the garden's quiet door */}
      <Link
        href="/garden"
        data-cursor="hand"
        aria-label="A small potted plant (it seems… alive)"
        title="it seems… alive"
        className="absolute bottom-14 right-4 text-2xl transition-transform hover:scale-125"
      >
        🪴
      </Link>

      {/* windows */}
      <AnimatePresence>
        {windows.map((w) => {
          const app = APPS[w.id];
          return (
            <OsWindow key={w.id} id={w.id} title={app.title} icon={app.icon} z={w.z} dx={w.dx} dy={w.dy} width={app.width}>
              {app.node}
            </OsWindow>
          );
        })}
      </AnimatePresence>

      {/* taskbar */}
      <div className="bevel-out absolute inset-x-0 bottom-0 z-[65] flex h-11 items-center gap-1 bg-panel px-1">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStartOpen((v) => !v);
            }}
            data-cursor="hand"
            aria-expanded={startOpen}
            aria-label="Open the Start menu"
            className={`${startOpen ? "bevel-in" : "bevel-out"} flex items-center gap-1.5 bg-panel px-3 py-1.5 font-mono text-[11px] font-bold text-starlight`}
          >
            <span aria-hidden>✦</span> START
          </button>
          <AnimatePresence>{startOpen && <StartMenu onClose={() => setStartOpen(false)} />}</AnimatePresence>
        </div>
        <div className="mx-1 h-7 w-px bg-seam" aria-hidden />
        {/* open-window buttons */}
        <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
          {windows.map((w) => (
            <button
              key={w.id}
              onClick={() => focusWindow(w.id)}
              data-cursor="hand"
              className="bevel-out max-w-36 truncate bg-panel px-2.5 py-1.5 font-mono text-[10px] text-starlight"
            >
              {APPS[w.id].icon} {APPS[w.id].title}
            </button>
          ))}
        </div>
        <button
          onClick={() => toggleTrail()}
          data-cursor="hand"
          aria-pressed={trailOn}
          title="Cursor trail on/off"
          aria-label={trailOn ? "Turn off the cursor trail" : "Turn on the cursor trail"}
          className={`${trailOn ? "bevel-in" : "bevel-out"} bg-panel px-2 py-1 text-xs`}
        >
          {trailOn ? "✨" : "🚫"}
        </button>
        <button
          onClick={() => {
            const next = toggleSound();
            setAmbient(next ? "title" : null);
          }}
          data-cursor="hand"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute sounds" : "Enable sounds"}
          className="bevel-out bg-panel px-2 py-1 text-xs"
        >
          {soundOn ? "🔊" : "🔇"}
        </button>
        <Clock />
      </div>
    </div>
  );
}
