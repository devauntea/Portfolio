"use client";

/* Top-down 2D pixel-art view of the Agent Garden (owner toggle). Reads the
   SAME zustand store as the 3D island, vitals, statuses, AP, toy, emotes,
   so the two views can never disagree. Everything is drawn procedurally on
   one canvas at integer scale; interactions mirror the 3D scene: click a
   station to arm/cycle, click a creature to apply the held action or focus
   its HUD card. */

import { useEffect, useRef } from "react";
import { AGENTS, type AgentId } from "@/data/agents";
import { useGarden, TOYS } from "@/lib/agent-store";
import { overallHappiness } from "@/lib/garden-sim";
import type { HeldAction, StationId } from "./IslandScene";

const PX = 8; // canvas pixels per grid cell
const GW = 96; // grid width
const GH = 64; // grid height

const HUE: Record<string, string> = {
  teleporter: "#4de1ff",
  ember: "#ff7a3d",
  gold: "#ffd45e",
  toxic: "#9bff6a",
};
const STONE = "#565b77";
const DARK = "#05060f";
const WHITE = "#eef1ff";

/* grid layout (cx, cy sprite centers) */
const HOME_2D: [number, number][] = [
  [36, 22], // paper-wing
  [60, 22], // echo-fox
  [62, 40], // cash-raptor
  [34, 40], // fortress-tortoise
];
const STATION_2D: Record<StationId, [number, number]> = {
  food: [64, 48],
  toys: [32, 48],
  train: [78, 30],
  nap: [16, 30],
};
const FIRE_2D: [number, number] = [48, 31];
const NAP_SLEEP_SPOT: [number, number] = [20, 34];

function cell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1,
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * PX, Math.round(y) * PX, w * PX, h * PX);
}

