"use client";

/* The mouse tracing effect: a glowing comet tail that follows the system
   cursor, shedding tiny pixel sparks (very Windows-95 "mouse trails", but
   with taste). Colors follow the active palette's lumen token, so themes
   recolor the trail. Fine pointers only; disabled for reduced-motion. */

import { useEffect, useRef, useState } from "react";
import { useUi } from "@/lib/ui-store";

interface P {
  x: number;
  y: number;
  t: number;
}
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const TAIL_MS = 450;

export function MouseTrail() {
  const ref = useRef<HTMLCanvasElement>(null);
  const trailOn = useUi((s) => s.trailOn);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setEnabled(fine.matches && !still.matches);
    apply();
    fine.addEventListener("change", apply);
    still.addEventListener("change", apply);
    return () => {
      fine.removeEventListener("change", apply);
      still.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !trailOn) return;
    const canvas = ref.current;
    const maybeCtx = canvas?.getContext("2d");
    if (!canvas || !maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const fit = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    fit();
    window.addEventListener("resize", fit);

    const points: P[] = [];
    const sparks: Spark[] = [];
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      points.push({ x: e.clientX, y: e.clientY, t: now });
      // shed a pixel spark now and then while moving
      if (Math.random() < 0.3) {
        sparks.push({
          x: e.clientX,
          y: e.clientY,
          vx: (Math.random() - 0.5) * 1.6,
          vy: (Math.random() - 0.5) * 1.6 + 0.4,
          life: 1,
        });
      }
    };

    const loop = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const lumen =
        getComputedStyle(document.documentElement).getPropertyValue("--lumen").trim() ||
        "#7ee0ff";

      // drop expired points
      while (points.length && now - points[0].t > TAIL_MS) points.shift();

      // comet tail: tapered glowing polyline
      if (points.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowColor = lumen;
        for (let i = 1; i < points.length; i++) {
          const a = points[i - 1];
          const b = points[i];
          const age = 1 - (now - b.t) / TAIL_MS; // 0 old → 1 fresh
          ctx.strokeStyle = lumen;
          ctx.globalAlpha = 0.5 * age;
          ctx.lineWidth = 1 + 5 * age;
          ctx.shadowBlur = 12 * age;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // retro pixel sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= 0.03;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        const px = Math.max(1, Math.round(3 * s.life));
        ctx.globalAlpha = 0.7 * s.life;
        ctx.fillStyle = lumen;
        ctx.fillRect(Math.round(s.x), Math.round(s.y), px, px);
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", fit);
      cancelAnimationFrame(raf);
    };
  }, [enabled, trailOn]);

  if (!enabled || !trailOn) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[300]"
    />
  );
}
