"use client";

/* A retro OS window: beveled chrome, striped/gradient title bar, drag by
   the title bar (framer dragControls), click anywhere to bring to front.
   On phones every window becomes a full-screen sheet under the taskbar. */

import { motion, useDragControls } from "framer-motion";
import { useOs, type AppId } from "@/lib/os-store";

export function OsWindow({
  id,
  title,
  icon,
  z,
  dx,
  dy,
  width = "34rem",
  children,
}: {
  id: AppId;
  title: string;
  icon: string;
  z: number;
  dx: number;
  dy: number;
  width?: string;
  children: React.ReactNode;
}) {
  const closeWindow = useOs((s) => s.closeWindow);
  const focusWindow = useOs((s) => s.focusWindow);
  const controls = useDragControls();

  return (
    <motion.section
      drag
      dragControls={controls}
      dragListener={false}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.14 }}
      onPointerDown={() => focusWindow(id)}
      style={{ zIndex: z, left: `min(4vw + ${dx}px, 40vw)`, top: `min(9vh + ${dy}px, 30vh)`, width }}
      aria-label={`${title} window`}
      className="bevel-out fixed inset-x-2 top-12 bottom-14 flex max-w-[94vw] flex-col bg-panel shadow-[8px_8px_0_rgb(0_0_0/0.35)] sm:inset-auto sm:bottom-auto sm:max-h-[74vh]"
    >
      {/* title bar */}
      <header
        onPointerDown={(e) => controls.start(e)}
        className="titlebar-gradient flex shrink-0 cursor-grab touch-none select-none items-center gap-2 px-2 py-1 active:cursor-grabbing"
      >
        <span aria-hidden className="text-sm leading-none">
          {icon}
        </span>
        <h2 className="flex-1 truncate font-mono text-[11px] font-bold uppercase tracking-wider text-starlight">
          {title}
        </h2>
        <button
          onClick={() => closeWindow(id)}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={`Close ${title}`}
          className="bevel-out grid h-5 w-5 place-items-center bg-panel font-mono text-[10px] leading-none text-starlight active:bevel-in"
        >
          ✕
        </button>
      </header>

      {/* content */}
      <div className="bevel-in m-1 flex-1 overflow-y-auto bg-cosmos/60 p-3">
        {children}
      </div>
    </motion.section>
  );
}
