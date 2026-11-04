"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Box,
  Cable,
  Label,
  Ring,
  Screw,
  makeTexture,
  useShadowRefresh,
  useSurfaces,
  type Palette,
} from "./DeskMaterials";
import { mix } from "./DeskSurfaces";
import { DESK } from "@/data/profile";

type Series = { jacket: string; ink: string; accent: string; light: string };

function series(p: Palette, title: string): Series {
  if (title.startsWith("BERSERK"))
    return { jacket: p.ink, ink: mix(p.red, p.blush, 0.45), accent: p.red, light: p.paper };
  if (title.startsWith("VINLAND"))
    return { jacket: mix(p.paper, p.light, 0.3), ink: p.ink, accent: p.blue, light: p.paper };
  return { jacket: mix(p.red, p.blush, 0.2), ink: p.paper, accent: p.ink, light: p.sun };
}

/** Screentone: the halftone dots every manga is printed with. */
function halftone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step = 7,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h + step; yy += step)
    for (let xx = x + ((yy / step) % 2) * (step / 2); xx < x + w + step; xx += step) {
      const r = (step / 2) * (0.25 + 0.75 * ((xx - x) / w));
      ctx.beginPath();
      ctx.arc(xx, yy, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  ctx.restore();
}

/** Handling wear shared by spines and covers: rubbed ends and soft creases. */
function wear(ctx: CanvasRenderingContext2D, w: number, h: number, light: string, seed: number) {
  let n = seed;
  const rand = () => ((n = (n * 16807) % 2147483647) - 1) / 2147483646;
  for (const [x0, x1] of [[0, 46], [w, w - 46]]) {
    const rub = ctx.createLinearGradient(x0, 0, x1, 0);
    rub.addColorStop(0, light);
    rub.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = rub;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.strokeStyle = light;
  for (let i = 0; i < 4; i++) {
    const y = h * (0.2 + rand() * 0.6),
      x = rand() * w * 0.6;
    ctx.globalAlpha = 0.12 + rand() * 0.12;
    ctx.lineWidth = 1 + rand();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + 80, y + 3, x + 160, y - 3, x + 140 + rand() * 260, y + (rand() - 0.5) * 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function MangaVolume({ p, index }: { p: Palette; index: number }) {
  const book = DESK.details.manga[index];
  const look = useMemo(() => series(p, book.title), [p, book.title]);
  const s = useSurfaces();
  const textures = useMemo(() => {
    // Spine, read top to bottom like an English-edition tankōbon: the
    // canvas is turned 180° because U runs from the foot of the book up.
    const spine = makeTexture(1024, 176, (ctx) => {
      ctx.translate(1024, 176);
      ctx.rotate(Math.PI);
      ctx.fillStyle = look.jacket;
      ctx.fillRect(0, 0, 1024, 176);
      if (book.title.startsWith("VINLAND")) {
        // A sea-blue head band with an original sail mark, and an obi below.
        ctx.fillStyle = look.accent;
        ctx.fillRect(0, 0, 210, 176);
        halftone(ctx, 120, 0, 90, 176, look.jacket, 9);
        ctx.fillStyle = look.light;
        ctx.beginPath();
        ctx.moveTo(52, 132);
        ctx.lineTo(96, 132);
        ctx.lineTo(74, 42);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(72, 40, 4, 100);
        ctx.fillStyle = p.sun;
        ctx.fillRect(820, 0, 204, 176);
        ctx.fillStyle = p.ink;
        ctx.font = "bold 22px monospace";
        ctx.fillText(`VOL.${book.volume}`, 860, 96);
      } else if (book.title.startsWith("BERSERK")) {
        // Three red slashes and a screentone fade toward the foot.
        ctx.strokeStyle = look.ink;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
          ctx.lineWidth = 9 - i * 2;
          ctx.beginPath();
          ctx.moveTo(40 + i * 26, 140);
          ctx.lineTo(80 + i * 26, 36);
          ctx.stroke();
        }
        halftone(ctx, 900, 0, 124, 176, mix(p.ink, p.shadow, 0.35), 8);
      } else {
        // Saw-tooth band.
        ctx.fillStyle = look.accent;
        ctx.fillRect(0, 0, 200, 176);
        ctx.fillStyle = look.jacket;
        for (let y = 0; y < 176; y += 22) {
          ctx.beginPath();
          ctx.moveTo(200, y);
          ctx.lineTo(230, y + 11);
          ctx.lineTo(200, y + 22);
          ctx.fill();
        }
        ctx.fillStyle = look.light;
        ctx.beginPath();
        ctx.arc(100, 88, 34, 0, Math.PI * 2);
        ctx.fill();
        halftone(ctx, 900, 0, 124, 176, mix(look.jacket, p.ink, 0.35), 8);
      }
      // Title, set wide along the spine.
      ctx.fillStyle = look.ink;
      ctx.font = book.title.startsWith("CHAINSAW")
        ? "900 70px Impact, 'Arial Black', sans-serif"
        : "bold 70px Georgia, serif";
      ctx.textBaseline = "middle";
      ctx.fillText(book.title, 262, 92, 470);
      // Volume badge and an imprint mark at the foot (Vinland's is on its obi).
      if (!book.title.startsWith("VINLAND")) {
        ctx.fillStyle = look.ink;
        ctx.fillRect(760, 50, 2, 76);
        ctx.font = "bold 58px monospace";
        ctx.fillText(book.volume, 790, 92);
        ctx.strokeStyle = look.ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(940, 88, 16, 0, Math.PI * 2);
        ctx.stroke();
      }
      wear(ctx, 1024, 176, p.paper, 31 + index * 7);
    });
    // The outward cover of the first volume: original artwork, not a copy
    // of any real cover. Drawn upright in cover space, then turned onto the
    // board (book-up runs along U, the spine edge along +V).
    const cover = makeTexture(768, 540, (ctx) => {
      ctx.setTransform(0, 1, -1, 0, 768, 0);
      const W = 540,
        H = 768;
      ctx.fillStyle = look.jacket;
      ctx.fillRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 120, 0, H);
      sky.addColorStop(0, look.accent);
      sky.addColorStop(1, look.jacket);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 150, W, H - 150);
      halftone(ctx, 0, 380, W, 300, mix(look.jacket, p.ink, 0.5), 10);
      // A brush ensō and a hard diagonal: motion, not a character.
      ctx.strokeStyle = look.ink;
      ctx.lineCap = "round";
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(W * 0.55, 430, 150, 0.4, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = look.light;
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(40, 660);
      ctx.lineTo(W - 30, 250);
      ctx.stroke();
      ctx.fillStyle = look.ink;
      ctx.font = "bold 82px Georgia, serif";
      ctx.fillText(book.title, 30, 112, W - 60);
      ctx.fillStyle = look.light;
      ctx.fillRect(W - 98, 128, 70, 56);
      ctx.fillStyle = look.jacket;
      ctx.font = "bold 40px monospace";
      ctx.fillText(book.volume, W - 86, 170);
      ctx.fillStyle = look.light;
      ctx.font = "18px monospace";
      ctx.fillText(DESK.details.bookNote, 30, H - 34);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      wear(ctx, 768, 540, p.paper, 77);
    });
    return { spine, cover };
  }, [p, book, look, index]);
  useEffect(
    () => () => Object.values(textures).forEach((t) => t.dispose()),
    [textures],
  );
  const w = index < 2 ? 1.7 : 1.55,
    d = index < 2 ? 1.95 : 1.85;
  // A glossy dust jacket over a matte page block.
  const jacket = {
    color: look.jacket,
    roughness: 0.42,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  };
  return (
    <group
      position={[
        ((index % 3) - 1) * 0.035,
        0.12 + index * 0.225,
        index === 1 ? 0.07 : 0,
      ]}
      rotation={[0, [0, 0.045, -0.055, 0.02, -0.08][index], 0]}
    >
      <Box
        pos={[0, 0, -0.01]}
        size={[w - 0.05, 0.188, d - 0.07]}
        color={p.paper}
        map={s.pages}
        roughness={0.95}
        radius={0.006}
      />
      {[-0.106, 0.106].map((y) => (
        <Box key={y} pos={[0, y, 0]} size={[w, 0.02, d]} radius={0.006} {...jacket} />
      ))}
      <Box pos={[0, 0, d / 2 - 0.008]} size={[w, 0.228, 0.035]} radius={0.012} {...jacket} />
      <mesh position={[0, 0, d / 2 + 0.0105]}>
        <planeGeometry args={[w - 0.022, 0.214]} />
        <meshPhysicalMaterial
          map={textures.spine}
          roughness={0.45}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
        />
      </mesh>
      {index === 0 && (
        <mesh position={[0, -0.1175, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.02, d - 0.02]} />
          <meshPhysicalMaterial
            map={textures.cover}
            roughness={0.45}
            clearcoat={0.4}
            clearcoatRoughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

export function MangaStack({ p }: { p: Palette }) {
  return (
    <group
      position={[-6.65, 3.47, -3.15]}
      scale={[0.78, 1, 0.48]}
      rotation={[0, 0, Math.PI / 2]}
    >
      {DESK.details.manga.map((_, i) => (
        <MangaVolume p={p} index={i} key={i} />
      ))}
      {/* A ribbon marks where reading stopped. */}
      <Box
        pos={[0.83, 0.12 + 3 * 0.225, 0.55]}
        size={[0.16, 0.008, 0.06]}
        color={p.blush}
        roughness={0.6}
        radius={0.002}
      />
    </group>
  );
}

export function SewingMachine({
  p,
  woven,
  reduced,
  active,
}: {
  p: Palette;
  woven: THREE.Texture;
  reduced: boolean;
  active: boolean;
}) {
  const [running, setRunning] = useState(false);
  const needle = useRef<THREE.Group>(null),
    wheel = useRef<THREE.Group>(null);
  const elapsed = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const refreshShadows = useShadowRefresh();
  const s = useSurfaces();
  // Baked enamel, decades old: soft gloss rather than a fresh clear coat.
  const enamel = {
    map: s.plasticTint,
    tint: true,
    roughness: 1,
    roughnessMap: s.plasticSurface,
    bumpMap: s.plasticSurface,
    bumpScale: 0.05,
    clearcoat: 0.22,
    clearcoatRoughness: 0.4,
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const sew = () => {
    if (running || !active) return;
    elapsed.current = 0;
    setRunning(true);
    invalidate();
    timer.current = setTimeout(() => {
      setRunning(false);
      invalidate();
    }, 2400);
  };
  useFrame((_, delta) => {
    if (running && !reduced) {
      elapsed.current += Math.min(delta, 1 / 30);
      invalidate();
      refreshShadows();
    }
    const turn = running && !reduced ? elapsed.current * 21 : 0;
    if (needle.current) needle.current.position.y = Math.sin(turn) * 0.065;
    if (wheel.current) wheel.current.rotation.x = turn;
  });
  return (
    <group position={[3.68, 0.145, -0.65]} rotation={[0, -0.16, 0]}>
      {/* A cast C-shaped body leaves the needle and fabric visible through the throat. */}
      <Box
        pos={[0, 0.075, 0]}
        size={[2.35, 0.15, 1.18]}
        color={p.paper}
        radius={0.07}
        {...enamel}
      />
      <Box
        pos={[0.67, 0.68, -0.13]}
        size={[0.58, 1.16, 0.72]}
        color={p.ivory}
        radius={0.12}
        {...enamel}
      />
      <Box
        pos={[0.03, 1.22, -0.13]}
        size={[1.9, 0.51, 0.69]}
        color={p.paper}
        radius={0.12}
        {...enamel}
      />
      <Box
        pos={[-0.77, 0.97, -0.12]}
        size={[0.45, 0.76, 0.66]}
        color={p.paper}
        radius={0.08}
        {...enamel}
      />
      <Box
        pos={[-0.77, 0.91, 0.222]}
        size={[0.38, 0.56, 0.03]}
        color={p.ivory}
        radius={0.04}
      />
      <Box
        pos={[0.68, 0.73, 0.245]}
        size={[0.36, 0.65, 0.055]}
        color={p.blue}
        radius={0.035}
      />
      <Box
        pos={[-0.65, 0.16, 0.04]}
        size={[0.65, 0.024, 0.58]}
        color={p.metal}
        metalness={0.8}
        roughness={0.25}
        radius={0.025}
      />
      <Box
        pos={[-0.51, 0.183, 0.36]}
        size={[0.86, 0.014, 0.83]}
        color={p.blue}
        bumpMap={woven}
        bumpScale={0.002}
        radius={0.005}
        roughness={1}
      />
      <Cable
        p={p}
        color={p.paper}
        radius={0.003}
        points={[
          [-0.75, 0.196, 0.05],
          [-0.75, 0.196, 0.25],
          [-0.745, 0.196, 0.64],
          [-0.74, 0.196, 0.77],
        ]}
      />
      <group ref={needle}>
        <mesh position={[-0.76, 0.45, 0.11]}>
          <cylinderGeometry args={[0.018, 0.008, 0.55, 12]} />
          <meshStandardMaterial
            color={p.metal}
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        <Box
          pos={[-0.76, 0.32, 0.11]}
          size={[0.085, 0.09, 0.085]}
          color={p.metal}
          metalness={0.85}
          radius={0.008}
        />
      </group>
      <mesh position={[-0.62, 0.47, 0.04]}>
        <cylinderGeometry args={[0.018, 0.018, 0.5, 12]} />
        <meshStandardMaterial
          color={p.metal}
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>
      <Box
        pos={[-0.66, 0.21, 0.12]}
        size={[0.14, 0.025, 0.25]}
        color={p.metal}
        metalness={0.9}
        roughness={0.2}
        radius={0.009}
      />
      <group ref={wheel} position={[1.02, 1.05, -0.14]}>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.31, 0.31, 0.19, 40]} />
          <meshPhysicalMaterial
            color={p.blue}
            roughness={0.3}
            clearcoat={0.5}
          />
        </mesh>
        <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.21, 0.21, 0.035, 32]} />
          <meshStandardMaterial color={p.ivory} roughness={0.4} />
        </mesh>
        <Box
          pos={[0.134, 0.11, 0]}
          size={[0.02, 0.075, 0.026]}
          color={p.ink}
          radius={0.005}
        />
      </group>
      <group position={[0.52, 1.58, -0.16]}>
        <mesh>
          <cylinderGeometry args={[0.016, 0.016, 0.49, 10]} />
          <meshStandardMaterial color={p.metal} metalness={0.7} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.115, 0.115, 0.25, 32]} />
          <meshStandardMaterial color={p.accent} roughness={0.95} />
        </mesh>
        {[-0.14, 0.14].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <cylinderGeometry args={[0.145, 0.145, 0.035, 32]} />
            <meshStandardMaterial color={p.ivory} />
          </mesh>
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Ring
            key={i}
            pos={[0, -0.115 + i * 0.021, 0]}
            radius={0.116}
            tube={0.003}
            color={p.accentLight}
          />
        ))}
      </group>
      <Cable
        p={p}
        color={p.accentLight}
        radius={0.003}
        points={[
          [0.51, 1.69, -0.05],
          [0.05, 1.5, 0.04],
          [-0.75, 1.49, 0.15],
          [-0.95, 1.03, 0.24],
          [-0.76, 0.75, 0.26],
          [-0.76, 0.27, 0.13],
        ]}
      />
      <mesh position={[-0.92, 0.92, 0.275]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.11, 24]} />
        <meshStandardMaterial
          color={p.metal}
          metalness={0.75}
          roughness={0.3}
        />
      </mesh>
      {[0.55, 0.85].map((y) => (
        <mesh key={y} position={[0.67, y, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.065, 24]} />
          <meshStandardMaterial color={p.ivory} roughness={0.4} />
        </mesh>
      ))}
      <Label
        text={DESK.details.sewing}
        p={p}
        pos={[-0.05, 1.24, 0.223]}
        width={1.15}
        printOnly
      />
      <Label
        text={DESK.details.sewingNote}
        p={p}
        pos={[0.05, 0.055, 0.596]}
        width={1.5}
        printOnly
      />
      {[-0.88, 0.84].map((x) => (
        <Screw key={x} p={p} pos={[x, 1.37, 0.22]} scale={0.6} />
      ))}
      <Cable
        p={p}
        radius={0.018}
        points={[
          [0.8, 0.18, -0.4],
          [1.1, 0.04, -0.7],
          [1.35, -0.1, -0.8],
          [1.35, -2.7, -0.7],
          [0.4, -2.9, 1.4],
        ]}
      />
      <group position={[0.4, -2.9, 1.4]} rotation={[0.12, 0, 0]}>
        <Box
          pos={[0, 0, 0]}
          size={[0.55, 0.13, 0.85]}
          color={p.ink}
          radius={0.05}
        />
        {Array.from({ length: 6 }, (_, i) => (
          <Box
            key={i}
            pos={[0, 0.07, -0.25 + i * 0.09]}
            size={[0.4, 0.012, 0.025]}
            color={p.shadow}
            radius={0.003}
          />
        ))}
      </group>
      {active && (
        <Html position={[0.05, 1.95, 0.25]} center zIndexRange={[5, 0]}>
          <button
            className="desk-hotspot sewing-control"
            onClick={sew}
            aria-pressed={running}
            disabled={running}
          >
            <span aria-hidden="true">✳</span>
            {running ? DESK.details.sewingBusy : DESK.details.sewingAction}
          </button>
        </Html>
      )}
    </group>
  );
}
