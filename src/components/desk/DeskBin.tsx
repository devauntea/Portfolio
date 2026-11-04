"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { makeTexture, useSurfaces, type Palette } from "./DeskMaterials";
import { mix } from "./DeskSurfaces";

/*
 * A ribbed wastepaper bin left of the desk, overflowing with drafts: balled
 * pages, two rolled sheets standing up, one page draped over the rim, and a
 * couple of misses on the floor. Static, so it never needs a shadow refresh.
 */

export const BIN = { x: -7.8, z: 0.05, floor: -3.02 };
const H = 1.22,
  BOTTOM = 0.4,
  TOP = 0.52,
  WALL = 0.022;
const radiusAt = (y: number) => BOTTOM + (TOP - BOTTOM) * (y / H);

function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Tapered body with moulded ribs and a rolled rim, one closed profile. */
function binGeometry() {
  const outer: THREE.Vector2[] = [new THREE.Vector2(0, 0), new THREE.Vector2(BOTTOM - 0.03, 0)];
  outer.push(new THREE.Vector2(BOTTOM, 0.03));
  const bands = 6;
  for (let k = 1; k <= bands; k++) {
    const top = (k / bands) * (H - 0.04);
    // Each band flares slightly, then steps in at the next rib.
    outer.push(new THREE.Vector2(radiusAt(top - 0.03) + 0.004, top - 0.03));
    if (k < bands) {
      outer.push(new THREE.Vector2(radiusAt(top) - 0.008, top - 0.008));
      outer.push(new THREE.Vector2(radiusAt(top) - 0.006, top + 0.006));
    }
  }
  const lip = [
    [TOP + 0.002, H - 0.035],
    [TOP + 0.016, H - 0.018],
    [TOP + 0.02, H],
    [TOP + 0.01, H + 0.014],
    [TOP - 0.008, H + 0.012],
    [TOP - WALL, H - 0.012],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const inner = [
    [radiusAt(H * 0.5) - WALL, H * 0.5],
    [BOTTOM - WALL, 0.05],
    [0, 0.05],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry([...outer, ...lip, ...inner], 72);
}

/** A sheet balled up: an icosphere with every vertex pushed in or out. */
function crumpled(radius: number, seed: number, tint: THREE.Color) {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const rand = rng(seed);
  const push = new Map<string, number>();
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!push.has(key)) push.set(key, 0.7 + rand() * 0.48);
    const lumpy = 1 + 0.12 * Math.sin(v.x * 3 + seed) * Math.cos(v.z * 2.6 - seed);
    v.multiplyScalar(push.get(key)! * lumpy * radius);
    v.y *= 0.86;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.rotateY(rand() * Math.PI * 2);
  g.rotateX((rand() - 0.5) * 0.8);
  g.computeVertexNormals(); // non-indexed: one normal per facet, like folds
  return withColor(g, tint);
}

function withColor(g: THREE.BufferGeometry, color: THREE.Color) {
  const colors = new Float32Array(g.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  return g;
}

/** A rolled sheet: a thin spiral cross-section extruded along its length. */
function rolled(length: number, turns: number, tint: THREE.Color) {
  const r0 = 0.022,
    r1 = 0.07,
    thick = 0.006,
    steps = Math.round(turns * 40);
  const out: THREE.Vector2[] = [],
    back: THREE.Vector2[] = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps,
      a = t * turns * Math.PI * 2,
      r = r0 + (r1 - r0) * t;
    out.push(new THREE.Vector2(Math.cos(a) * (r + thick / 2), Math.sin(a) * (r + thick / 2)));
    back.push(new THREE.Vector2(Math.cos(a) * (r - thick / 2), Math.sin(a) * (r - thick / 2)));
  }
  const shape = new THREE.Shape([...out, ...back.reverse()]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  return withColor(g, tint);
}

export function TrashBin({ p }: { p: Palette }) {
  const s = useSurfaces();
  const model = useMemo(() => {
    const paper = new THREE.Color().setStyle(mix(p.paper, p.limewash, 0.5));
    const shade = paper.clone().multiplyScalar(0.9);
    const note = new THREE.Color().setStyle(mix(p.posterSand, p.light, 0.35));
    const parts: THREE.BufferGeometry[] = [];
    // A packed bed of paper just below the rim, so gaps never show the floor.
    parts.push(
      withColor(new THREE.CylinderGeometry(TOP - 0.03, TOP - 0.05, 0.05, 32).toNonIndexed().translate(0, H - 0.1, 0), shade),
    );
    const balls: [number, number, number, number][] = [
      [0.0, H + 0.04, 0.02, 0.21],
      [0.3, H - 0.02, -0.07, 0.17],
      [-0.25, H + 0.0, 0.2, 0.18],
      [0.22, H + 0.02, -0.24, 0.19],
      [-0.2, H - 0.03, -0.22, 0.16],
      [-0.26, H + 0.1, 0.12, 0.15],
      [-0.06, H + 0.14, -0.08, 0.16],
      [0.33, H - 0.04, -0.02, 0.14],
    ];
    balls.forEach(([x, y, z, r], i) =>
      parts.push(crumpled(r, 11 + i * 7, i === 5 ? note : i % 3 ? paper : shade).translate(x, y, z)),
    );
    // Two rolled sheets standing up toward the back right, leaning away.
    parts.push(rolled(0.9, 2.4, paper).rotateZ(-0.24).rotateX(-0.1).translate(0.16, H - 0.45, -0.12));
    parts.push(rolled(0.76, 2, shade).rotateZ(-0.1).rotateX(-0.22).translate(0.3, H - 0.42, -0.3));
    // Misses on the floor, settled rather than perched.
    parts.push(crumpled(0.17, 97, paper).translate(0.95, 0.13, 0.3));
    parts.push(crumpled(0.12, 131, shade).translate(-0.7, 0.09, -0.15));
    const merged = mergeGeometries(parts)!;
    parts.forEach((g) => g.dispose());
    return { body: binGeometry(), paper: merged };
  }, [p]);

  // A ruled page draped over the rim, following its curve.
  const drape = useMemo(() => {
    const width = 0.5,
      top = 0.15,
      bend = 0.05,
      hang = 0.46;
    const length = top + (Math.PI / 2) * bend + hang;
    const g = new THREE.PlaneGeometry(width, length, 10, 28);
    const pos = g.attributes.position;
    const theta0 = 0.55;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i),
        s = length / 2 - pos.getY(i);
      let rho: number, y: number;
      if (s < top) {
        // Resting on the pile, rising a little toward the middle.
        rho = TOP - (top - s);
        y = H + 0.07 + (top - s) * 0.45;
      } else if (s < top + (Math.PI / 2) * bend) {
        const phi = (s - top) / bend;
        rho = TOP + Math.sin(phi) * bend;
        y = H + 0.02 + Math.cos(phi) * bend;
      } else {
        const t = s - top - (Math.PI / 2) * bend;
        rho = TOP + bend - t * ((TOP - BOTTOM) / H) + Math.max(0, t - 0.3) ** 2 * 0.9;
        y = H + 0.02 - t;
      }
      const theta = theta0 + u / rho + Math.sin(s * 9) * 0.004;
      pos.setXYZ(i, Math.sin(theta) * rho, y, Math.cos(theta) * rho);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const ruled = useMemo(
    () =>
      makeTexture(256, 384, (ctx) => {
        ctx.fillStyle = mix(p.paper, p.light, 0.3);
        ctx.fillRect(0, 0, 256, 384);
        ctx.strokeStyle = p.blue;
        ctx.globalAlpha = 0.45;
        for (let y = 40; y < 384; y += 16) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(256, y);
          ctx.stroke();
        }
        ctx.strokeStyle = p.blush;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(34, 0);
        ctx.lineTo(34, 384);
        ctx.stroke();
        // Scribbled-out lines of a draft.
        ctx.strokeStyle = p.ink;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.4;
        for (let row = 0; row < 7; row++) {
          const y = 52 + row * 16;
          ctx.beginPath();
          for (let x = 44; x < 60 + ((row * 53) % 170); x += 6)
            ctx.lineTo(x, y + Math.sin(x * 0.7 + row) * 2.4);
          ctx.stroke();
        }
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, 66);
        ctx.lineTo(210, 128);
        ctx.moveTo(44, 128);
        ctx.lineTo(200, 70);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }),
    [p],
  );
  useEffect(
    () => () => {
      model.body.dispose();
      model.paper.dispose();
      drape.dispose();
      ruled.dispose();
    },
    [model, drape, ruled],
  );
  return (
    <group position={[BIN.x, BIN.floor, BIN.z]} rotation={[0, 0.3, 0]}>
      <mesh geometry={model.body} castShadow receiveShadow>
        <meshStandardMaterial
          color={mix(p.limewash, p.muted, 0.32)}
          map={s.plasticTint}
          roughness={1}
          roughnessMap={s.plasticSurface}
          bumpMap={s.plasticSurface}
          bumpScale={0.08}
          envMapIntensity={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh geometry={model.paper} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={0.92} envMapIntensity={0.5} />
      </mesh>
      <mesh geometry={drape} castShadow receiveShadow>
        <meshStandardMaterial
          map={ruled}
          roughness={0.9}
          side={THREE.DoubleSide}
          envMapIntensity={0.5}
        />
      </mesh>
      {/* A flat page that slid off and lies on the floor. */}
      <mesh
        position={[1.05, 0.006, -0.45]}
        rotation={[-Math.PI / 2, 0, 0.5]}
        receiveShadow
      >
        <planeGeometry args={[0.5, 0.66]} />
        <meshStandardMaterial map={ruled} roughness={0.9} envMapIntensity={0.5} />
      </mesh>
    </group>
  );
}
