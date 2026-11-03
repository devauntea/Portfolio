"use client";

/* Site-wide UI state: memory motes (20, persisted), pinned project orbs
   (persisted), the sound toggle (off by default, persisted), and the
   server-confirmed owner flag (ephemeral — the httpOnly cookie is the
   source of truth). */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const MOTE_COUNT = 20;

export interface MoteDef {
  id: number;
  /** scroll offset 0..1 */
  at: number;
  /** left position, percent of viewport width */
  x: number;
}

/* deterministic scatter along the whole descent, alternating sides */
export const MOTES: MoteDef[] = Array.from({ length: MOTE_COUNT }, (_, i) => ({
  id: i,
  at: 0.035 + (i / MOTE_COUNT) * 0.93 + ((i * 7) % 3) * 0.008,
  x: i % 2 === 0 ? 8 + ((i * 13) % 20) : 72 + ((i * 11) % 20),
}));

/** Milestone messages that unlock as motes accumulate. */
export const MOTE_MILESTONES: Record<number, string> = {
  5: "✦ Five motes — the Archive stirs.",
  10: "✦ Ten motes — shelves whisper your name.",
  15: "✦ Fifteen motes — almost every memory found.",
  20: "✦ All twenty. Look up — the sky remembers you.",
};

export type WallpaperId = "memes" | "dots";

interface UiState {
  motes: number[];
  pinned: string[];
  soundOn: boolean;
  owner: boolean;
  wallpaper: WallpaperId;
  collect: (id: number) => number; // returns new count (0 = already had it)
  togglePin: (projectId: string) => void;
  toggleSound: () => boolean;
  setOwner: (v: boolean) => void;
  trailOn: boolean;
  toggleTrail: () => boolean;
  setWallpaper: (w: WallpaperId) => void;
  /** open the Résumé folder automatically once the machine finishes booting */
  autoResume: boolean;
  toggleAutoResume: () => boolean;
  /** the intro tour has played (once per visitor) */
  tourSeen: boolean;
  setTourSeen: (v: boolean) => void;
}

export const useUi = create<UiState>()(
  persist(
    (set, get) => ({
      motes: [],
      pinned: [],
      soundOn: false,
      owner: false,
      wallpaper: "memes",
      trailOn: true,
      autoResume: false,
      collect: (id) => {
        const { motes } = get();
        if (motes.includes(id)) return 0;
        const next = [...motes, id];
        set({ motes: next });
        return next.length;
      },
      togglePin: (projectId) => {
        const { pinned } = get();
        set({
          pinned: pinned.includes(projectId)
            ? pinned.filter((p) => p !== projectId)
            : [...pinned, projectId],
        });
      },
      toggleSound: () => {
        const next = !get().soundOn;
        set({ soundOn: next });
        return next;
      },
      setOwner: (owner) => set({ owner }),
      toggleTrail: () => {
        const next = !get().trailOn;
        set({ trailOn: next });
        return next;
      },
      setWallpaper: (wallpaper) => set({ wallpaper }),
      toggleAutoResume: () => {
        const next = !get().autoResume;
        set({ autoResume: next });
        return next;
      },
      tourSeen: false,
      setTourSeen: (tourSeen) => set({ tourSeen }),
    }),
    {
      name: "archive-ui-v1",
      version: 1,
      // Older visits inherited autoResume=true. Start at the desktop once
      // after this update; Display can still opt into the startup item.
      migrate: (saved) => {
        const previous = saved as Partial<UiState> | null;
        return {
          motes: previous?.motes ?? [],
          pinned: previous?.pinned ?? [],
          soundOn: previous?.soundOn ?? false,
          wallpaper: previous?.wallpaper ?? "memes",
          tourSeen: previous?.tourSeen ?? false,
          autoResume: false,
        };
      },
      partialize: (s) => ({
        motes: s.motes,
        pinned: s.pinned,
        soundOn: s.soundOn,
        wallpaper: s.wallpaper,
        autoResume: s.autoResume,
        tourSeen: s.tourSeen,
      }),
    },
  ),
);

export const allMotes = (motes: number[]) => motes.length === MOTE_COUNT;
