"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { makeTexture, type Palette } from "./DeskMaterials";
import { mix } from "./DeskSurfaces";
import { DESK } from "@/data/profile";

/*
 * The small evidence of use: stickers, notes, grime where hands go, scuffs
 * where things get kicked, chips along the desk's edge. Every one is a thin
 * decal on a static surface (or rides with the drawer), so none of them
 * casts shadows or needs a shadow refresh. All designs are original.
 */

type Vec = [number, number, number];
type Kind = "vinyl" | "paper" | "holo" | "grime";

const HAND = "italic 600 44px 'Bradley Hand', 'Segoe Print', 'Comic Sans MS', cursive";

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

/** A plane that can curl away from its surface along the bottom edge or at a corner. */
function curledPlane(w: number, h: number, curl: number, corner: boolean) {
  const g = new THREE.PlaneGeometry(w, h, 8, 8);
  if (!curl) return g;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / w + 0.5,
      v = pos.getY(i) / h + 0.5;
    const lift = corner ? Math.max(0, u - v - 0.45) : Math.max(0, 0.45 - v);
    pos.setZ(i, curl * lift * lift);
  }
  g.computeVertexNormals();
  return g;
}

export function Decal({
  texture,
  pos,
  rot = [0, 0, 0],
  size,
  kind,
  color,
  opacity = 1,
  curl = 0,
  corner = false,
}: {
  texture: THREE.Texture;
  pos: Vec;
  rot?: Vec;
  size: [number, number];
  kind: Kind;
  color?: string;
  opacity?: number;
  curl?: number;
  corner?: boolean;
}) {
  const geometry = useMemo(
    () => curledPlane(size[0], size[1], curl, corner),
    [size, curl, corner],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const shared = {
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  };
  return (
    <mesh position={pos} rotation={rot} geometry={geometry} renderOrder={2}>
      {kind === "grime" ? (
        <meshStandardMaterial
          color={color}
          alphaMap={texture}
          transparent
          opacity={opacity}
          depthWrite={false}
          roughness={0.9}
          {...shared}
        />
      ) : kind === "holo" ? (
        <meshPhysicalMaterial
          map={texture}
          alphaTest={0.5}
          roughness={0.22}
          metalness={0.55}
          iridescence={1}
          iridescenceIOR={1.6}
          iridescenceThicknessRange={[180, 720]}
          {...shared}
        />
      ) : (
        <meshStandardMaterial
          map={texture}
          alphaTest={0.5}
          roughness={kind === "paper" ? 0.88 : 0.36}
          side={kind === "paper" ? THREE.DoubleSide : THREE.FrontSide}
          {...shared}
        />
      )}
    </mesh>
  );
}

/* ---------------------------------------------------------------- designs */

/** Die-cut outline: draw the shape, then a white border behind it. */
function dieCut(ctx: CanvasRenderingContext2D, border: string, draw: () => void, width = 14) {
  ctx.save();
  ctx.lineJoin = "round";
  ctx.strokeStyle = border;
  ctx.fillStyle = border;
  ctx.lineWidth = width;
  draw();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function stickyNote(p: Palette, lines: string[], todo?: { done: number }) {
  return makeTexture(256, 256, (ctx) => {
    const paper = mix(p.posterSand, p.light, 0.45);
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 256, 256);
    // The glue strip is a shade darker; the bottom picks up a little grime.
    ctx.fillStyle = mix(paper, p.clay, 0.25);
    ctx.fillRect(0, 0, 256, 34);
    const grime = ctx.createLinearGradient(0, 200, 0, 256);
    grime.addColorStop(0, "transparent");
    grime.addColorStop(1, p.clay);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = grime;
    ctx.fillRect(0, 200, 256, 56);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.blue;
    ctx.strokeStyle = p.blue;
    ctx.lineWidth = 3;
    ctx.font = todo ? HAND.replace("44px", "34px") : HAND;
    lines.forEach((line, i) => {
      const y = todo ? 78 + i * 44 : 104 + i * 62;
      const x = todo ? 64 : 26;
      ctx.fillText(line, x, y, 256 - x - 12);
      if (todo) {
        ctx.strokeRect(26, y - 24, 24, 24);
        if (i < todo.done) {
          ctx.beginPath();
          ctx.moveTo(30, y - 12);
          ctx.lineTo(38, y - 3);
          ctx.lineTo(54, y - 30);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(62, y - 10);
          ctx.lineTo(62 + ctx.measureText(line).width, y - 14);
          ctx.stroke();
        }
      }
    });
    if (!todo) {
      ctx.beginPath();
      ctx.moveTo(30, 194);
      ctx.quadraticCurveTo(120, 214, 200, 188);
      ctx.stroke();
    }
  });
}

function helloSticker(p: Palette) {
  return makeTexture(512, 256, (ctx) => {
    const bubble = () => {
      ctx.beginPath();
      ctx.roundRect(40, 40, 420, 130, 60);
      ctx.moveTo(120, 165);
      ctx.lineTo(100, 225);
      ctx.lineTo(175, 168);
    };
    dieCut(ctx, p.paper, bubble, 22);
    ctx.fillStyle = p.ink;
    bubble();
    ctx.fill();
    ctx.fillStyle = mix(p.accentLight, p.light, 0.3);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 46px monospace";
    const text = DESK.details.stickers.hello;
    const half = ctx.measureText(text).width / 2;
    ctx.fillText(text, 236, 107);
    // A blinking-cursor block right after the text.
    ctx.fillStyle = p.sun;
    ctx.fillRect(236 + half + 8, 87, 20, 40);
  });
}

function smileySticker(p: Palette) {
  return makeTexture(256, 256, (ctx) => {
    const disc = () => {
      ctx.beginPath();
      ctx.arc(128, 128, 104, 0, Math.PI * 2);
    };
    dieCut(ctx, p.paper, disc, 22);
    ctx.fillStyle = mix(p.sun, p.posterSand, 0.3);
    disc();
    ctx.fill();
    ctx.fillStyle = p.ink;
    for (const x of [94, 162]) {
      ctx.beginPath();
      ctx.ellipse(x, 104, 11, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = p.ink;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(128, 132, 58, 0.25, Math.PI - 0.25);
    ctx.stroke();
    // Faded and scratched from years on the case.
    ctx.globalCompositeOperation = "source-atop";
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = p.paper;
    const rand = seeded(17);
    for (let i = 0; i < 40; i++) ctx.fillRect(rand() * 256, rand() * 256, 2 + rand() * 30, 1.5);
    ctx.globalAlpha = 1;
  });
}

function assetTag(p: Palette) {
  return makeTexture(512, 256, (ctx) => {
    ctx.fillStyle = mix(p.metal, p.paper, 0.35);
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 240, 18);
    ctx.fill();
    ctx.fillStyle = p.ink;
    const [line1, line2, line3] = DESK.details.stickers.asset;
    ctx.font = "bold 30px monospace";
    ctx.fillText(line1, 32, 56);
    ctx.font = "bold 44px monospace";
    ctx.fillText(line2, 32, 104);
    ctx.font = "26px monospace";
    ctx.fillText(line3, 32, 220);
    const rand = seeded(29);
    for (let x = 32; x < 470; ) {
      const w = 2 + Math.floor(rand() * 5);
      ctx.fillRect(x, 124, w, 64);
      x += w + 2 + Math.floor(rand() * 4);
    }
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = p.clay;
    ctx.fillRect(8, 200, 496, 48);
    ctx.globalAlpha = 1;
  });
}

function monogramSticker(p: Palette) {
  return makeTexture(256, 256, (ctx) => {
    const tile = () => {
      ctx.beginPath();
      ctx.roundRect(36, 36, 184, 184, 40);
    };
    dieCut(ctx, p.paper, tile, 24);
    ctx.fillStyle = p.ink;
    tile();
    ctx.fill();
    ctx.fillStyle = p.paper;
    ctx.font = "italic 112px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(DESK.initials, 128, 128);
  });
}

function starSticker(p: Palette) {
  return makeTexture(256, 256, (ctx) => {
    const star = () => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 46 : 104;
        ctx.lineTo(128 + Math.cos(a) * r, 136 + Math.sin(a) * r);
      }
      ctx.closePath();
    };
    dieCut(ctx, p.paper, star, 18);
    ctx.fillStyle = mix(p.metal, p.sky, 0.3);
    star();
    ctx.fill();
  });
}

