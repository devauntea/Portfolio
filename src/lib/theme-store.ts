"use client";

/* The color-scheme switcher's engine. Five preset palettes, each a full set
   of the site's CSS custom properties. Selecting one stamps the values onto
   :root (so Tailwind's var()-backed tokens update everywhere instantly) and
   persists to localStorage. The 3D canvas reads `cosmos` for its background
   and fog so space itself rethemes too. */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId =
  | "deep-space"
  | "forest-canopy"
  | "alpine-sky"
  | "retro-arcade"
  | "golden-hour";

export interface Palette {
  id: ThemeId;
  label: string;
  icon: string;
  /** token → hex; keys match the custom properties in globals.css */
  tokens: {
    cosmos: string;
    panel: string;
    seam: string;
    starlight: string;
    faint: string;
    lumen: string;
    ember: string;
    gilt: string;
    sprout: string;
    rose: string;
  };
}

export const PALETTES: Palette[] = [
  {
    id: "deep-space",
    label: "Deep Space",
    icon: "🌌",
    tokens: {
      cosmos: "#070912",
      panel: "#12172b",
      seam: "#263052",
      starlight: "#f0f2ff",
      faint: "#8e97c2",
      lumen: "#7ee0ff",
      ember: "#ff8a4d",
      gilt: "#ffd45e",
      sprout: "#97e87a",
      rose: "#ff6e9a",
    },
  },
  {
    id: "forest-canopy",
    label: "Forest Canopy",
    icon: "🌲",
    tokens: {
      cosmos: "#0c130e",
      panel: "#152119",
      seam: "#2b4434",
      starlight: "#eef7ee",
      faint: "#92b3a0",
      lumen: "#8be8b0",
      ember: "#ff9a5d",
      gilt: "#e8c860",
      sprout: "#9fe87a",
      rose: "#f08a8a",
    },
  },
  {
    id: "alpine-sky",
    label: "Alpine Sky",
    icon: "🏔️",
    tokens: {
      cosmos: "#0d1522",
      panel: "#17233a",
      seam: "#2d4666",
      starlight: "#f4f8fd",
      faint: "#9ab0cd",
      lumen: "#8fd8ff",
      ember: "#ffa06b",
      gilt: "#ffe08a",
      sprout: "#a8e8c0",
      rose: "#ff8fb0",
    },
  },
  {
    id: "retro-arcade",
    label: "Retro Arcade",
    icon: "🕹️",
    tokens: {
      cosmos: "#0c0416",
      panel: "#1b0b30",
      seam: "#411a70",
      starlight: "#f8ecff",
      faint: "#b48ad6",
      lumen: "#00e5ff",
      ember: "#ff6ec7",
      gilt: "#ffe94a",
      sprout: "#7dff6a",
      rose: "#ff2975",
    },
  },
  {
    id: "golden-hour",
    label: "Golden Hour",
    icon: "🌇",
    tokens: {
      cosmos: "#1a1008",
      panel: "#291c10",
      seam: "#4a3520",
      starlight: "#fff4e6",
      faint: "#c9a789",
      lumen: "#ffc46b",
      ember: "#ff8a4d",
      gilt: "#ffd45e",
      sprout: "#b8d97a",
      rose: "#ff7a6b",
    },
  },
];

export const paletteById = (id: ThemeId): Palette =>
  PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** Stamp a palette's tokens onto :root. */
export function applyPalette(p: Palette) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(p.tokens)) {
    root.style.setProperty(`--${k}`, v);
  }
}

interface ThemeState {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

/* NOTE: the palette is stamped onto :root ONLY from a post-hydration
   useEffect (see ThemeSwitcher). Doing it during zustand rehydration
   mutated <html> before React finished hydrating → hydration mismatch. */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: "deep-space",
      setTheme: (themeId) => set({ themeId }),
    }),
    { name: "archive-theme-v1" },
  ),
);
