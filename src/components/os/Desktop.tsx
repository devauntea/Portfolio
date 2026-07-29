"use client";

/* DevauntaeOS: the desktop. Icons open windows (About/Projects/Hobbies/
   Contact/Display/README) or fullscreen spaces (Résumé/Gallery/Game Room)
   and can be dragged anywhere on the snap grid; the taskbar shows a Start
   menu, buttons for open windows, the sound toggle, and a clock. The
   garden hides in the Start menu — and as a lone plant in the corner for
   the observant. */

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useOs, type AppId, type SpaceId } from "@/lib/os-store";
import { useUi } from "@/lib/ui-store";
import { useDesktop } from "@/lib/desktop-store";
import { setAmbient, chime } from "@/lib/sound";
import { APPS } from "./apps";
import { OsWindow } from "./Window";
import { MemeWallpaper } from "./MemeWallpaper";
import { PixelIcon, type PixelIconId } from "./PixelIcons";
import { IconGrid, useGrid, type DesktopItem } from "./IconGrid";

const DESKTOP_ICONS: (DesktopItem & {
  icon: PixelIconId;
  kind: "app" | "space";
  target: AppId | SpaceId;
})[] = [
  { id: "about", label: "About Me", icon: "about", kind: "app", target: "about" },
  { id: "projects", label: "Projects", icon: "projects", kind: "app", target: "projects" },
  { id: "resume", label: "Résumé", icon: "resume", kind: "space", target: "resume" },
  { id: "gallery", label: "Gallery", icon: "gallery", kind: "space", target: "gallery" },
  { id: "games", label: "Game Room", icon: "games", kind: "space", target: "games" },
  { id: "hobbies", label: "Hobbies", icon: "hobbies", kind: "app", target: "hobbies" },
  { id: "contact", label: "Contact", icon: "contact", kind: "app", target: "contact" },
  { id: "display", label: "Display", icon: "display", kind: "app", target: "display" },
  { id: "music", label: "Music", icon: "music", kind: "app", target: "music" },
  { id: "readme", label: "README.txt", icon: "readme", kind: "app", target: "readme" },
];

/** stable list for the grid (identity matters — it drives a layout effect) */
const GRID_ITEMS: DesktopItem[] = DESKTOP_ICONS.map(({ id, label, icon }) => ({
  id,
  label,
  icon,
}));

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
          <PixelIcon id={it.icon} className="h-4 w-4 shrink-0" /> {it.label}
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
        <PixelIcon id="garden" className="h-4 w-4 shrink-0" /> Agent Garden
        <span className="ml-auto text-[9px] text-faint">hidden</span>
      </Link>
    </motion.nav>
  );
}

function DesktopMenu({
  at,
  onClose,
}: {
  at: { x: number; y: number };
  onClose: () => void;
}) {
  const grid = useGrid();
  const tidy = useDesktop((s) => s.tidy);
  const enterSpace = useOs((s) => s.enterSpace);
  const openWindow = useOs((s) => s.openWindow);

  const items: [string, () => void][] = [
    [
      "Tidy icons",
      () => tidy(GRID_ITEMS.map((i) => i.id), grid?.rows ?? 6),
    ],
    ["Open Résumé", () => enterSpace("resume")],
    ["Display settings…", () => openWindow("display")],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
      role="menu"
      aria-label="Desktop"
      style={{ left: at.x, top: at.y }}
      className="bevel-out absolute z-[75] w-44 bg-panel p-1 shadow-[5px_5px_0_rgb(0_0_0/0.35)]"
    >
      {items.map(([label, run]) => (
        <button
          key={label}
          role="menuitem"
          onClick={() => {
            run();
            chime();
            onClose();
          }}
          data-cursor="hand"
          className="block w-full px-2 py-1.5 text-left font-mono text-[11px] text-starlight hover:bg-seam/50"
        >
          {label}
        </button>
      ))}
    </motion.div>
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
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  // desktop ambience whenever no space is active
  useEffect(() => {
    if (space === null) setAmbient(soundOn ? "title" : null);
  }, [space, soundOn]);

  const launch = (id: string) => {
    const it = DESKTOP_ICONS.find((i) => i.id === id);
    if (!it) return;
    if (it.kind === "app") openWindow(it.target as AppId);
    else enterSpace(it.target as SpaceId);
    chime();
  };

  return (
    <div
      className="desktop-pattern fixed inset-0 overflow-hidden"
      onClick={() => {
        if (startOpen) setStartOpen(false);
        if (menu) setMenu(null);
      }}
      onContextMenu={(e) => {
        /* only the bare desktop gets the menu — icons and windows keep the
           browser's own */
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        setMenu({
          x: Math.min(e.clientX, window.innerWidth - 190),
          y: Math.min(e.clientY, window.innerHeight - 130),
        });
      }}
    >
      <MemeWallpaper />

      <IconGrid items={GRID_ITEMS} onOpen={launch} />

      <AnimatePresence>
        {menu && <DesktopMenu at={menu} onClose={() => setMenu(null)} />}
      </AnimatePresence>

      {/* the lone plant in the corner — the garden's quiet door */}
      <Link
        href="/garden"
        data-cursor="hand"
        aria-label="A small potted plant (it seems… alive)"
        title="it seems… alive"
        className="absolute bottom-14 right-4 z-20 block h-7 w-7 transition-transform hover:scale-125"
      >
        <PixelIcon id="garden" className="h-full w-full" />
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
            <PixelIcon id="start" className="h-3.5 w-3.5" /> START
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
              className="bevel-out flex max-w-36 items-center gap-1.5 truncate bg-panel px-2.5 py-1.5 font-mono text-[10px] text-starlight"
            >
              <PixelIcon id={APPS[w.id].icon} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{APPS[w.id].title}</span>
            </button>
          ))}
        </div>
        <button
          onClick={() => toggleTrail()}
          data-cursor="hand"
          aria-pressed={trailOn}
          title="Cursor trail on/off"
          aria-label={trailOn ? "Turn off the cursor trail" : "Turn on the cursor trail"}
          className={`${trailOn ? "bevel-in" : "bevel-out"} bg-panel p-1.5`}
        >
          <PixelIcon id={trailOn ? "trail-on" : "trail-off"} className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const next = toggleSound();
            setAmbient(next ? "title" : null);
          }}
          data-cursor="hand"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Mute sounds" : "Enable sounds"}
          className="bevel-out bg-panel p-1.5"
        >
          <PixelIcon id={soundOn ? "sound-on" : "sound-off"} className="h-4 w-4" />
        </button>
        <Clock />
      </div>
    </div>
  );
}