/** Soft blotches, as an alpha map (white = grime). */
function grimeTexture(seed: number, streaks = false) {
  return makeTexture(256, 128, (ctx) => {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 256, 128);
    const rand = seeded(seed);
    for (let i = 0; i < 26; i++) {
      const x = 30 + rand() * 196,
        y = 20 + rand() * 88,
        r = 10 + rand() * 34;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "white");
      g.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.18 + rand() * 0.25;
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    if (streaks) {
      ctx.strokeStyle = "white";
      ctx.lineCap = "round";
      for (let i = 0; i < 18; i++) {
        const x = rand() * 256,
          y = 30 + rand() * 80;
        ctx.globalAlpha = 0.3 + rand() * 0.4;
        ctx.lineWidth = 1 + rand() * 3;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 10 + rand() * 40, y + (rand() - 0.5) * 8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  });
}

function useDisposal(textures: Record<string, THREE.Texture>) {
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);
}

/* ------------------------------------------------------------- placements */

/** Monitor-local: a note on the bezel, an asset tag, a holo star, fingerprints. */
export function MonitorWear({ p }: { p: Palette }) {
  const t = useMemo(
    () => ({
      note: stickyNote(p, DESK.details.stickers.note),
      tag: assetTag(p),
      star: starSticker(p),
      prints: grimeTexture(5),
    }),
    [p],
  );
  useDisposal(t);
  return (
    <>
      <Decal texture={t.note} kind="paper" pos={[1.555, 0.745, 0.37]} rot={[0, 0, 0.09]} size={[0.25, 0.25]} curl={0.22} />
      <Decal texture={t.prints} kind="grime" color={p.clay} opacity={0.5} pos={[1.2, 0.76, 0.368]} size={[0.42, 0.22]} />
      <Decal texture={t.tag} kind="vinyl" pos={[-1.742, 1.25, -0.42]} rot={[0, -Math.PI / 2, 0.02]} size={[0.44, 0.22]} />
      <Decal texture={t.star} kind="holo" pos={[-1.12, 3.252, -0.14]} rot={[-Math.PI / 2, 0, 0.4]} size={[0.2, 0.2]} />
    </>
  );
}

