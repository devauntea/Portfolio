"use client";

/* VOID PATROL, the Game Room's playable space shooter (canvas 2D, retro
   rects, palette-aware). Move with ←→/A·D or the mouse; hold Space or the
   pointer to fire; R restarts. Destroyed ships drop items: score gems,
   rapid-fire, spread shot, shields, and rare 📼 cartridges that light up
   one of Devauntae's favorite games in the side panel (onCartridge). */

import { useEffect, useRef, useState } from "react";
import { DESK } from "@/data/profile";
import { chime, thunk, fanfare } from "@/lib/sound";

const W = 160; // logical grid
const H = 100;
const PX = 5; // canvas pixels per cell

interface Bullet {
  x: number;
  y: number;
  vx: number;
}
interface Enemy {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  kind: 0 | 1 | 2;
  t: number;
}
interface Drop {
  x: number;
  y: number;
  kind: "gem" | "rapid" | "spread" | "shield" | "cart";
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  c: string;
}

export function SpaceShooter({
  onCartridge,
  embedded = false,
}: {
  onCartridge: () => void;
  embedded?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cartRef = useRef(onCartridge);
  useEffect(() => {
    cartRef.current = onCartridge;
  }, [onCartridge]);
  const [best, setBest] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const maybeCtx = canvas?.getContext("2d");
    if (!canvas || !maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;
    ctx.imageSmoothingEnabled = false;

    /* ---- state (all refs inside the effect; React never re-renders the loop) ---- */
    const keys = new Set<string>();
    let ship = { x: W / 2, y: H - 10 };
    let bullets: Bullet[] = [];
    let enemies: Enemy[] = [];
    let drops: Drop[] = [];
    let parts: Particle[] = [];
    let score = 0;
    let lives = 3;
    let wave = 0;
    let shield = false;
    let rapidUntil = 0;
    let spreadUntil = 0;
    let lastShot = 0;
    let firing = false;
    let active = !embedded;
    let over = false;
    let raf = 0;
    let last = 0;

    const css = (name: string, fb: string) =>
      getComputedStyle(document.documentElement)
        .getPropertyValue(name)
        .trim() || fb;

    function reset() {
      ship = { x: W / 2, y: H - 10 };
      bullets = [];
      enemies = [];
      drops = [];
      parts = [];
      score = 0;
      lives = 3;
      wave = 0;
      shield = false;
      rapidUntil = 0;
      spreadUntil = 0;
      over = false;
      spawnWave();
    }

    function spawnWave() {
      wave += 1;
      const n = 3 + wave * 2;
      for (let i = 0; i < n; i++) {
        const kind = (wave > 2 && i % 5 === 4 ? 2 : i % 3 === 2 ? 1 : 0) as
          0 | 1 | 2;
        enemies.push({
          x: 12 + Math.random() * (W - 24),
          y: -6 - Math.random() * 40 - (i % 4) * 10,
          vx: (Math.random() - 0.5) * 14,
          vy: kind === 2 ? 4 : 7 + Math.random() * 5 + wave,
          hp: kind === 2 ? 4 : 1,
          kind,
          t: Math.random() * 6,
        });
      }
    }

    function boom(x: number, y: number, c: string, n = 10) {
      for (let i = 0; i < n; i++) {
        parts.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 50,
          vy: (Math.random() - 0.5) * 50,
          life: 0.5 + Math.random() * 0.4,
          c,
        });
      }
    }

    function kill(e: Enemy) {
      score += e.kind === 2 ? 50 : e.kind === 1 ? 20 : 10;
      boom(e.x, e.y, css("--ember", "#ff8a4d"));
      thunk();
      const roll = Math.random();
      if (roll < 0.32) {
        const kind =
          roll < 0.16
            ? "gem"
            : roll < 0.22
              ? "rapid"
              : roll < 0.27
                ? "spread"
                : roll < 0.305
                  ? "shield"
                  : "cart";
        drops.push({ x: e.x, y: e.y, kind: kind as Drop["kind"] });
      }
    }

    function hitShip() {
      if (shield) {
        shield = false;
        boom(ship.x, ship.y, css("--lumen", "#7ee0ff"), 14);
        return;
      }
      lives -= 1;
      boom(ship.x, ship.y, css("--rose", "#ff6e9a"), 18);
      if (lives <= 0) {
        over = true;
        setBest((b) => Math.max(b, score));
      }
    }

    function shoot(now: number) {
      const interval = now < rapidUntil ? 95 : 220;
      if (now - lastShot < interval) return;
      lastShot = now;
      bullets.push({ x: ship.x, y: ship.y - 3, vx: 0 });
      if (performance.now() < spreadUntil) {
        bullets.push({ x: ship.x, y: ship.y - 3, vx: -22 });
        bullets.push({ x: ship.x, y: ship.y - 3, vx: 22 });
      }
    }

    /* ---- input ---- */
    const down = (e: KeyboardEvent) => {
      if (embedded && document.activeElement !== canvas) return;
      const k = e.key.toLowerCase();
      if (
        ["arrowleft", "arrowright", "a", "d", " "].includes(k === " " ? " " : k)
      )
        e.preventDefault();
      if (k === " ") firing = true;
      else if (k === "r" && over) reset();
      else keys.add(k);
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") firing = false;
      keys.delete(k);
    };
    const toGrid = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0) return null;
      return ((e.clientX - r.left) / r.width) * W;
    };
    const onPointerMove = (e: PointerEvent) => {
      const gx = toGrid(e);
      if (gx !== null) ship.x = Math.max(4, Math.min(W - 4, gx));
    };
    const onPointerDown = (e: PointerEvent) => {
      canvas.focus();
      active = true;
      if (over) {
        reset();
        return;
      }
      firing = true;
      onPointerMove(e);
    };
    const onPointerUp = () => {
      firing = false;
    };
    const pause = () => {
      if (embedded) {
        active = false;
        firing = false;
        keys.clear();
      }
    };
    const resume = () => {
      active = true;
    };
    canvas.addEventListener("blur", pause);
    canvas.addEventListener("focus", resume);
    window.addEventListener("blur", pause);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointerup", onPointerUp);

    /* ---- loop ---- */
    function step(dt: number, now: number) {
      if (keys.has("arrowleft") || keys.has("a")) ship.x -= 55 * dt;
      if (keys.has("arrowright") || keys.has("d")) ship.x += 55 * dt;
      ship.x = Math.max(4, Math.min(W - 4, ship.x));
      if (firing && !over) shoot(now);

      bullets = bullets.filter((b) => {
        b.y -= 90 * dt;
        b.x += b.vx * dt;
        return b.y > -4 && b.x > 0 && b.x < W;
      });

      for (const e of enemies) {
        e.t += dt;
        e.x += (e.kind === 1 ? Math.sin(e.t * 3) * 30 : e.vx) * dt;
        e.y += e.vy * dt;
        if (e.x < 4 || e.x > W - 4) e.vx *= -1;
        if (e.y > H + 6) {
          e.y = -8;
          e.x = 12 + Math.random() * (W - 24);
        }
        // collide with ship
        if (!over && Math.abs(e.x - ship.x) < 5 && Math.abs(e.y - ship.y) < 5) {
          e.y = -10;
          hitShip();
        }
      }

      // bullets → enemies
      for (const b of bullets) {
        for (const e of enemies) {
          if (Math.abs(b.x - e.x) < 4 && Math.abs(b.y - e.y) < 4) {
            b.y = -99;
            e.hp -= 1;
            if (e.hp <= 0) {
              kill(e);
              e.y = 999; // mark dead
            }
            break;
          }
        }
      }
      enemies = enemies.filter((e) => e.y < 900);
      if (enemies.length === 0 && !over) {
        fanfare();
        spawnWave();
      }

      drops = drops.filter((d) => {
        d.y += 18 * dt;
        if (Math.abs(d.x - ship.x) < 6 && Math.abs(d.y - ship.y) < 6) {
          chime();
          if (d.kind === "gem") score += 25;
          else if (d.kind === "rapid") rapidUntil = now + 8000;
          else if (d.kind === "spread") spreadUntil = now + 8000;
          else if (d.kind === "shield") shield = true;
          else cartRef.current();
          return false;
        }
        return d.y < H + 4;
      });

      parts = parts.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life > 0;
      });
    }

    function draw(now: number) {
      const lumen = css("--lumen", "#7ee0ff");
      const rose = css("--rose", "#ff6e9a");
      const gilt = css("--gilt", "#ffd45e");
      const sprout = css("--sprout", "#97e87a");
      ctx.fillStyle = css("--cosmos", "#070912");
      ctx.fillRect(0, 0, W * PX, H * PX);
      // starfield scroll
      for (let i = 0; i < 50; i++) {
        const sx = (i * 37) % W;
        const sy =
          (((i * 23 + Math.floor(now / (40 + (i % 5) * 22))) % H) + H) % H;
        ctx.fillStyle = i % 4 ? "#2c3258" : "#4a5488";
        ctx.fillRect(sx * PX, sy * PX, PX - 2, PX - 2);
      }
      const cell = (x: number, y: number, c: string, w = 1, h = 1) => {
        ctx.fillStyle = c;
        ctx.fillRect(
          Math.round(x - w / 2) * PX,
          Math.round(y - h / 2) * PX,
          w * PX,
          h * PX,
        );
      };
      // ship
      if (!over) {
        cell(ship.x, ship.y, lumen, 1, 2);
        cell(ship.x - 1.5, ship.y + 1, lumen, 1, 1);
        cell(ship.x + 1.5, ship.y + 1, lumen, 1, 1);
        cell(ship.x, ship.y + 2, css("--ember", "#ff8a4d"), 1, 1); // thruster
        if (shield) {
          ctx.strokeStyle = sprout;
          ctx.lineWidth = 2;
          ctx.strokeRect((ship.x - 4) * PX, (ship.y - 4) * PX, 8 * PX, 8 * PX);
        }
      }
      for (const b of bullets) cell(b.x, b.y, gilt, 0.7, 1.6);
      for (const e of enemies) {
        const c =
          e.kind === 2
            ? rose
            : e.kind === 1
              ? css("--ember", "#ff8a4d")
              : "#b48ad6";
        cell(e.x, e.y, c, e.kind === 2 ? 4 : 3, 2);
        cell(e.x, e.y - 1, c, e.kind === 2 ? 2 : 1, 1);
      }
      for (const d of drops) {
        const glyph = {
          gem: "◆",
          rapid: "⚡",
          spread: "⁂",
          shield: "▣",
          cart: "▮",
        }[d.kind];
        ctx.font = `${PX * 3.2}px monospace`;
        ctx.textAlign = "center";
        ctx.fillStyle = d.kind === "cart" ? rose : gilt;
        ctx.fillText(glyph, d.x * PX, d.y * PX);
      }
      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, p.life * 1.6);
        cell(p.x, p.y, p.c, 0.8, 0.8);
        ctx.globalAlpha = 1;
      }
      // HUD
      ctx.font = `bold ${PX * 2.6}px monospace`;
      ctx.textAlign = "left";
      ctx.fillStyle = "#f0f2ff";
      ctx.fillText(`SCORE ${score}`, PX * 2, PX * 5);
      ctx.fillText(`WAVE ${wave}`, PX * 2, PX * 9);
      ctx.textAlign = "right";
      ctx.fillStyle = rose;
      ctx.fillText("♥".repeat(Math.max(0, lives)), (W - 2) * PX, PX * 5);
      ctx.fillStyle = gilt;
      const pow = [
        now < rapidUntil ? "⚡" : "",
        now < spreadUntil ? "⁂" : "",
        shield ? "▣" : "",
      ].join("");
      if (pow) ctx.fillText(pow, (W - 2) * PX, PX * 9);
      if (over) {
        ctx.textAlign = "center";
        ctx.fillStyle = rose;
        ctx.font = `bold ${PX * 6}px monospace`;
        ctx.fillText("GAME OVER", (W / 2) * PX, (H / 2 - 4) * PX);
        ctx.fillStyle = "#f0f2ff";
        ctx.font = `${PX * 2.8}px monospace`;
        ctx.fillText(
          `score ${score}. Press R or tap to fly again`,
          (W / 2) * PX,
          (H / 2 + 4) * PX,
        );
      }
    }

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      if (!over && active && !document.hidden) step(dt, t);
      draw(t);
      if (!active) {
        ctx.globalAlpha = 0.87;
        ctx.fillStyle = css("--cosmos", "#070912");
        ctx.fillRect(0, 0, W * PX, H * PX);
        ctx.globalAlpha = 1;
        ctx.fillStyle = css("--starlight", "#f0f2ff");
        ctx.textAlign = "center";
        ctx.font = "20px monospace";
        ctx.fillText(DESK.games.paused, (W * PX) / 2, (H * PX) / 2);
      }
      raf = requestAnimationFrame(loop);
    };
    reset();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("blur", pause);
      canvas.removeEventListener("focus", resume);
      window.removeEventListener("blur", pause);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerdown", onPointerDown);
    };
  }, [embedded]);

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={W * PX}
        height={H * PX}
        tabIndex={0}
        data-cursor="hand"
        aria-label="Void Patrol, a space shooter. Arrow keys or mouse to move, Space or click to fire."
        className="w-full rounded-lg border border-seam touch-none"
        style={{ imageRendering: "pixelated" }}
      />
      <p className="mt-2 text-center font-mono text-[10px] text-faint">
        ←→ / mouse to fly · SPACE / hold click to fire · collect ◆⚡⁂▣ · rare ▮
        cartridges unlock the shelf →{" "}
        {best > 0 && <span className="text-gilt">best {best}</span>}
      </p>
    </div>
  );
}
