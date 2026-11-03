"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box,
  Cable,
  Label,
  Ring,
  Screw,
  makeTexture,
  type Palette,
} from "./DeskMaterials";
import { DESK } from "@/data/profile";

function MangaVolume({ p, index }: { p: Palette; index: number }) {
  const book = DESK.details.manga[index];
  const cover = [p.ink, p.ink, p.paper, p.paper, p.red][index];
  const print = index < 2 ? p.red : p.ink;
  const textures = useMemo(() => {
    const spine = makeTexture(1024, 160, (ctx) => {
      ctx.fillStyle = cover;
      ctx.fillRect(0, 0, 1024, 160);
      ctx.fillStyle = print;
      ctx.fillRect(30, 20, 5, 120);
      ctx.font = "bold 64px Georgia";
      ctx.fillText(book.title, 62, 102);
      ctx.fillStyle = index < 2 ? p.paper : p.accent;
      ctx.font = "bold 68px monospace";
      ctx.fillText(book.volume, 875, 104);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = p.shadow;
      ctx.fillRect(0, 5, 1024, 2);
      ctx.fillRect(0, 151, 1024, 2);
    });
    const pages = makeTexture(256, 128, (ctx) => {
      ctx.fillStyle = p.paper;
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = p.shadow;
      ctx.globalAlpha = 0.5;
      for (let y = 1; y < 128; y += 3) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(256, y + 0.5);
        ctx.stroke();
      }
    });
    const top = makeTexture(512, 640, (ctx) => {
      ctx.fillStyle = cover;
      ctx.fillRect(0, 0, 512, 640);
      ctx.fillStyle = p.paper;
      ctx.font = "bold 43px Georgia";
      ctx.fillText(book.title, 28, 72, 456);
      ctx.font = "20px monospace";
      ctx.fillText(book.volume, 440, 111);
      // Original abstract cover artwork, rather than reproduced manga art.
      ctx.save();
      ctx.translate(255, 350);
      ctx.rotate(-0.28);
      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = i % 2 ? p.ink : p.paper;
        ctx.globalAlpha = 0.7;
        ctx.fillRect(-160 + i * 19, -175 + (i % 3) * 12, 8, 300);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.paper;
      ctx.font = "15px monospace";
      ctx.fillText(DESK.details.bookNote, 28, 610);
    });
    return { spine, pages, top };
  }, [p, book, cover, print, index]);
  useEffect(
    () => () => Object.values(textures).forEach((t) => t.dispose()),
    [textures],
  );
  const w = index < 2 ? 1.7 : 1.55,
    d = index < 2 ? 1.95 : 1.85;
  return (
    <group
      position={[((index % 3) - 1) * 0.035, 0.12 + index * 0.225, 0]}
      rotation={[0, [0, 0.045, -0.055, 0.02, -0.08][index], 0]}
    >
      <Box
        pos={[0, 0, 0]}
        size={[w - 0.04, 0.19, d - 0.06]}
        color={p.paper}
        map={textures.pages}
        radius={0.008}
      />
      {[-0.106, 0.106].map((y) => (
        <Box
          key={y}
          pos={[0, y, 0]}
          size={[w, 0.022, d]}
          color={cover}
          radius={0.006}
        />
      ))}
      <Box
        pos={[0, 0, d / 2 - 0.008]}
        size={[w, 0.22, 0.035]}
        color={cover}
        radius={0.008}
      />
      <mesh position={[0, 0, d / 2 + 0.011]}>
        <planeGeometry args={[w - 0.025, 0.215]} />
        <meshStandardMaterial map={textures.spine} roughness={0.8} />
      </mesh>
      {index === DESK.details.manga.length - 1 && (
        <mesh position={[0, 0.118, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w - 0.02, d - 0.02]} />
          <meshStandardMaterial map={textures.top} roughness={0.75} />
        </mesh>
      )}
    </group>
  );
}

export function MangaStack({ p }: { p: Palette }) {
  return (
    <group position={[-4.65, 0.14, 1.05]} scale={0.88} rotation={[0, 0.12, 0]}>
      {DESK.details.manga.map((_, i) => (
        <MangaVolume p={p} index={i} key={i} />
      ))}
      <Box
        pos={[0.45, 0.225 * 5 - 0.045, 1.06]}
        size={[0.14, 0.01, 0.38]}
        color={p.accentLight}
        radius={0.002}
      />
    </group>
  );
}

type Brick = {
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h?: number;
  color: keyof Palette;
};