/** Tower-local: stickers on the front and side, kick scuffs near the foot. */
export function TowerWear({ p }: { p: Palette }) {
  const t = useMemo(
    () => ({
      hello: helloSticker(p),
      smiley: smileySticker(p),
      scuffs: grimeTexture(13, true),
    }),
    [p],
  );
  useDisposal(t);
  return (
    <>
      {/* Stuck straight over the printed model label, as people do. */}
      <Decal texture={t.hello} kind="vinyl" pos={[-0.17, -0.3, 0.981]} rot={[0, 0, 0.07]} size={[0.4, 0.2]} curl={0.1} corner />
      <Decal texture={t.smiley} kind="vinyl" pos={[0.32, 0.855, 0.968]} rot={[0, 0, -0.2]} size={[0.15, 0.15]} />
      <Decal texture={t.scuffs} kind="grime" color={p.ink} opacity={0.45} pos={[0, -0.905, 0.968]} size={[0.92, 0.08]} />
    </>
  );
}

/** Drawer-local, riding with the drawer: the monogram sticker and handle grime. */
export function DrawerWear({ p }: { p: Palette }) {
  const t = useMemo(
    () => ({ monogram: monogramSticker(p), grime: grimeTexture(21) }),
    [p],
  );
  useDisposal(t);
  return (
    <>
      <Decal texture={t.monogram} kind="vinyl" pos={[0.72, -1.3, 2.018]} rot={[0, 0, -0.16]} size={[0.24, 0.24]} curl={0.12} corner />
      <Decal texture={t.grime} kind="grime" color={p.woodDark} opacity={0.55} pos={[0, -0.52, 2.018]} size={[0.95, 0.3]} />
    </>
  );
}

