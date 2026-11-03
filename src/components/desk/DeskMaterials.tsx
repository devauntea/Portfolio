"use client";

import { useEffect, useMemo } from "react";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import * as THREE from "three";

export type Palette = Record<
  | "paper"
  | "ivory"
  | "shadow"
  | "ink"
  | "muted"
  | "accent"
  | "accentLight"
  | "clay"
  | "wood"
  | "woodDark"
  | "metal"
  | "screen"
  | "light"
  | "foliage"
  | "foliageLight"
  | "blue"
  | "red"
  | "sky"
  | "skyNight"
  | "horizon"
  | "city"
  | "brick"
  | "limestone"
  | "windowGlass"
  | "posterRose"
  | "posterMint"
  | "posterSand",
  string
>;
export function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function labelTexture(
  text: string,
  p: Palette,
  background = p.ivory,
  color = p.ink,
  printOnly = false,
) {
  return makeTexture(512, 96, (ctx) => {
    if (!printOnly) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 512, 96);
    }
    ctx.fillStyle = color;
    ctx.font = "28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 58);
  });
}

export function Box({
  pos,
  size,
  color,
  radius = 0.035,
  map,
  roughness = 0.65,
  metalness = 0,
  bumpMap,
  bumpScale = 0.012,
  clearcoat = 0,
  children,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
  map?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  bumpMap?: THREE.Texture;
  bumpScale?: number;
  clearcoat?: number;
  children?: React.ReactNode;
}) {
  const [width, height, depth] = size;
  const geometry = useMemo(
    () =>
      new RoundedBoxGeometry(
        width,
        height,
        depth,
        radius >= 0.1 ? 3 : radius >= 0.025 ? 2 : 1,
        Math.min(radius, width * 0.45, height * 0.45, depth * 0.45),
      ),
    [width, height, depth, radius],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh
      position={pos}
      geometry={geometry}
      castShadow={Math.min(...size) > 0.03}
      receiveShadow
    >
      <meshPhysicalMaterial
        color={map ? undefined : color}
        map={map}
        roughness={roughness}
        metalness={metalness}
        bumpMap={bumpMap}
        bumpScale={bumpScale}
        clearcoat={clearcoat}
        clearcoatRoughness={0.35}
      />
      {children}
    </mesh>
  );
}

export function Label({
  text,
  p,
  pos,
  width = 0.8,
  rotation = [0, 0, 0],
  background,
  color = p.ink,
  printOnly = false,
}: {
  text: string;
  p: Palette;
  pos: [number, number, number];
  width?: number;
  rotation?: [number, number, number];
  background?: string;
  color?: string;
  printOnly?: boolean;
}) {
  const tex = useMemo(
    () => labelTexture(text, p, background, color, printOnly),
    [text, p, background, color, printOnly],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation={rotation}>
      <planeGeometry args={[width, width * 0.1875]} />
      <meshStandardMaterial
        map={tex}
        roughness={0.85}
        transparent={printOnly}
        alphaTest={printOnly ? 0.05 : 0}
      />
    </mesh>
  );
}

export function Cable({
  points,
  p,
  radius = 0.025,
  color = p.ink,
}: {
  points: [number, number, number][];
  p: Palette;
  radius?: number;
  color?: string;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 40, radius, 8, false]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

/** Shared, deterministic microstructure. No image downloads or animation loop. */
export function surfaceTexture(
  kind: "grain" | "woven" | "ceramic" | "plaster",
) {
  const size = kind === "grain" ? 1024 : 256;
  const texture = makeTexture(size, size, (ctx) => {
    const data = ctx.createImageData(size, size);
    let seed = 71;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        seed = (seed * 16807) % 2147483647;
        const noise = seed / 2147483647;
        let value = 128;
        if (kind === "woven") {
          value +=
            Math.sin((x * Math.PI) / 3) * 35 +
            Math.sin((y * Math.PI) / 3) * 35 +
            noise * 18;
        } else if (kind === "grain") {
          const warp = Math.sin(x / 130 + y / 150) * 9 + Math.sin(x / 300) * 18;
          value +=
            Math.sin((y + warp) * 0.7) * 30 +
            Math.sin((y + warp) * 3) * 10 +
            noise * 12;
        } else {
          value += (noise - 0.5) * (kind === "ceramic" ? 100 : 65);
        }
        const i = (y * size + x) * 4;
        data.data[i] = data.data[i + 1] = data.data[i + 2] = value;
        data.data[i + 3] = 255;
      }
    }
    ctx.putImageData(data, 0, 0);
  });
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (kind === "woven") texture.repeat.set(5, 3);
  if (kind === "plaster") texture.repeat.set(8, 6);
  return texture;
}

export function Screw({
  p,
  pos,
  scale = 1,
}: {
  p: Palette;
  pos: [number, number, number];
  scale?: number;
}) {
  return (
    <group position={pos} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.024, 0.024, 0.008, 12]} />
        <meshStandardMaterial
          color={p.metal}
          metalness={0.8}
          roughness={0.35}
        />
      </mesh>
      <mesh position={[0, 0, 0.005]} rotation={[0, 0, 0.3]}>
        <planeGeometry args={[0.03, 0.004]} />
        <meshStandardMaterial color={p.ink} />
      </mesh>
    </group>
  );
}

export function Ring({
  pos,
  radius,
  tube = 0.012,
  color,
  rotation = [Math.PI / 2, 0, 0],
  metalness = 0,
}: {
  pos: [number, number, number];
  radius: number;
  tube?: number;
  color: string;
  rotation?: [number, number, number];
  metalness?: number;
}) {
  return (
    <mesh position={pos} rotation={rotation} castShadow={tube > 0.02}>
      <torusGeometry args={[radius, tube, 8, 48]} />
      <meshStandardMaterial
        color={color}
        roughness={0.38}
        metalness={metalness}
      />
    </mesh>
  );
}

/** Repeated recessed details share a single geometry and draw call. */
export function Slots({
  positions,
  size,
  color,
}: {
  positions: [number, number, number][];
  size: [number, number, number];
  color: string;
}) {
  const geometry = useMemo(() => {
    const parts = positions.map((pos) =>
      new THREE.BoxGeometry(...size).translate(...pos),
    );
    const merged = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return merged;
  }, [positions, size]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
}
