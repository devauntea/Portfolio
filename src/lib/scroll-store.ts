"use client";

/* One scroll listener, one store. progress: 0 = the starfield entrance,
   1 = the observatory. The 3D camera rig reads it via getState() inside
   useFrame (never re-rendering React); DOM HUD subscribes normally.
   `focus` holds the index of a gallery frame the camera should zoom to
   (null = follow the scroll path). */

import { create } from "zustand";

/** Scroll bands for each realm, used by the camera, sound, and cursor. */
export const REALMS = {
  title: { from: 0, to: 0.1 },
  workshop: { from: 0.1, to: 0.27 },
  game: { from: 0.28, to: 0.41 },
  lounge: { from: 0.42, to: 0.55 },
  office: { from: 0.56, to: 0.68 },
  gallery: { from: 0.69, to: 0.85 },
  observatory: { from: 0.86, to: 1 },
} as const;
export type RealmId = keyof typeof REALMS;

export function realmAt(p: number): RealmId {
  let best: RealmId = "title";
  for (const [id, band] of Object.entries(REALMS) as [RealmId, { from: number; to: number }][]) {
    if (p >= band.from) best = id;
  }
  return best;
}

interface ArchiveState {
  progress: number;
  realm: RealmId;
  /** gallery frame index the camera is zoomed to, or null */
  focus: number | null;
  setProgress: (p: number) => void;
  setFocus: (i: number | null) => void;
}

export const useArchive = create<ArchiveState>()((set, get) => ({
  progress: 0,
  realm: "title",
  focus: null,
  setProgress: (progress) => {
    // any real scroll movement releases a gallery zoom
    const drifted = Math.abs(progress - get().progress) > 0.004;
    set({
      progress,
      realm: realmAt(progress),
      ...(drifted && get().focus !== null ? { focus: null } : {}),
    });
  },
  setFocus: (focus) => set({ focus }),
}));

/** Attach exactly one scroll listener (called from the page shell). */
export function bindScroll(): () => void {
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    useArchive
      .getState()
      .setProgress(max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
  };
}
