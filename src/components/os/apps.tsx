"use client";

/* The desktop's window apps. Projects, Hobbies, and Contact reuse the
   existing verified panels; About / Display / README are small natives.
   ThemeApplier is the always-mounted effect that stamps the persisted
   palette post-hydration (the Display app only changes the store). */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ABOUT } from "@/data/profile";
import { applyPalette, paletteById, PALETTES, useTheme } from "@/lib/theme-store";
import { useUi } from "@/lib/ui-store";
import { chime } from "@/lib/sound";
import { WorkshopBoard } from "@/components/sections/WorkshopBoard";
import { LoungeStations } from "@/components/sections/LoungeStations";
import { ObservatoryConsole } from "@/components/sections/ObservatoryConsole";
import type { AppId } from "@/lib/os-store";
import type { PixelIconId } from "./PixelIcons";

export function ThemeApplier() {
  const themeId = useTheme((s) => s.themeId);
  useEffect(() => {
    applyPalette(paletteById(themeId));
  }, [themeId]);
  return null;
}

function AboutApp() {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-starlight/90">
      <p>{ABOUT.intro}</p>
      <p className="text-faint">{ABOUT.mission}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        {ABOUT.personality.map((t) => (
          <span key={t} className="bevel-out bg-panel px-2 py-0.5 font-mono text-[10px] text-faint">
            {t}
          </span>
        ))}
      </div>
      <p className="pt-2 font-mono text-[10px] text-faint/70">
        tip: the 3D spaces (Gallery, Game Room, Résumé) open full-screen from
        the desktop — this whole computer is the portfolio.
      </p>
    </div>
  );
}

function DisplayApp() {
  const themeId = useTheme((s) => s.themeId);
  const setTheme = useTheme((s) => s.setTheme);
  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-faint">
        Appearance — pick a scheme
      </p>
      <div className="space-y-1.5">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            role="menuitemradio"
            aria-checked={themeId === p.id}
            onClick={() => {
              setTheme(p.id);
              chime();
            }}
            className={`bevel-out flex w-full items-center gap-2 bg-panel px-2.5 py-2 text-left text-xs transition-colors ${
              themeId === p.id ? "text-starlight" : "text-faint hover:text-starlight"
            }`}
          >
            <span aria-hidden>{p.icon}</span>
            <span className="flex-1">{p.label}</span>
            <span className="flex gap-0.5" aria-hidden>
              {[p.tokens.cosmos, p.tokens.lumen, p.tokens.gilt, p.tokens.rose].map((c) => (
                <span key={c} className="bevel-in h-4 w-4" style={{ background: c }} />
              ))}
            </span>
            {themeId === p.id && <span aria-hidden>✓</span>}
          </button>
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint/70">
        Saved to this machine. Every window, icon, and even space itself
        follows the scheme.
      </p>
      <WallpaperPicker />
      <StartupPicker />
    </div>
  );
}

function StartupPicker() {
  const autoResume = useUi((s) => s.autoResume);
  const toggleAutoResume = useUi((s) => s.toggleAutoResume);
  return (
    <div className="mt-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">
        Startup items
      </p>
      <button
        onClick={() => {
          toggleAutoResume();
          chime();
        }}
        aria-pressed={autoResume}
        className="bevel-out flex w-full items-center gap-2 bg-panel px-2.5 py-2 text-left"
      >
        <span
          aria-hidden
          className={`${autoResume ? "bevel-in bg-lumen/70" : "bevel-out bg-panel"} grid h-4 w-4 shrink-0 place-items-center font-mono text-[9px] leading-none text-cosmos`}
        >
          {autoResume ? "✓" : ""}
        </span>
        <span className="flex-1 font-mono text-[10px] text-starlight">
          Open Résumé at boot
          <span className="block text-[9px] text-faint">
            {autoResume ? "launches right after the desktop loads" : "boot straight to the desktop"}
          </span>
        </span>
      </button>
    </div>
  );
}

function WallpaperPicker() {
  const wallpaper = useUi((s) => s.wallpaper);
  const setWallpaper = useUi((s) => s.setWallpaper);
  return (
    <div className="mt-4">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-faint">
        Wallpaper
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => {
            setWallpaper("memes");
            chime();
          }}
          aria-pressed={wallpaper === "memes"}
          className={`${wallpaper === "memes" ? "bevel-in" : "bevel-out"} bg-panel px-2 py-2 font-mono text-[10px] text-starlight`}
        >
          🐱 cat memes
          <span className="block text-[9px] text-faint">rotates every 16s</span>
        </button>
        <button
          onClick={() => {
            setWallpaper("dots");
            chime();
          }}
          aria-pressed={wallpaper === "dots"}
          className={`${wallpaper === "dots" ? "bevel-in" : "bevel-out"} bg-panel px-2 py-2 font-mono text-[10px] text-starlight`}
        >
          ▦ classic dots
          <span className="block text-[9px] text-faint">for serious business</span>
        </button>
      </div>
    </div>
  );
}


const MusicScene = dynamic(
  () => import("./MusicScene").then((m) => ({ default: m.MusicScene })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-44 place-items-center font-mono text-[10px] text-faint">
        warming up the platter…
      </div>
    ),
  },
);

