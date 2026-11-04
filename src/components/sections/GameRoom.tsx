"use client";

/* The Game Room: a cozy side-view pixel room drawn on one canvas (crisp
   integer scale, ~7fps retro cadence). A little pixel Devauntae walks with
   ← → (or A/D); standing under a cartridge and pressing ↑ / Space / Enter
   inspects it, and clicking a cartridge works too (that's the whole mobile
   path). Inspecting flashes the TV and opens a memory card. */

import { useEffect, useRef, useState } from "react";
import { DESK, GAMES, type GameCartridge } from "@/data/profile";
import { GameModal } from "@/components/ui/GameModal";
import { chime } from "@/lib/sound";

const PX = 6;
const GW = 128;
const GH = 60;
const FLOOR_Y = 50;
const SHELF_Y = 18;
const CART_XS = [34, 56, 78, 100]; // cartridge centers on the shelf
const TV_X = 12;

function cell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  c: string,
  w = 1,
  h = 1,
) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x) * PX, Math.round(y) * PX, w * PX, h * PX);
}

function drawRoom(
  ctx: CanvasRenderingContext2D,
  frame: number,
  avatarX: number,
  facing: 1 | -1,
  walking: boolean,
  tvFlash: number,
  nearIndex: number | null,
) {
  ctx.clearRect(0, 0, GW * PX, GH * PX);
  // walls + floor
  ctx.fillStyle = "#171c33";
  ctx.fillRect(0, 0, GW * PX, FLOOR_Y * PX);
  ctx.fillStyle = "#232a4a";
  ctx.fillRect(0, FLOOR_Y * PX, GW * PX, (GH - FLOOR_Y) * PX);
  // rug
  cell(ctx, 44, FLOOR_Y, "#3a2f5e", 40, 2);
  cell(ctx, 48, FLOOR_Y, "#4a3d78", 32, 1);
  // string lights
  for (let x = 4; x < GW - 4; x += 6) {
    cell(
      ctx,
      x,
      3 + ((x / 6) % 2),
      (x / 6 + frame) % 3 === 0 ? "#ffd45e" : "#2c2350",
      1,
      1,
    );
  }
  // window with stars
  cell(ctx, 108, 8, "#0b1024", 14, 12);
  cell(ctx, 107, 7, "#3a4066", 16, 1);
  cell(ctx, 107, 20, "#3a4066", 16, 1);
  for (let i = 0; i < 6; i++) {
    if ((i + frame) % 4 !== 0)
      cell(ctx, 110 + ((i * 5) % 11), 10 + ((i * 3) % 8), "#f0f2ff");
  }
  // shelf
  cell(ctx, 26, SHELF_Y + 6, "#5c4433", 84, 2);
  // cartridges
  GAMES.forEach((g, i) => {
    const x = CART_XS[i];
    const near = nearIndex === i;
    cell(ctx, x - 3, SHELF_Y, g.color, 6, 5);
    cell(ctx, x - 2, SHELF_Y + 1, "#12172b", 4, 2); // label
    if (near) {
      cell(ctx, x - 1, SHELF_Y - 4 + (frame % 2), "#ffd45e", 2, 1); // ↑ hint
      cell(ctx, x - 2, SHELF_Y - 3 + (frame % 2), "#ffd45e", 1, 1);
      cell(ctx, x + 1, SHELF_Y - 3 + (frame % 2), "#ffd45e", 1, 1);
    }
  });
  // retro TV
  cell(ctx, TV_X - 6, FLOOR_Y - 16, "#3a4066", 16, 12);
  const flash = tvFlash > 0;
  cell(ctx, TV_X - 4, FLOOR_Y - 14, flash ? "#f0f2ff" : "#0b1024", 12, 8);
  if (!flash) {
    for (let i = 0; i < 5; i++) {
      cell(
        ctx,
        TV_X - 3 + ((i * 3 + frame) % 10),
        FLOOR_Y - 13 + ((i * 2 + frame) % 6),
        "#263052",
      );
    }
  } else {
    cell(ctx, TV_X - 2 + (frame % 3), FLOOR_Y - 12, "#7ee0ff", 3, 3);
  }
  cell(ctx, TV_X - 2, FLOOR_Y - 4, "#2a2f4a", 8, 2); // stand
  // beanbag
  cell(ctx, 118, FLOOR_Y - 3, "#ff6e9a", 7, 3);
  cell(ctx, 119, FLOOR_Y - 4, "#ff6e9a", 5, 1);

  // avatar (pixel Devauntae)
  const ax = Math.round(avatarX);
  const bob = walking ? frame % 2 : 0;
  const skin = "#b98a68";
  const shirt = "#7ee0ff";
  cell(ctx, ax - 2, FLOOR_Y - 12 + bob, skin, 4, 3); // head
  cell(ctx, ax - 2, FLOOR_Y - 13 + bob, "#1c1430", 4, 1); // hair
  cell(ctx, ax + (facing === 1 ? 0 : -2), FLOOR_Y - 11 + bob, "#0b1024", 2, 1); // eyes
  cell(ctx, ax - 2, FLOOR_Y - 9 + bob, shirt, 4, 4); // body
  cell(ctx, ax - 3, FLOOR_Y - 8 + bob, shirt, 1, 2); // arms
  cell(ctx, ax + 2, FLOOR_Y - 8 + bob, shirt, 1, 2);
  cell(ctx, ax - 2, FLOOR_Y - 5 + (walking ? frame % 2 : 0), "#3a4358", 2, 3); // legs
  cell(ctx, ax, FLOOR_Y - 5 + (walking ? (frame + 1) % 2 : 0), "#3a4358", 2, 3);
}