export function BrickDisplay({ p }: { p: Palette }) {
  const parts = useMemo(() => {
    const bricks: Brick[] = [
      { x: 0, y: 0.035, z: 0, w: 8, d: 6, h: 0.07, color: "ink" },
      ...[-0.22, 0.22].map((x) => ({
        x,
        y: 0.15,
        z: 0.15,
        w: 2,
        d: 3,
        h: 0.15,
        color: "red" as const,
      })),
      ...[-0.22, 0.22].map((x) => ({
        x,
        y: 0.36,
        z: 0.07,
        w: 2,
        d: 2,
        h: 0.24,
        color: "paper" as const,
      })),
      { x: 0, y: 0.65, z: 0.02, w: 5, d: 3, h: 0.3, color: "blue" },
      { x: 0, y: 0.89, z: 0.02, w: 4, d: 3, h: 0.16, color: "paper" },
      { x: 0, y: 1.13, z: 0.02, w: 4, d: 3, h: 0.28, color: "paper" },
      { x: 0, y: 1.32, z: 0.02, w: 4, d: 3, h: 0.08, color: "red" },
      ...[-0.54, 0.54].map((x) => ({
        x,
        y: 0.68,
        z: 0.04,
        w: 1,
        d: 2,
        h: 0.28,
        color: "red" as const,
      })),
      ...[-0.54, 0.54].map((x) => ({
        x,
        y: 0.44,
        z: 0.12,
        w: 1,
        d: 2,
        h: 0.15,
        color: "paper" as const,
      })),
      { x: 0.77, y: 0.14, z: 0.28, w: 2, d: 2, h: 0.15, color: "accent" },
      { x: -0.73, y: 0.1, z: 0.38, w: 2, d: 1, h: 0.09, color: "blue" },
    ];
    const byColor = new Map<keyof Palette, THREE.BufferGeometry[]>();
    for (const b of bricks) {
      const geos = byColor.get(b.color) ?? [];
      byColor.set(b.color, geos);
      const body = new RoundedBoxGeometry(
        b.w * 0.17 - 0.009,
        b.h ?? 0.15,
        b.d * 0.17 - 0.009,
        1,
        0.012,
      );
      body.translate(b.x, b.y, b.z);
      geos.push(body);
      for (let x = 0; x < b.w; x++)
        for (let z = 0; z < b.d; z++) {
          const stud = new THREE.CylinderGeometry(
            0.052,
            0.054,
            0.045,
            12,
          ).toNonIndexed();
          stud.translate(
            b.x + (x - (b.w - 1) / 2) * 0.17,
            b.y + (b.h ?? 0.15) / 2 + 0.022,
            b.z + (z - (b.d - 1) / 2) * 0.17,
          );
          geos.push(stud);
        }
    }
    return Array.from(byColor, ([color, geos]) => {
      const geometry = mergeGeometries(geos);
      geos.forEach((g) => g.dispose());
      return { color, geometry };
    });
  }, []);
  useEffect(
    () => () => parts.forEach(({ geometry }) => geometry.dispose()),
    [parts],
  );
  return (
    <group position={[-3.85, 0.14, -0.65]} rotation={[0, 0.16, 0]}>
      {parts.map(({ color, geometry }) => (
        <mesh key={color} geometry={geometry} castShadow receiveShadow>
          <meshPhysicalMaterial
            color={p[color]}
            roughness={0.3}
            clearcoat={0.6}
          />
        </mesh>
      ))}
      <Box
        pos={[0, 1.16, 0.285]}
        size={[0.55, 0.12, 0.025]}
        color={p.ink}
        radius={0.009}
      />
      {[-0.16, 0.16].map((x) => (
        <Box
          key={x}
          pos={[x, 1.16, 0.304]}
          size={[0.08, 0.065, 0.02]}
          color={p.light}
          radius={0.005}
        />
      ))}
      <Box
        pos={[0, 0.69, 0.285]}
        size={[0.25, 0.17, 0.025]}
        color={p.accentLight}
        radius={0.007}
      />
      <Label
        text={DESK.details.bricks}
        p={p}
        pos={[0, 0.027, 0.519]}
        width={1.25}
        background={p.ivory}
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
        roughness={0.3}
        clearcoat={0.4}
      />
      <Box
        pos={[0.67, 0.68, -0.13]}
        size={[0.58, 1.16, 0.72]}
        color={p.ivory}
        radius={0.12}
        clearcoat={0.45}
      />
      <Box
        pos={[0.03, 1.22, -0.13]}
        size={[1.9, 0.51, 0.69]}
        color={p.paper}
        radius={0.12}
        clearcoat={0.45}
      />
      <Box
        pos={[-0.77, 0.97, -0.12]}
        size={[0.45, 0.76, 0.66]}
        color={p.paper}
        radius={0.08}
        clearcoat={0.4}
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