interface SpotifyTrack {
  name: string;
  artist: string;
  album: string;
  art: string | null;
}
interface SpotifyData {
  configured: boolean;
  now: SpotifyTrack | null;
  top: SpotifyTrack[];
}

function MusicApp() {
  const [data, setData] = useState<SpotifyData | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/spotify")
        .then((r) => r.json())
        .then((d) => {
          if (alive) setData(d);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const playing = !!data?.now;
  return (
    <div>
      <MusicScene playing={playing} />

      <div className="bevel-in mt-3 bg-cosmos/60 p-2.5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-faint">
          now spinning
        </p>
        {playing && data?.now ? (
          <div className="mt-1.5 flex items-center gap-2.5">
            {data.now.art && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.now.art} alt="" className="bevel-out h-10 w-10" />
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-starlight">{data.now.name}</p>
              <p className="truncate font-mono text-[10px] text-faint">{data.now.artist}</p>
            </div>
            <span aria-hidden className="ml-auto animate-pulse text-lumen">
              ♪
            </span>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-faint">
            {data === null
              ? "checking the turntable…"
              : data.configured
                ? "the needle is up — nothing playing right now."
                : "Spotify isn't linked yet — the platter idles until it is."}
          </p>
        )}
      </div>

      {data?.top && data.top.length > 0 && (
        <div className="mt-2">
          <p className="px-1 font-mono text-[9px] uppercase tracking-widest text-faint">
            heavy rotation (last month)
          </p>
          <ul className="mt-1 space-y-1">
            {data.top.map((t) => (
              <li key={`${t.name}-${t.artist}`} className="bevel-in flex items-center gap-2 bg-cosmos/50 px-2 py-1">
                {t.art && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.art} alt="" className="h-6 w-6" />
                )}
                <span className="truncate text-[11px] text-starlight">{t.name}</span>
                <span className="ml-auto shrink-0 truncate font-mono text-[9px] text-faint">{t.artist}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data !== null && !data.configured && (
        <div className="mt-2">
          <a
            href="/api/spotify/login"
            data-cursor="hand"
            className="bevel-out block bg-panel px-3 py-2 text-center font-mono text-[11px] font-bold text-sprout active:bevel-in"
          >
            🎧 Connect Spotify
          </a>
          <p className="mt-2 px-1 font-mono text-[9px] leading-relaxed text-faint/70">
            owner: click Connect, approve on Spotify, then finish the one-time
            token step (README → &ldquo;Linking Spotify&rdquo;). After that the
            platter spins to what Devauntae actually listens to.
          </p>
        </div>
      )}
    </div>
  );
}

function ReadmeApp() {
  return (
    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-starlight/90">
{`DEVAUNTAE-OS — README.txt
==========================

Welcome. This computer *is* the portfolio.

  • Double-click desktop icons (single tap works too).
  • Drag any icon where you like — it snaps to the grid, and
    dropping it on a taken square trades the two, so nothing
    ever stacks. Right-click the desktop for "Tidy icons".
  • ABOUT ME, PROJECTS, HOBBIES, CONTACT open as windows — drag
    them by their title bars.
  • RÉSUMÉ, GALLERY and GAME ROOM open as full-screen spaces.
    RÉSUMÉ is a startup item: it opens itself once the desktop
    loads (Display → Startup items turns that off).
    The gallery is walkable: click to look around, WASD / arrow
    keys to move, Esc to release the mouse.
  • DISPLAY changes the color scheme (it sticks).
  • Somewhere on this machine a garden grows. 🌱

FOR DEVAUNTAE (customizing):
  1. Every word of copy lives in src/data/profile.ts — all real
     content now (résumé, cover letter, GitHub).
  2. Gallery photos: drop files at
     public/images/gallery/photo-1.jpg … photo-6.jpg
     (1 grad · 2 cameras · 3 CSTEP · 4 neon · 5 woodworking ·
      6 the rasta pasta glamour shot).
  3. Documents live in public/docs/ (résumé .docx, cover letter,
     transcript) — replace the files to update the folder.
  4. Owner password: OWNER_PASSWORD in .env.local (server-only).
  5. Real agent wiring: see the owner dashboard inside CONTACT.
`}
    </pre>
  );
}

export const APPS: Record<
  AppId,
  { title: string; icon: PixelIconId; width?: string; node: React.ReactNode }
> = {
  about: { title: "About Me", icon: "about", width: "26rem", node: <AboutApp /> },
  projects: { title: "Projects", icon: "projects", width: "34rem", node: <WorkshopBoard /> },
  hobbies: { title: "Hobbies", icon: "hobbies", width: "34rem", node: <LoungeStations /> },
  contact: { title: "Contact", icon: "contact", width: "30rem", node: <ObservatoryConsole /> },
  display: { title: "Display", icon: "display", width: "22rem", node: <DisplayApp /> },
  music: { title: "Music", icon: "music", width: "26rem", node: <MusicApp /> },
  readme: { title: "README.txt", icon: "readme", width: "30rem", node: <ReadmeApp /> },
};