export function GameRoom({ embedded = false }: { embedded?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const avatar = useRef({ x: 64, facing: 1 as 1 | -1, walking: false });
  const keys = useRef<Set<string>>(new Set());
  const tvFlash = useRef(0);
  const [selected, setSelected] = useState<GameCartridge | null>(null);
  const [inView, setInView] = useState(false);

  // keyboard only while the room is on screen
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.2,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    const pressed = keys.current; // stable Set instance for cleanup
    const canvas = canvasRef.current;
    const clearPressed = () => pressed.clear();
    const down = (e: KeyboardEvent) => {
      if (
        embedded &&
        (document.activeElement !== canvasRef.current || selected)
      )
        return;
      const k = e.key.toLowerCase();
      if (
        [
          "arrowleft",
          "arrowright",
          "a",
          "d",
          "arrowup",
          " ",
          "enter",
          "w",
        ].includes(k)
      ) {
        if (k !== "enter") e.preventDefault();
        keys.current.add(k);
        if (["arrowup", " ", "enter", "w"].includes(k)) {
          const near = CART_XS.findIndex(
            (cx) => Math.abs(avatar.current.x - cx) < 6,
          );
          if (near >= 0) {
            tvFlash.current = 8;
            setSelected(GAMES[near]);
            chime();
          }
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clearPressed);
    canvas?.addEventListener("blur", clearPressed);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clearPressed);
      canvas?.removeEventListener("blur", clearPressed);
      pressed.clear();
    };
  }, [inView, embedded, selected]);

  // render + movement loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const maybeCtx = canvas?.getContext("2d");
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;
    ctx.imageSmoothingEnabled = false;
    let frame = 0;
    let raf = 0;
    let last = 0;
    let lastMove = 0;
    const loop = (t: number) => {
      // movement at ~30fps for responsiveness
      if (t - lastMove > 33) {
        const a = avatar.current;
        const left = keys.current.has("arrowleft") || keys.current.has("a");
        const right = keys.current.has("arrowright") || keys.current.has("d");
        a.walking = left !== right;
        if (left && !right) {
          a.x = Math.max(8, a.x - 1.1);
          a.facing = -1;
        } else if (right && !left) {
          a.x = Math.min(GW - 8, a.x + 1.1);
          a.facing = 1;
        }
        lastMove = t;
      }
      // draw at retro cadence
      if (t - last > 140) {
        if (tvFlash.current > 0) tvFlash.current--;
        const near = CART_XS.findIndex(
          (cx) => Math.abs(avatar.current.x - cx) < 6,
        );
        drawRoom(
          ctx,
          frame,
          avatar.current.x,
          avatar.current.facing,
          avatar.current.walking,
          tvFlash.current,
          near >= 0 ? near : null,
        );
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
    canvas.focus();
    const rect = canvas.getBoundingClientRect();
    const gx = ((e.clientX - rect.left) / rect.width) * GW;
    const gy = ((e.clientY - rect.top) / rect.height) * GH;
    const i = CART_XS.findIndex(
      (cx) => Math.abs(gx - cx) <= 5 && Math.abs(gy - (SHELF_Y + 2)) <= 6,
    );
    if (i >= 0) {
      tvFlash.current = 8;
      setSelected(GAMES[i]);
      chime();
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`glass rounded-2xl p-5 ${embedded ? "pixel-room-embedded" : ""}`}
    >
      <h2 className="text-lg font-bold text-starlight">The Game Room</h2>
      <p className="mt-1 text-xs text-faint">
        Walk with ← → (A/D), inspect a cartridge with ↑ / Space, or just click
        one. The TV approves of your choices.
      </p>
      <canvas
        ref={canvasRef}
        width={GW * PX}
        height={GH * PX}
        onClick={handleClick}
        data-cursor="hand"
        tabIndex={0}
        aria-label="Pixel game room: move the avatar with arrow keys, click cartridges for memories"
        className="mt-3 w-full rounded-lg border border-seam focus-visible:ring-2 focus-visible:ring-lumen/50"
        style={{ imageRendering: "pixelated" }}
      />
      {embedded ? (
        selected && (
          <aside
            className="game-memory"
            data-game-memory
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                setSelected(null);
                canvasRef.current?.focus();
              }
            }}
          >
            <h3>{selected.name}</h3>
            <p>{selected.memory}</p>
            <button
              autoFocus
              onClick={() => {
                setSelected(null);
                canvasRef.current?.focus();
              }}
            >
              {DESK.games.closeMemory} ↩
            </button>
          </aside>
        )
      ) : (
        <GameModal
          open={!!selected}
          onClose={() => setSelected(null)}
          variant="pixel"
          label={selected?.name}
        >
          {selected && (
            <div>
              <div
                className="mb-2 h-3 w-10"
                style={{ background: selected.color }}
                aria-hidden
              />
              <h3 className="font-mono text-sm font-bold text-starlight">
                {selected.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-faint">
                {selected.memory}
              </p>
            </div>
          )}
        </GameModal>
      )}
    </div>
  );
}