/* 16-grid creature sprites, drawn around center (cx, cy) */
function drawCreature(
  ctx: CanvasRenderingContext2D,
  id: AgentId,
  cx: number,
  cy: number,
  color: string,
  frame: number,
  stone: boolean,
) {
  const p = (x: number, y: number, c: string) => cell(ctx, cx - 8 + x, cy - 8 + y, c);
  const wob = stone ? 0 : frame % 2 === 0 ? 0 : -1;
  const snout = stone ? STONE : "#ffe3c2";
  const wing = stone ? "#474c66" : WHITE;

  if (id === "paper-wing") {
    for (let y = 6; y <= 9; y++) for (let x = 6; x <= 9; x++) p(x, y, color);
    p(6, 5, color); p(9, 5, color); // ears
    p(7, 7, DARK); p(8, 7, DARK); // eyes
    const wy = 7 + wob;
    for (let x = 2; x <= 5; x++) p(x, wy, wing);
    for (let x = 10; x <= 13; x++) p(x, wy, wing);
  } else if (id === "echo-fox") {
    for (let y = 7; y <= 10; y++) for (let x = 6; x <= 10; x++) p(x, y, color);
    p(6, 6, color); p(10, 6, color);
    p(11, 8, snout);
    p(8, 8, DARK);
    for (let i = 0; i < 6; i++) {
      p(Math.round(5 - i * 0.6), 8 + (i % 2 === 0 ? wob : 0), stone ? STONE : i % 2 ? "#ffc07a" : color);
    }
  } else if (id === "cash-raptor") {
    for (let y = 6; y <= 10; y++) for (let x = 6; x <= 9; x++) p(x, y, color);
    for (let x = 9; x <= 11; x++) p(x, 6, color);
    p(11, 6, stone ? "#474c66" : frame % 2 ? "#ffffff" : "#4de1ff"); // lens eye
    p(7, 5, stone ? STONE : "#ffd45e"); p(8, 5, stone ? STONE : "#ffd45e");
    p(6, 11, "#555b77"); p(9, 11, "#555b77");
  } else {
    for (let y = 8; y <= 10; y++) for (let x = 5; x <= 11; x++) p(x, y, stone ? "#474c66" : "#5a6a4a");
    for (let y = 6; y <= 8; y++) for (let x = 6; x <= 10; x++) p(x, y, color);
    p(6, 5, stone ? STONE : "#8a8570"); p(8, 5, stone ? STONE : "#8a8570"); p(10, 5, stone ? STONE : "#8a8570");
    p(12, 8, stone ? STONE : "#7a8a5a");
    p(frame % 2 === 0 ? 8 : 7, 4, stone ? STONE : "#ffd45e"); // coin
  }
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  frame: number,
  held: HeldAction,
  emoteUntil: Map<AgentId, number>,
) {
  const st = useGarden.getState();
  ctx.clearRect(0, 0, GW * PX, GH * PX);

  // void backdrop + stars (deterministic)
  ctx.fillStyle = "#05060f";
  ctx.fillRect(0, 0, GW * PX, GH * PX);
  for (let i = 0; i < 40; i++) {
    const sx = (i * 37) % GW;
    const sy = (i * 23) % GH;
    if ((i + frame) % 9 === 0) continue; // twinkle
    cell(ctx, sx, sy, i % 3 === 0 ? "#2c3258" : "#1a1f3d");
  }

  // island: layered ellipses (dirt fringe then grass)
  ctx.fillStyle = "#2a2148";
  ctx.beginPath();
  ctx.ellipse(48 * PX, 36 * PX, 39 * PX, 23 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#35704f";
  ctx.beginPath();
  ctx.ellipse(48 * PX, 34 * PX, 38 * PX, 21 * PX, 0, 0, Math.PI * 2);
  ctx.fill();
  // grass specks
  for (let i = 0; i < 26; i++) {
    const gx = 14 + ((i * 29) % 68);
    const gy = 17 + ((i * 17) % 34);
    cell(ctx, gx, gy, "#4c9268");
  }

  // tree (top-left)
  cell(ctx, 24, 18, "#5c4433", 2, 3);
  cell(ctx, 22, 14, "#2f7d52", 6, 4);
  cell(ctx, 23, 13, "#39905f", 4, 1);

  // campfire, color tracks average happiness (same rule as 3D)
  const h = overallHappiness(Object.values(st.agents));
  const fire = h < 50 ? (h < 25 ? "#4d5f8f" : "#c76a4a") : h < 85 ? "#ff7a3d" : "#ffd45e";
  const [fx, fy] = FIRE_2D;
  cell(ctx, fx - 2, fy + 2, "#3b3f5c", 5, 1); // stones
  cell(ctx, fx - 1, fy + 1, "#5c4433", 3, 1); // logs
  const fh = frame % 2 === 0 ? 3 : 2;
  cell(ctx, fx, fy - fh + 1, fire, 1, fh);
  cell(ctx, fx - 1, fy, fire, 3, 1);
  if (frame % 2 === 0) cell(ctx, fx, fy - fh, "#fff1b8");

  // stations
  const [bx, by] = STATION_2D.food;
  cell(ctx, bx - 2, by, held === "feed" ? "#b18cff" : "#6b4a86", 5, 2);
  cell(ctx, bx - 1, by - 1, "#ffb36b", 1, 1);
  cell(ctx, bx + 1, by - 1, "#ffb36b", 1, 1);

  const [tx, ty] = STATION_2D.toys;
  cell(ctx, tx - 2, ty - 1, "#7a5230", 5, 3);
  cell(ctx, tx - 2, ty - 2, "#8a6238", 5, 1);
  cell(ctx, tx, ty, "#ffd45e");
  const toy = TOYS[st.toyIndex];
  cell(ctx, tx, ty - 4, toy.id === "ball" ? "#ff5470" : toy.id === "feather-wand" ? "#4de1ff" : "#9bff6a", 2, 2);

  const [px2, py2] = STATION_2D.train;
  cell(ctx, px2, py2 - 3, held === "train" ? "#ffd45e" : "#b8a888", 2, 2); // dummy head
  cell(ctx, px2 - 2, py2 - 1, "#8a7a5a", 6, 1); // arms
  cell(ctx, px2, py2, "#5c4433", 2, 4); // post

  const [nx, ny] = STATION_2D.nap;
  for (const [mx, my, mw] of [[nx - 2, ny, 4], [nx + 3, ny + 2, 3]] as const) {
    cell(ctx, mx, my + 1, "#d8d2c0", mw - 2, 2); // stem
    cell(ctx, mx - 1, my - 1, held === "nap" ? "#b18cff" : "#8a5fd6", mw, 2); // cap
  }

  // creatures
  ctx.font = `${PX + 3}px monospace`;
  ctx.textAlign = "center";
  const now = Date.now();
  for (const def of AGENTS) {
    const care = st.agents[def.id];
    let [cx, cy] = HOME_2D[def.slot];
    const stone = care.status === "dormant";
    const asleep = care.status === "asleep";
    if (asleep) [cx, cy] = NAP_SLEEP_SPOT;
    else if (!stone) {
      cx += Math.round(2.5 * Math.cos(frame * 0.07 + def.slot * 2));
      cy += Math.round(1.5 * Math.sin(frame * 0.09 + def.slot * 2));
    }

    if (stone) cell(ctx, cx - 3, cy + 3, "#3b3f5c", 7, 1); // pedestal

    drawCreature(ctx, def.id, cx, cy, stone ? STONE : HUE[def.hue], asleep ? 0 : frame, stone);

    // held-action target box
    if (held && care.status === "awake") {
      ctx.strokeStyle = HUE[def.hue];
      ctx.lineWidth = 2;
      ctx.strokeRect((cx - 8) * PX, (cy - 8) * PX, 16 * PX, 16 * PX);
    }

    // status pips (skip statues)
    if (!stone) {
      const bars: [number, string][] = [
        [care.vitals.hunger, "#ff7a3d"],
        [care.vitals.happiness, "#ffd45e"],
        [care.vitals.energy, "#4de1ff"],
      ];
      bars.forEach(([v, c], i) => {
        ctx.fillStyle = "#0b0e1f";
        ctx.fillRect((cx - 6) * PX, (cy + 8 + i) * PX + 2, 12 * PX, PX - 4);
        ctx.fillStyle = c;
        ctx.fillRect((cx - 6) * PX, (cy + 8 + i) * PX + 2, Math.round((12 * PX * v) / 100), PX - 4);
      });
    }

    // bubbles: Zzz / recent emote hearts / low-stat cry
    if (asleep) {
      ctx.fillStyle = "#4de1ff";
      ctx.fillText("z Z", (cx + 6) * PX, (cy - 8) * PX);
    } else if ((emoteUntil.get(def.id) ?? 0) > now) {
      ctx.fillStyle = "#ff5470";
      ctx.fillText("♥", (cx + 5) * PX, (cy - 7) * PX);
    } else if (
      care.status === "awake" &&
      Math.min(care.vitals.hunger, care.vitals.happiness, care.vitals.energy) < 30
    ) {
      ctx.fillStyle = "#ff5470";
      if (frame % 2 === 0) ctx.fillText("!", (cx + 5) * PX, (cy - 7) * PX);
    }

    // name
    ctx.fillStyle = stone ? "#565b77" : HUE[def.hue];
    ctx.fillText(def.name, cx * PX, (cy + (stone ? 6 : 12)) * PX);
  }
}

export function PixelGarden({
  held,
  onSelect,
  onTarget,
  onStation,
}: {
  held: HeldAction;
  onSelect: (id: AgentId) => void;
  onTarget: (id: AgentId) => void;
  onStation: (s: StationId) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heldRef = useRef<HeldAction>(held);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  // render loop (~7 fps retro cadence), reading the store imperatively
  useEffect(() => {
    const canvas = canvasRef.current;
    const maybeCtx = canvas?.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;
    ctx.imageSmoothingEnabled = false;

    const emoteUntil = new Map<AgentId, number>();
    const lastNonce = new Map<AgentId, number>();
    let frame = 0;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (t - last > 140) {
        // surface fresh emotes as 2s hearts
        const em = useGarden.getState().emote;
        for (const def of AGENTS) {
          const n = em[def.id].n;
          if (n !== (lastNonce.get(def.id) ?? 0)) {
            lastNonce.set(def.id, n);
            if (n > 0) emoteUntil.set(def.id, Date.now() + 2000);
          }
        }
        drawScene(ctx, frame, heldRef.current, emoteUntil);
        frame++;
        last = t;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * GW;
    const gy = ((e.clientY - rect.top) / rect.height) * GH;
    const st = useGarden.getState();

    // creatures first (their live position, same math as drawScene)
    for (const def of AGENTS) {
      const care = st.agents[def.id];
      let [cx, cy] = HOME_2D[def.slot];
      if (care.status === "asleep") [cx, cy] = NAP_SLEEP_SPOT;
      if (Math.abs(gx - cx) <= 8 && Math.abs(gy - cy) <= 9) {
        if (heldRef.current) onTarget(def.id);
        else onSelect(def.id);
        return;
      }
    }
    for (const s of Object.keys(STATION_2D) as StationId[]) {
      const [sx, sy] = STATION_2D[s];
      if (Math.abs(gx - sx) <= 6 && Math.abs(gy - sy) <= 6) {
        onStation(s);
        return;
      }
    }
  }

  const ap = useGarden((s) => s.ap);
  const toyIndex = useGarden((s) => s.toyIndex);

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={GW * PX}
        height={GH * PX}
        onClick={handleClick}
        data-cursor="hand"
        className="w-full max-w-3xl rounded-lg border border-seam"
        style={{ imageRendering: "pixelated" }}
        aria-label="Pixel view of the agent garden island"
      />
      <div className="pixel-box w-full max-w-3xl bg-panel px-4 py-2 text-center font-mono text-[9px] leading-relaxed text-starlight">
        ⚡ {ap}/20 · toy: {TOYS[toyIndex].icon} {TOYS[toyIndex].label} ·{" "}
        {held === "feed"
          ? "holding kibble, click a creature"
          : held === "train"
            ? "pick a trainee"
            : held === "nap"
              ? "pick a sleeper"
              : "click a station, then a creature"}
      </div>
    </div>
  );
}
