"use client";

/* The desktop wallpaper: a rotation of cat memes, drawn live on a canvas,
   pixel-art cats + Impact-style captions, no image files. A new meme every
   ~16 seconds; the backdrop tint follows the active palette so themes
   still matter. Toggleable from the Display app (memes ⇄ classic dots). */

import { useEffect, useRef, useState } from "react";
import { useUi } from "@/lib/ui-store";
import { useTheme } from "@/lib/theme-store";

/* pixel legend: . none · k outline · o orange · O stripe · w white · W eye-white
   g gray · G dark gray · y eye · p pink · s shades · r red dot · b keyboard */
const LOAF = [
  "..................",
  "..kk..........kk..",
  ".kook........kook.",
  ".koook......koook.",
  ".kooookkkkkkoooook",
  ".kooooooooooooook.",
  "kooOooooooooOoook.",
  "koooWyooooooWyook.",
  "kooooooooppoooook.",
  "koOooooooooooOook.",
  "kooooooooooooooook",
  "koooooooooooooook.",
  ".kkkkkkkkkkkkkkk..",
];
const SHADES = [
  "..................",
  "...kk.........kk..",
  "..kggk.......kggk.",
  "..kgggk.....kgggk.",
  "..kgggggggggggggk.",
  "..kgggggggggggggk.",
  ".kssssssskssssssk.",
  ".kssssssskssssssk.",
  "..kgggggppgggggk..",
  "..kggggggggggggk..",
  "...kggggggggggk...",
  "..kgggkkkkkkgggk..",
  "..kkkk......kkkk..",
];
const REDDOT = [
  "..............r...",
  "...kk.....kk......",
  "..kwwk...kwwk.....",
  "..kwwwk.kwwwk.....",
  "..kwwwwwwwwwwk....",
  ".kwwywwwwwyww.k...",
  ".kwwwwwppwwwwk....",
  ".kwwwwwwwwwwwk..k.",
  ".kwwwwwwwwwwwwkkw.",
  ".kwwwwwwwwwwwwwwk.",
  ".kwwwwwwwwwwwwwk..",
  "..kkkkkkkkkkkkk...",
];
const KEYBOARD = [
  "...kk.........kk..",
  "..kook.......kook.",
  "..koook.....koook.",
  "..kooooooooooooook",
  "..kooyoooooooyook.",
  "..koooooppooooook.",
  "..kooooooooooooook",
  "...kooooooooooook.",
  "..bbbbbbbbbbbbbbb.",
  "..bGbGbGbGbGbGbGb.",
  "..bbbbbbbbbbbbbbb.",
];

const INK: Record<string, string> = {
  k: "#22242a",
  o: "#e8923a",
  O: "#b86a24",
  w: "#f4f0e6",
  W: "#f4f0e6",
  g: "#8a8f9a",
  G: "#5d6268",
  y: "#ffd45e",
  p: "#e8a0a8",
  s: "#101014",
  r: "#ff3b30",
  b: "#3a3f4a",
};

const MEMES: { grid: string[]; top: string; bottom: string }[] = [
  { grid: LOAF, top: "NO THOUGHTS", bottom: "ONLY LOAF" },
  { grid: SHADES, top: "IT COMPILES", bottom: "SHIP IT." },
  { grid: REDDOT, top: "404", bottom: "RED DOT NOT FOUND" },
  { grid: KEYBOARD, top: "CTRL+C", bottom: "CTRL+CAT" },
  { grid: LOAF, top: "I CAN HAZ", bottom: "RETURN OFFER?" },
];

function draw(canvas: HTMLCanvasElement, index: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  if (w === 0 || h === 0) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h);

  const meme = MEMES[index % MEMES.length];
  const rows = meme.grid.length;
  const cols = meme.grid[0].length;

  // soft spotlight behind the cat, tinted by the active palette
  const styles = getComputedStyle(document.documentElement);
  const seam = styles.getPropertyValue("--seam").trim() || "#263052";
  const grad = ctx.createRadialGradient(w / 2, h * 0.44, 10, w / 2, h * 0.44, Math.min(w, h) * 0.5);
  grad.addColorStop(0, seam + "55");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // the cat
  const cell = Math.max(4, Math.floor((Math.min(w, h) * 0.42) / rows));
  const ox = Math.round(w / 2 - (cols * cell) / 2);
  const oy = Math.round(h * 0.44 - (rows * cell) / 2);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = meme.grid[y][x];
      if (ch === "." || !INK[ch]) continue;
      ctx.fillStyle = INK[ch];
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
  }

  // Impact-style captions
  const size = Math.max(20, Math.min(52, Math.floor(w / 20)));
  ctx.font = `900 ${size}px var(--font-mono), monospace`;
  ctx.textAlign = "center";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(3, size / 6);
  ctx.strokeStyle = "#0a0a0c";
  ctx.fillStyle = "#f6f6f2";
  const topY = Math.max(size + 14, oy - size * 0.8);
  const botY = Math.min(h - 64, oy + rows * cell + size * 1.4);
  ctx.strokeText(meme.top, w / 2, topY);
  ctx.fillText(meme.top, w / 2, topY);
  ctx.strokeText(meme.bottom, w / 2, botY);
  ctx.fillText(meme.bottom, w / 2, botY);
}

export function MemeWallpaper() {
  const wallpaper = useUi((s) => s.wallpaper);
  const themeId = useTheme((s) => s.themeId);
  const ref = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);

  // rotate every 16s
  useEffect(() => {
    if (wallpaper !== "memes") return;
    const t = setInterval(() => setIndex((i) => i + 1), 16_000);
    return () => clearInterval(t);
  }, [wallpaper]);

  // redraw on meme, theme, toggle, resize
  useEffect(() => {
    if (wallpaper !== "memes") return;
    const canvas = ref.current;
    if (!canvas) return;
    draw(canvas, index);
    const onResize = () => draw(canvas, index);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [index, themeId, wallpaper]);

  if (wallpaper !== "memes") return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-80"
    />
  );
}
