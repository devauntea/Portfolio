"use client";

/* The intro. A ghost cursor drifts between real on-screen elements and drops
   a coach mark at each, leaving visitors on the desktop to choose a folder.

   Anchor rects are measured live from data-tour attributes rather than
   hardcoded, because desktop icons are draggable and their positions persist
   across visits, a fixed coordinate would point at bare desktop.

   Plays once per visitor (tourSeen), opens the résumé only if explicitly
   enabled, and exits on Esc, the skip button, or any real click. */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOs } from "@/lib/os-store";
import { useUi } from "@/lib/ui-store";
import { chime } from "@/lib/sound";
import { LEGACY_NAV } from "@/data/profile";

interface Beat {
  anchor: string;
  text: string;
  hold: number;
}

const BEATS: Beat[] = [
  {
    anchor: "icon-about",
    text: "this is my desktop. every folder here is a piece of me",
    hold: 2600,
  },
  {
    anchor: "taskbar",
    text: "drag windows by their title bar. more apps live under START",
    hold: 2800,
  },
  {
    anchor: "icon-games",
    text: "right-click the desktop for more. and look for the plant 🌱",
    hold: 2600,
  },
  { anchor: "icon-resume", text: LEGACY_NAV.tourEnd, hold: 2000 },
];

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectOf(anchor: string): Rect | null {
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  /* hidden tabs report 0×0, treat that as "can't point at it" */
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

export function BootTour() {
  const enterSpace = useOs((s) => s.enterSpace);
  const setTourSeen = useUi((s) => s.setTourSeen);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(
    (openResume: boolean) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setDone(true);
      setTourSeen(true);
      if (openResume) {
        chime();
        enterSpace("resume");
      }
    },
    [enterSpace, setTourSeen],
  );

  /* Advance through the beats. Both the measurement and the transition happen
     inside callbacks rather than the effect body, React 19 flags setState
     there, and measuring a frame later also lets the desktop finish laying
     out before we point at it. */
  useEffect(() => {
    if (done) return;
    const beat = BEATS[step];
    if (!beat) return;

    /* setTimeout, not requestAnimationFrame: background tabs freeze rAF
       entirely (timers only get throttled), and a tour that renders nothing
       while its clock keeps running would dim the screen for no reason. */
    const measure = setTimeout(() => setRect(rectOf(beat.anchor)), 0);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => {
        if (step + 1 >= BEATS.length) finish(useUi.getState().autoResume);
        else setStep(step + 1);
      },
      reduced ? Math.min(beat.hold, 1100) : beat.hold,
    );
    timers.current.push(t);
    return () => {
      clearTimeout(measure);
      clearTimeout(t);
    };
  }, [step, done, finish]);

  /* any escape hatch ends it */
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    const onPointer = () => finish(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [done, finish]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const beat = BEATS[step];
  if (done || !beat || !rect) return null;

  const isLast = step === BEATS.length - 1;
  const width = typeof window === "undefined" ? 1024 : window.innerWidth;
  const tipTop = rect.y + rect.h / 2 + 16;
  const tipLeft = Math.min(Math.max(rect.x, 140), width - 140);

  return (
    <div className="pointer-events-none fixed inset-0 z-[78]" aria-live="polite">
      {/* the halo on whatever we're pointing at, with the rest dimmed */}
      <motion.div
        aria-hidden
        /* initial={false}, without it the halo animates in from 0,0 with zero
           width and reads as a stray bar in the corner on the first beat */
        initial={false}
        animate={{ left: rect.x, top: rect.y, width: rect.w + 16, height: rect.h + 16 }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-gilt/80"
        style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.35)" }}
      />

      {/* the ghost cursor */}
      <motion.div
        aria-hidden
        animate={{ left: rect.x + 12, top: rect.y + 12 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="absolute text-xl drop-shadow-[0_2px_3px_rgb(0_0_0/0.7)]"
      >
        {isLast ? "✊" : "➤"}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          /* slides in rather than fading: an entrance that starts at opacity 0
             leaves the text invisible if the animation never runs (background
             tabs stall framer), and unreadable copy is worse than no polish */
          initial={{ y: 6 }}
          animate={{ y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="status"
          className="bevel-out absolute max-w-[16rem] -translate-x-1/2 bg-panel px-3 py-2 text-center font-mono text-[11px] leading-relaxed text-starlight"
          style={{ left: tipLeft, top: tipTop }}
        >
          {beat.text}
        </motion.p>
      </AnimatePresence>

      <button
        onClick={() => finish(false)}
        data-cursor="hand"
        className="bevel-out pointer-events-auto absolute right-3 top-3 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-faint active:bevel-in"
      >
        skip intro ⏭
      </button>
    </div>
  );
}
