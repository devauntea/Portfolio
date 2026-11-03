"use client";

/* DevauntaeOS window manager. Windows are draggable panels opened from
   desktop icons or the Start menu; spaces are fullscreen takeovers (the
   walkable gallery, the game room, the resume folder). Only ephemeral UI
   state lives here — nothing persists except what the apps themselves
   store (pins, theme, garden state, motes). */

import { create } from "zustand";

export type AppId =
  | "about"
  | "projects"
  | "hobbies"
  | "contact"
  | "display"
  | "music"
  | "readme"
  | "admin";

export type SpaceId = "resume" | "gallery" | "games";

export interface OsWindow {
  id: AppId;
  z: number;
  /** initial offset (px) from the desktop's top-left stack point */
  dx: number;
  dy: number;
}

interface OsState {
  windows: OsWindow[];
  zTop: number;
  space: SpaceId | null;
  booted: boolean;
  /** startup items have had their turn (they only fire once per boot) */
  startupRan: boolean;
  openWindow: (id: AppId) => void;
  closeWindow: (id: AppId) => void;
  focusWindow: (id: AppId) => void;
  enterSpace: (s: SpaceId) => void;
  exitSpace: () => void;
  setBooted: () => void;
  /** claims the one startup slot; false if it already ran this boot */
  claimStartup: () => boolean;
}

let spawnCount = 0;

export const useOs = create<OsState>()((set, get) => ({
  windows: [],
  zTop: 10,
  space: null,
  booted: false,
  startupRan: false,

  openWindow: (id) => {
    const { windows, zTop } = get();
    if (windows.some((w) => w.id === id)) {
      get().focusWindow(id);
      return;
    }
    spawnCount += 1;
    set({
      windows: [
        ...windows,
        { id, z: zTop + 1, dx: (spawnCount % 5) * 28, dy: (spawnCount % 5) * 24 },
      ],
      zTop: zTop + 1,
      space: null,
      startupRan: true,
    });
  },

  closeWindow: (id) =>
    set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),

  focusWindow: (id) =>
    set((s) => ({
      windows: s.windows.map((w) => (w.id === id ? { ...w, z: s.zTop + 1 } : w)),
      zTop: s.zTop + 1,
      space: null,
      startupRan: true,
    })),

  enterSpace: (space) => set({ space, startupRan: true }),
  exitSpace: () => set({ space: null }),
  setBooted: () => set({ booted: true }),

  claimStartup: () => {
    if (get().startupRan) return false;
    set({ startupRan: true });
    return true;
  },
}));