/** Pedestal-local (static): grime round the lower drawer's pull. */
export function PedestalWear({ p }: { p: Palette }) {
  const t = useMemo(() => ({ grime: grimeTexture(23) }), []);
  useDisposal(t);
  return (
    <Decal texture={t.grime} kind="grime" color={p.woodDark} opacity={0.5} pos={[0, -1.9, 1.963]} size={[0.85, 0.3]} />
  );
}

/** Keyboard-local: the front rail darkened where palms rest. */
export function KeyboardWear({ p }: { p: Palette }) {
  const t = useMemo(() => ({ palms: grimeTexture(31) }), []);
  useDisposal(t);
  return (
    <Decal texture={t.palms} kind="grime" color={p.clay} opacity={0.55} pos={[0.1, 0.0815, 0.61]} rot={[-Math.PI / 2, 0, 0]} size={[3.0, 0.16]} />
  );
}

/** World: a to-do on the desk and chips worn into the desk's front edge. */
export function DeskWear({ p }: { p: Palette }) {
  const t = useMemo(
    () => ({
      todo: stickyNote(p, DESK.details.stickers.todo.items, DESK.details.stickers.todo),
      // Covers only the flat band of the rounded edge.
      edge: makeTexture(2048, 64, (ctx) => {
        const rand = seeded(43);
        // The top arris is rubbed pale along its length, worst where hands land.
        const rub = ctx.createLinearGradient(0, 0, 0, 14);
        rub.addColorStop(0, p.clay);
        rub.addColorStop(1, "transparent");
        ctx.fillStyle = rub;
        ctx.globalAlpha = 0.5;
        ctx.fillRect(0, 0, 2048, 14);
        // Chips show raw, paler wood; dents hold dirt. Both run with the edge.
        for (let i = 0; i < 34; i++) {
          const x = rand() * 2048,
            y = 4 + rand() * 52,
            dark = rand() < 0.5;
          ctx.globalAlpha = dark ? 0.3 + rand() * 0.25 : 0.3 + rand() * 0.3;
          ctx.fillStyle = dark ? p.woodDark : p.clay;
          ctx.beginPath();
          ctx.ellipse(x, y, 3 + rand() * 9, 1 + rand() * 2.2, (rand() - 0.5) * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = p.clay;
        for (let i = 0; i < 14; i++) {
          const x = rand() * 2048,
            y = 8 + rand() * 48;
          ctx.globalAlpha = 0.2 + rand() * 0.2;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 20 + rand() * 80, y + (rand() - 0.5) * 3);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }),
    }),
    [p],
  );
  useDisposal(t);
  return (
    <>
      <Decal texture={t.todo} kind="paper" pos={[-1.95, 0.1265, 2.36]} rot={[-Math.PI / 2, 0, 0.22]} size={[0.27, 0.27]} curl={0.13} corner />
      <mesh position={[0, 0, 2.8262]} renderOrder={2}>
        <planeGeometry args={[10.95, 0.12]} />
        <meshStandardMaterial
          map={t.edge}
          transparent
          depthWrite={false}
          roughness={0.85}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
        />
      </mesh>
    </>
  );
}
