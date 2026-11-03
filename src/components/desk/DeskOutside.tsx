"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeTexture, type Palette } from "./DeskMaterials";

function skylineTexture(p: Palette, night: boolean) {
  return makeTexture(2048, 1024, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    gradient.addColorStop(0, night ? p.skyNight : p.sky);
    gradient.addColorStop(0.52, night ? p.city : p.horizon);
    gradient.addColorStop(1, night ? p.skyNight : p.paper);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    // Soft light scattered along the horizon; no external environment asset.
    const glow = ctx.createRadialGradient(1320, 480, 10, 1320, 480, 550);
    glow.addColorStop(0, night ? p.skyNight : p.light);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.globalAlpha = 1;
    if (night) {
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = p.paper;
        ctx.globalAlpha = 0.2 + (i % 5) * 0.12;
        ctx.fillRect((i * 179) % 2048, (i * 101) % 470, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.paper;
      ctx.beginPath();
      ctx.arc(1300, 230, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (let i = 0; i < 24; i++) {
        const x = ((i * 283) % 2400) - 150,
          y = 100 + ((i * 127) % 320);
        ctx.globalAlpha = 0.025 + (i % 4) * 0.014;
        ctx.fillStyle = p.paper;
        ctx.beginPath();
        ctx.ellipse(
          x,
          y,
          180 + (i % 5) * 30,
          10 + (i % 4) * 4,
          -0.04,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    // Three atmospheric layers have a different rhythm, height, and contrast.
    for (let layer = 0; layer < 3; layer++) {
      ctx.globalAlpha = 0.2 + layer * 0.18;
      ctx.fillStyle = night ? p.ink : p.city;
      for (let i = 0; i < 37; i++) {
        const x = i * 62 - 70 + (layer % 2) * 29,
          w = 32 + ((i * 13) % 37),
          h = 70 + ((i * 53 + layer * 17) % 190),
          base = 820 + layer * 75;
        ctx.fillRect(x, base - h, w, h + 260);
        if (i % 3 === 0) {
          ctx.fillRect(x + 5, base - h - 14, w - 10, 14);
          ctx.fillRect(x + w / 2 - 1, base - h - 37, 2, 23);
        }
        if (layer === 2) {
          for (let y = base - h + 12; y < base; y += 13)
            for (let wx = x + 7; wx < x + w - 5; wx += 10) {
              ctx.fillStyle =
                night && (i + y + wx) % 7 < 2 ? p.light : p.horizon;
              ctx.fillRect(wx, y, 3, 5);
            }
          ctx.fillStyle = night ? p.ink : p.city;
        }
      }
    }
    ctx.globalAlpha = 0.65;
    ctx.fillStyle = night ? p.ink : p.city;
    // A stepped, unmistakably New York silhouette among the distant roofs.
    const x = 1070,
      base = 910;
    [
      [-42, 170, 84, 470],
      [-29, 140, 58, 30],
      [-18, 104, 36, 36],
      [-8, 70, 16, 34],
      [-2, 12, 4, 58],
    ].forEach(([dx, y, w, h]) => ctx.fillRect(x + dx, y + 230, w, h));
    ctx.fillRect(x - 42, 640, 84, base - 640);
    ctx.globalAlpha = 1;
  });
}

function facadeTexture(p: Palette, night: boolean, index: number) {
  return makeTexture(512, 768, (ctx) => {
    ctx.fillStyle = index % 2 ? p.brick : p.limestone;
    ctx.fillRect(0, 0, 512, 768);
    // Mortar courses, alternating brick joints, deep reveals and pale lintels.
    ctx.strokeStyle = p.ink;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1;
    for (let row = 0; row < 96; row++) {
      const y = row * 8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      for (let x = (row % 2) * 16; x < 512; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const x = 34 + col * 124,
          y = 28 + row * 92,
          lit = night && (row * 3 + col * 7 + index) % 5 < 2;
        ctx.fillStyle = p.ink;
        ctx.fillRect(x - 4, y - 4, 80, 68);
        ctx.fillStyle = lit ? p.light : p.windowGlass;
        ctx.fillRect(x, y, 72, 61);
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = lit ? p.posterSand : p.sky;
        ctx.fillRect(x + 4, y + 4, 27, 48);
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.metal;
        ctx.fillRect(x + 34, y, 3, 61);
        ctx.fillRect(x, y + 29, 72, 3);
        ctx.fillStyle = p.limestone;
        ctx.fillRect(x - 8, y - 9, 88, 5);
        ctx.fillRect(x - 9, y + 64, 90, 7);
        if ((row + col + index) % 4 === 0) {
          ctx.fillStyle = p.paper;
          ctx.fillRect(x, y, 72, 16);
          ctx.fillStyle = p.shadow;
          for (let by = y + 3; by < y + 16; by += 4) ctx.fillRect(x, by, 72, 1);
        }
      }
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = p.paper;
    for (let i = 0; i < 9000; i++)
      ctx.fillRect((i * 137) % 512, (i * 239) % 768, 1, 2);
  });
}

function FireEscape({ p }: { p: Palette }) {
  const geometry = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    const beam = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      angle = 0,
    ) => {
      const g = new THREE.BoxGeometry(w, h, d);
      g.rotateZ(angle);
      g.translate(x, y, z);
      parts.push(g);
    };
    for (let floor = 0; floor < 4; floor++) {
      const y = 0.55 + floor * 0.58;
      beam(0, y, 0.13, 0.95, 0.035, 0.35);
      beam(0, y + 0.24, 0.3, 0.95, 0.018, 0.018);
      for (let i = 0; i < 8; i++)
        beam(-0.44 + i * 0.125, y + 0.12, 0.3, 0.012, 0.24, 0.012);
      beam(-0.47, y + 0.12, 0.13, 0.018, 0.24, 0.35);
      beam(0.47, y + 0.12, 0.13, 0.018, 0.24, 0.35);
      if (floor < 3) {
        for (const side of [-1, 1])
          beam(side * 0.13, y + 0.32, 0.36, 0.018, 0.73, 0.025, -0.45);
        for (let i = 0; i < 6; i++)
          beam(
            0.15 - i * 0.055,
            y + 0.07 + i * 0.105,
            0.36,
            0.28,
            0.018,
            0.025,
          );
      }
    }
    const merged = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    return merged;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color={p.ink} fog={false} />
    </mesh>
  );
}

function Building({
  p,
  night,
  index,
  x,
  y,
  z,
  height,
  width,
}: {
  p: Palette;
  night: boolean;
  index: number;
  x: number;
  y: number;
  z: number;
  height: number;
  width: number;
}) {
  const facade = useMemo(
    () => facadeTexture(p, night, index),
    [p, night, index],
  );
  useEffect(() => () => facade.dispose(), [facade]);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2, -0.6]}>
        <boxGeometry args={[width, height, 1.2]} />
        <meshBasicMaterial
          color={index % 2 ? p.brick : p.limestone}
          fog={false}
        />
      </mesh>
      <mesh position={[0, height / 2, 0.008]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={facade} fog={false} toneMapped={false} />
      </mesh>
      {[height - 0.12, height + 0.03].map((cornice) => (
        <mesh key={cornice} position={[0, cornice, -0.5]}>
          <boxGeometry args={[width + 0.18, 0.08, 1.45]} />
          <meshBasicMaterial color={p.limestone} fog={false} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.11, -0.58]}>
        <boxGeometry args={[width - 0.12, 0.08, 1.12]} />
        <meshBasicMaterial color={p.ink} fog={false} />
      </mesh>
      {index % 2 === 1 ? (
        <group position={[width * 0.18, height + 0.5, -0.55]}>
          <mesh>
            <cylinderGeometry args={[0.27, 0.27, 0.55, 16]} />
            <meshBasicMaterial color={p.woodDark} fog={false} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <coneGeometry args={[0.33, 0.18, 16]} />
            <meshBasicMaterial color={p.ink} fog={false} />
          </mesh>
          {[-0.2, 0.2].map((dx) => (
            <mesh key={dx} position={[dx, -0.4, 0]}>
              <boxGeometry args={[0.035, 0.4, 0.035]} />
              <meshBasicMaterial color={p.ink} fog={false} />
            </mesh>
          ))}
          {[-0.19, 0, 0.19].map((dy) => (
            <mesh key={dy} position={[0, dy, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.275, 0.008, 5, 24]} />
              <meshBasicMaterial color={p.metal} fog={false} />
            </mesh>
          ))}
        </group>
      ) : (
        <group position={[-0.3, height + 0.25, -0.5]}>
          <mesh>
            <boxGeometry args={[0.5, 0.3, 0.4]} />
            <meshBasicMaterial color={p.metal} fog={false} />
          </mesh>
          <mesh position={[0.5, 0.11, 0]}>
            <boxGeometry args={[0.12, 0.5, 0.13]} />
            <meshBasicMaterial color={p.brick} fog={false} />
          </mesh>
        </group>
      )}
      {(index === 1 || index === 2) && (
        <group position={[-0.15, height - 2.75, 0.01]}>
          <FireEscape p={p} />
        </group>
      )}
    </group>
  );
}

export function CityView({ p, night }: { p: Palette; night: boolean }) {
  const skyline = useMemo(() => skylineTexture(p, night), [p, night]);
  useEffect(() => () => skyline.dispose(), [skyline]);
  return (
    <group>
      <mesh position={[4.1, 0.8, -14]}>
        <planeGeometry args={[31, 15.5]} />
        <meshBasicMaterial map={skyline} fog={false} toneMapped={false} />
      </mesh>
      <Building
        p={p}
        night={night}
        index={0}
        x={-1.6}
        y={-4.6}
        z={-5.5}
        height={3.4}
        width={2.4}
      />
      <Building
        p={p}
        night={night}
        index={1}
        x={1.1}
        y={-4.5}
        z={-5.8}
        height={3.25}
        width={2.5}
      />
      <Building
        p={p}
        night={night}
        index={2}
        x={4.2}
        y={-4.6}
        z={-7.4}
        height={3.85}
        width={2.8}
      />
      <Building
        p={p}
        night={night}
        index={3}
        x={7.5}
        y={-4.5}
        z={-6}
        height={3.1}
        width={2.6}
      />
      {/* A nearby sill-facing roof gives the skyline a foreground and depth. */}
      <mesh position={[2.5, -2.9, -2.8]}>
        <boxGeometry args={[11, 0.13, 1.2]} />
        <meshBasicMaterial color={p.limestone} fog={false} />
      </mesh>
      <mesh position={[2.5, -3.15, -2.5]}>
        <boxGeometry args={[11, 0.38, 0.1]} />
        <meshBasicMaterial color={p.brick} fog={false} />
      </mesh>
    </group>
  );
}
