"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeTexture, type Palette } from "./DeskMaterials";
import { mix } from "./DeskSurfaces";

function skylineTexture(p: Palette, night: boolean) {
  return makeTexture(2048, 1024, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
    if (night) {
      gradient.addColorStop(0, p.skyNight);
      gradient.addColorStop(0.6, mix(p.skyNight, p.city, 0.35));
      gradient.addColorStop(0.86, mix(p.skyNight, p.sun, 0.22));
      gradient.addColorStop(1, p.skyNight);
    } else {
      // Late golden hour: dusty lavender overhead, peach and amber low down.
      gradient.addColorStop(0, mix(p.dusk, p.sky, 0.3));
      gradient.addColorStop(0.42, p.dusk);
      gradient.addColorStop(0.7, p.horizon);
      gradient.addColorStop(0.86, mix(p.horizon, p.sun, 0.45));
      gradient.addColorStop(1, mix(p.horizon, p.paper, 0.3));
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 1024);
    // The low sun sits west, to the left of the view, like the light inside.
    const glow = ctx.createRadialGradient(780, 760, 10, 780, 760, 700);
    glow.addColorStop(0, night ? p.skyNight : p.sun);
    glow.addColorStop(1, "transparent");
    ctx.fillStyle = glow;
    ctx.globalAlpha = night ? 0.3 : 0.75;
    ctx.fillRect(0, 0, 2048, 1024);
    ctx.globalAlpha = 1;
    if (night) {
      for (let i = 0; i < 140; i++) {
        ctx.fillStyle = p.paper;
        ctx.globalAlpha = 0.15 + (i % 5) * 0.12;
        const size = i % 9 === 0 ? 2.2 : 1.3;
        ctx.fillRect((i * 179) % 2048, (i * 101) % 520, size, size);
      }
      ctx.globalAlpha = 0.25;
      const halo = ctx.createRadialGradient(1300, 230, 20, 1300, 230, 120);
      halo.addColorStop(0, p.paper);
      halo.addColorStop(1, "transparent");
      ctx.fillStyle = halo;
      ctx.fillRect(1150, 80, 300, 300);
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.paper;
      ctx.beginPath();
      ctx.arc(1300, 230, 30, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Long, thin clouds lit from beneath by the setting sun.
      for (let i = 0; i < 22; i++) {
        const x = ((i * 283) % 2400) - 150,
          y = 140 + ((i * 127) % 420),
          w = 200 + (i % 5) * 60,
          h = 8 + (i % 4) * 5;
        const cloud = ctx.createLinearGradient(0, y - h, 0, y + h);
        cloud.addColorStop(0, p.dusk);
        cloud.addColorStop(1, p.sun);
        ctx.globalAlpha = 0.1 + (i % 4) * 0.06;
        ctx.fillStyle = cloud;
        ctx.beginPath();
        ctx.ellipse(x, y, w, h, -0.03, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Three atmospheric layers: farther is paler and closer to the sky.
    for (let layer = 0; layer < 3; layer++) {
      const body = night
        ? mix(p.ink, p.skyNight, 0.5 - layer * 0.2)
        : mix(p.city, p.dusk, 0.62 - layer * 0.24);
      ctx.globalAlpha = 0.55 + layer * 0.2;
      ctx.fillStyle = body;
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
        if (!night && layer > 0) {
          // Sun-facing edges catch a warm rim.
          ctx.fillStyle = p.sun;
          ctx.globalAlpha = 0.18 + layer * 0.08;
          ctx.fillRect(x, base - h, 3, h + 260);
          ctx.globalAlpha = 0.55 + layer * 0.2;
          ctx.fillStyle = body;
        }
        if (layer === 2) {
          for (let y = base - h + 12; y < base; y += 13)
            for (let wx = x + 7; wx < x + w - 5; wx += 10) {
              const k = (i * 7 + y * 3 + wx) % 11;
              ctx.fillStyle = night
                ? k < 3
                  ? p.light
                  : mix(p.ink, p.skyNight, 0.4)
                : k < 2
                  ? p.sun
                  : mix(p.horizon, p.dusk, 0.5);
              ctx.fillRect(wx, y, 3, 5);
            }
          ctx.fillStyle = body;
        }
      }
    }
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = night ? p.ink : mix(p.city, p.dusk, 0.45);
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
    // Haze settles over the street grid.
    ctx.globalAlpha = 1;
    const haze = ctx.createLinearGradient(0, 700, 0, 1024);
    haze.addColorStop(0, "transparent");
    haze.addColorStop(1, night ? mix(p.skyNight, p.sun, 0.2) : p.horizon);
    ctx.fillStyle = haze;
    ctx.globalAlpha = night ? 0.4 : 0.55;
    ctx.fillRect(0, 700, 2048, 324);
    ctx.globalAlpha = 1;
  });
}

function facadeTexture(p: Palette, night: boolean, index: number) {
  return makeTexture(512, 768, (ctx) => {
    let seed = 13 + index * 101;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const masonry = index % 2 ? p.brick : p.limestone;
    ctx.fillStyle = masonry;
    ctx.fillRect(0, 0, 512, 768);
    // Individual bricks fired a little differently, then the mortar.
    for (let row = 0; row < 96; row++)
      for (let x = (row % 2) * 16; x < 512; x += 32) {
        ctx.globalAlpha = rand() * 0.14;
        ctx.fillStyle = rand() < 0.5 ? p.ink : p.paper;
        ctx.fillRect(x, row * 8, 32, 8);
      }
    ctx.strokeStyle = p.ink;
    ctx.globalAlpha = 0.18;
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
    const curtains = [p.posterRose, p.posterMint, p.posterSand, p.paper, p.red];
    // Lit rooms are repainted after the night darkening so they still glow.
    const glowing: (() => void)[] = [];
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 4; col++) {
        const x = 34 + col * 124,
          y = 28 + row * 92,
          k = (row * 3 + col * 7 + index) % 9,
          lit = night && k < 4;
        ctx.fillStyle = p.ink;
        ctx.fillRect(x - 4, y - 4, 80, 68);
        // Glass reflects the sky; a few panes catch the sun outright.
        const pane = ctx.createLinearGradient(x, y, x, y + 61);
        if (lit) {
          pane.addColorStop(0, k === 0 ? mix(p.sky, p.paper, 0.4) : p.light);
          pane.addColorStop(1, k === 0 ? p.sky : mix(p.light, p.sun, 0.5));
        } else if (night) {
          pane.addColorStop(0, mix(p.windowGlass, p.skyNight, 0.5));
          pane.addColorStop(1, p.windowGlass);
        } else if (k === 1 || k === 5) {
          pane.addColorStop(0, p.sun);
          pane.addColorStop(1, mix(p.sun, p.light, 0.6));
        } else {
          pane.addColorStop(0, mix(p.dusk, p.windowGlass, 0.35));
          pane.addColorStop(1, mix(p.windowGlass, p.horizon, 0.3));
        }
        const room = () => {
          ctx.fillStyle = pane;
          ctx.fillRect(x, y, 72, 61);
          // Curtains and blinds: every apartment is someone's.
          if (k % 3 !== 2) {
            ctx.globalAlpha = night ? (lit ? 0.55 : 0.25) : 0.6;
            ctx.fillStyle = curtains[(row + col * 2 + index) % curtains.length];
            const side = (row + col) % 2 ? x : x + 72 - 18 - (k % 3) * 6;
            ctx.fillRect(side, y, 18 + (k % 3) * 6, 61);
            ctx.globalAlpha = 1;
          }
          ctx.fillStyle = p.metal;
          ctx.globalAlpha = lit ? 0.5 : 1;
          ctx.fillRect(x + 34, y, 3, 61);
          ctx.fillRect(x, y + 29, 72, 3);
          ctx.globalAlpha = 1;
        };
        room();
        if (lit) glowing.push(room);
        if ((row + col + index) % 4 === 0) {
          ctx.fillStyle = night ? mix(p.paper, p.light, 0.5) : p.paper;
          ctx.fillRect(x, y, 72, 16 + (k % 3) * 9);
          ctx.fillStyle = p.shadow;
          for (let by = y + 3; by < y + 16 + (k % 3) * 9; by += 4)
            ctx.fillRect(x, by, 72, 1);
        }
        // Low sun from the left: the jamb and head shade the glass.
        if (!night) {
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = p.ink;
          ctx.fillRect(x, y, 10, 61);
          ctx.fillRect(x, y, 72, 6);
          ctx.globalAlpha = 1;
        }
        ctx.fillStyle = p.limestone;
        ctx.fillRect(x - 8, y - 9, 88, 5);
        ctx.fillRect(x - 9, y + 64, 90, 7);
        // Rain carries grime down from every sill.
        const streak = ctx.createLinearGradient(0, y + 71, 0, y + 71 + 30 + k * 4);
        streak.addColorStop(0, p.ink);
        streak.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = streak;
        ctx.fillRect(x + 6 + (k % 4) * 12, y + 71, 22 + k * 3, 30 + k * 4);
        ctx.globalAlpha = 1;
        // Window air conditioners on a few floors.
        if ((row * 5 + col * 3 + index) % 7 === 0) {
          ctx.fillStyle = mix(p.metal, p.ink, 0.15);
          ctx.fillRect(x + 14, y + 40, 44, 22);
          ctx.fillStyle = p.ink;
          ctx.globalAlpha = 0.5;
          for (let gx = x + 18; gx < x + 56; gx += 4) ctx.fillRect(gx, y + 44, 1.5, 14);
          ctx.globalAlpha = 0.3;
          ctx.fillRect(x + 14, y + 62, 44, 8);
          ctx.globalAlpha = 1;
        }
      }
    if (night) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = mix(p.skyNight, p.ink, 0.25);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(0, 0, 512, 768);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      glowing.forEach((room) => room());
      // Street light from below.
      const street = ctx.createLinearGradient(0, 560, 0, 768);
      street.addColorStop(0, "transparent");
      street.addColorStop(1, p.sun);
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = street;
      ctx.fillRect(0, 560, 512, 208);
      ctx.globalAlpha = 1;
    } else {
      // Warm raking light, and the long shadow of a neighbouring roof.
      const wash = ctx.createLinearGradient(0, 0, 512, 0);
      wash.addColorStop(0, p.sun);
      wash.addColorStop(1, "transparent");
      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.65;
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, 512, 768);
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = mix(p.dusk, p.windowGlass, 0.3);
      const edge = [260, 420, 120, 330][index % 4];
      ctx.beginPath();
      ctx.moveTo(512, 768);
      ctx.lineTo(512, edge - 140);
      ctx.lineTo(0, edge + 160);
      ctx.lineTo(0, 768);
      ctx.closePath();
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      if (index === 2) {
        // Farthest block sits in the haze.
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = p.horizon;
        ctx.fillRect(0, 0, 512, 768);
      }
    }
    // Street level falls into shade.
    const street = ctx.createLinearGradient(0, 520, 0, 768);
    street.addColorStop(0, "transparent");
    street.addColorStop(1, p.ink);
    ctx.globalAlpha = night ? 0.25 : 0.35;
    ctx.fillStyle = street;
    ctx.fillRect(0, 520, 512, 248);
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = p.paper;
    for (let i = 0; i < 9000; i++)
      ctx.fillRect((i * 137) % 512, (i * 239) % 768, 1, 2);
    ctx.globalAlpha = 1;
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
  const masonry = index % 2 ? p.brick : p.limestone;
  // The west-facing returns are in full sun by day.
  const side = night
    ? mix(mix(masonry, p.skyNight, 0.7), p.ink, 0.35)
    : mix(masonry, p.sun, 0.35);
  const stone = night
    ? mix(mix(p.limestone, p.skyNight, 0.7), p.ink, 0.3)
    : mix(p.limestone, p.sun, 0.2);
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, height / 2, -0.6]}>
        <boxGeometry args={[width, height, 1.2]} />
        <meshBasicMaterial color={side} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, height / 2, 0.008]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={facade} fog={false} toneMapped={false} />
      </mesh>
      {[height - 0.12, height + 0.03].map((cornice) => (
        <mesh key={cornice} position={[0, cornice, -0.5]}>
          <boxGeometry args={[width + 0.18, 0.08, 1.45]} />
          <meshBasicMaterial color={stone} fog={false} toneMapped={false} />
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
        <meshBasicMaterial
          color={night ? mix(mix(p.limestone, p.skyNight, 0.7), p.ink, 0.3) : mix(p.limestone, p.sun, 0.25)}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[2.5, -3.15, -2.5]}>
        <boxGeometry args={[11, 0.38, 0.1]} />
        <meshBasicMaterial
          color={night ? mix(mix(p.brick, p.skyNight, 0.7), p.ink, 0.35) : p.brick}
          fog={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}
