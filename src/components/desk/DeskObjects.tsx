"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box,
  Cable,
  Label,
  Ring,
  Screw,
  Slots,
  makeTexture,
  type Palette,
} from "./DeskMaterials";
import { DESK } from "@/data/profile";

type Surfaces = {
  p: Palette;
  grain: THREE.Texture;
  woven: THREE.Texture;
  ceramic: THREE.Texture;
};

// Each legend is baked into one atlas, and all keycaps share three draw calls.
export function DetailedKeyboard({ p }: { p: Palette }) {
  const model = useMemo(() => {
    type Key = {
      label: string;
      x: number;
      z: number;
      width: number;
      accent: boolean;
    };
    const keys: Key[] = [];
    const rows = [
      [
        "esc",
        "F1",
        "F2",
        "F3",
        "F4",
        "F5",
        "F6",
        "F7",
        "F8",
        "F9",
        "F10",
        "F11",
        "F12",
        "del",
      ],
      ["~", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "−", "+", "back"],
      ["tab", "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "[", "]", "\\"],
      ["caps", "A", "S", "D", "F", "G", "H", "J", "K", "L", ";", "'", "enter"],
      ["shift", "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "shift", "↑"],
      ["ctrl", "alt", "", "alt", "fn", "←", "↓", "→"],
    ];
    rows.forEach((row, r) => {
      let x = -1.64;
      row.forEach((label) => {
        const units =
          label === ""
            ? 5.8
            : ["shift", "enter", "caps"].includes(label)
              ? 1.65
              : ["back", "tab"].includes(label)
                ? 1.35
                : 1;
        const width = 0.177 * units;
        keys.push({
          label,
          x: x + width / 2,
          z: -0.51 + r * 0.177 + (r ? 0.035 : 0),
          width: width - 0.022,
          accent: label === "esc" || label === "enter",
        });
        x += width;
      });
    });
    // Separate navigation/numeric block, like a compact vintage workstation.
    [
      ["num", "/", "*"],
      ["7", "8", "9"],
      ["4", "5", "6"],
      ["1", "2", "3"],
      ["0", ".", "+"],
    ].forEach((row, r) =>
      row.forEach((label, c) => {
        keys.push({
          label,
          x: 1.12 + c * 0.177,
          z: -0.298 + r * 0.177,
          width: 0.155,
          accent: false,
        });
      }),
    );
    const atlas = makeTexture(1024, 1024, (ctx) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      keys.forEach((key, i) => {
        ctx.fillStyle = key.accent ? p.paper : p.ink;
        ctx.font = `${key.label.length > 2 ? 22 : 34}px monospace`;
        ctx.fillText(
          key.label,
          (i % 10) * 100 + 50,
          Math.floor(i / 10) * 100 + 50,
        );
      });
    });
    const caps: THREE.BufferGeometry[][] = [[], []];
    const legends: THREE.BufferGeometry[] = [];
    keys.forEach((key, i) => {
      const cap = new RoundedBoxGeometry(1, 1, 1, 2, 0.1);
      const points = cap.attributes.position;
      for (let v = 0; v < points.count; v++) {
        const y = points.getY(v);
        const taper = 1 - (y + 0.5) * 0.15;
        points.setXYZ(
          v,
          points.getX(v) * key.width * taper,
          y * 0.09,
          points.getZ(v) * 0.15 * taper,
        );
      }
      cap.computeVertexNormals();
      cap.translate(key.x, 0.14, key.z);
      caps[key.accent ? 1 : 0].push(cap);
      const legend = new THREE.PlaneGeometry(key.width * 0.84, 0.125);
      legend.rotateX(-Math.PI / 2);
      legend.translate(key.x, 0.186, key.z);
      const uv = legend.attributes.uv;
      for (let v = 0; v < uv.count; v++)
        uv.setXY(
          v,
          ((i % 10) * 100 + uv.getX(v) * 100) / 1024,
          1 - (Math.floor(i / 10) * 100 + (1 - uv.getY(v)) * 100) / 1024,
        );
      legends.push(legend);
    });
    const merged = [
      ...caps.map((parts) => mergeGeometries(parts)!),
      mergeGeometries(legends)!,
    ];
    [...caps.flat(), ...legends].forEach((geo) => geo.dispose());
    return { atlas, merged };
  }, [p]);
  useEffect(
    () => () => {
      model.atlas.dispose();
      model.merged.forEach((geo) => geo.dispose());
    },
    [model],
  );
  return (
    <group position={[0.22, 0.235, 1.25]} rotation={[0.075, 0, 0]}>
      <Box
        pos={[0, -0.04, 0]}
        size={[3.63, 0.2, 1.4]}
        color={p.shadow}
        radius={0.07}
      />
      <Box
        pos={[0, 0, 0]}
        size={[3.62, 0.16, 1.39]}
        color={p.ivory}
        radius={0.07}
        roughness={0.53}
      />
      <Box
        pos={[0, 0.085, -0.035]}
        size={[3.4, 0.025, 1.16]}
        color={p.shadow}
        radius={0.01}
      />
      {model.merged.slice(0, 2).map((geometry, i) => (
        <mesh key={i} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={i ? p.olive : p.paper}
            roughness={0.43}
          />
        </mesh>
      ))}
      <mesh geometry={model.merged[2]}>
        <meshBasicMaterial
          map={model.atlas}
          transparent
          alphaTest={0.1}
          depthWrite={false}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[1.1 + i * 0.17, 0.09, -0.535]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.018, 12]} />
          <meshBasicMaterial color={i === 0 ? p.leaf : p.muted} />
        </mesh>
      ))}
      <Label
        text={DESK.details.keyboard}
        printOnly
        p={p}
        pos={[-1.1, 0.086, 0.605]}
        width={0.8}
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  );
}

export function DetailedTower({ p, ceramic }: Pick<Surfaces, "p" | "ceramic">) {
  const grille = useMemo(
    () =>
      makeTexture(256, 256, (ctx) => {
        ctx.fillStyle = p.ivory;
        ctx.fillRect(0, 0, 256, 256);
        for (let y = 12; y < 250; y += 16)
          for (let x = 12; x < 250; x += 16) {
            ctx.fillStyle = p.shadow;
            ctx.beginPath();
            ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = p.ink;
            ctx.beginPath();
            ctx.arc(x, y - 0.8, 2.1, 0, Math.PI * 2);
            ctx.fill();
          }
      }),
    [p],
  );
  useEffect(() => () => grille.dispose(), [grille]);
  return (
    <group position={[-2.5, 1.12, -1.55]}>
      <Box
        pos={[0, 0, 0]}
        size={[1.1, 1.96, 1.86]}
        color={p.shadow}
        radius={0.065}
        bumpMap={ceramic}
        bumpScale={0.0008}
      />
      <Box
        pos={[0, 0.015, -0.02]}
        size={[1.08, 1.93, 1.82]}
        color={p.ivory}
        radius={0.06}
        bumpMap={ceramic}
        bumpScale={0.0008}
      />
      <Box
        pos={[0, 0, 0.925]}
        size={[1.065, 1.92, 0.08]}
        color={p.ivory}
        radius={0.07}
      />
      {[0.62, 0.3, -0.02].map((y, i) => (
        <group key={y} position={[0, y, 0.974]}>
          <Box
            pos={[0, 0, 0]}
            size={[0.88, 0.27, 0.025]}
            color={p.shadow}
            radius={0.012}
          />
          <Box
            pos={[0, 0.006, 0.016]}
            size={[0.845, 0.24, 0.02]}
            color={p.ivory}
            radius={0.01}
          />
          {i < 2 && (
            <>
              <Box
                pos={[-0.02, 0.02, 0.03]}
                size={[i === 0 ? 0.67 : 0.45, 0.024, 0.012]}
                color={p.ink}
                radius={0.003}
              />
              <Box
                pos={[0.31, -0.065, 0.032]}
                size={[0.065, 0.025, 0.014]}
                color={p.shadow}
                radius={0.004}
              />
              <Box
                pos={[-0.29, -0.063, 0.031]}
                size={[0.025, 0.012, 0.012]}
                color={p.olive}
                radius={0.002}
              />
            </>
          )}
        </group>
      ))}
      <mesh position={[0, -0.65, 0.972]}>
        <planeGeometry args={[0.72, 0.43]} />
        <meshStandardMaterial map={grille} roughness={0.7} />
      </mesh>
      <mesh position={[0.28, -0.29, 0.984]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 24]} />
        <meshStandardMaterial
          color={p.olive}
          metalness={0.15}
          roughness={0.35}
        />
      </mesh>
      <Ring
        pos={[0.28, -0.29, 1.001]}
        radius={0.078}
        tube={0.006}
        rotation={[0, 0, 0]}
        color={p.metal}
        metalness={0.7}
      />
      <Label
        text={DESK.details.tower}
        printOnly
        p={p}
        pos={[-0.16, -0.28, 0.978]}
        width={0.36}
      />
      {[-0.44, 0.44].map((x) => (
        <Screw key={x} p={p} pos={[x, -0.84, 0.976]} scale={0.7} />
      ))}
      <Slots
        positions={Array.from(
          { length: 10 },
          (_, i) =>
            [0.542, -0.56 + i * 0.065, 0.15] as [number, number, number],
        )}
        size={[0.012, 0.018, 0.65]}
        color={p.shadow}
      />
      {[-0.4, 0.4].map((x) => (
        <Box
          key={x}
          pos={[x, -1, 0.45]}
          size={[0.17, 0.06, 0.9]}
          color={p.ink}
          radius={0.02}
        />
      ))}
    </group>
  );
}

export function DeskMat({ p, woven }: Pick<Surfaces, "p" | "woven">) {
  const seam = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 5.28,
      h = 2.37,
      r = 0.1;
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const points = shape.getSpacedPoints(260);
    const geo = new THREE.BufferGeometry().setFromPoints(
      points.flatMap((point, i) =>
        i % 2 === 0 && i < points.length - 1
          ? [
              new THREE.Vector3(point.x, 0, point.y),
              new THREE.Vector3(points[i + 1].x, 0, points[i + 1].y),
            ]
          : [],
      ),
    );
    return geo;
  }, []);
  useEffect(() => () => seam.dispose(), [seam]);
  return (
    <group position={[0.65, 0.145, 0.9]}>
      <Box
        pos={[0, 0, 0]}
        size={[5.45, 0.035, 2.55]}
        color={p.olive}
        bumpMap={woven}
        bumpScale={0.0012}
        roughness={0.93}
        radius={0.015}
      />
      <lineSegments geometry={seam} position={[0, 0.019, 0]}>
        <lineBasicMaterial color={p.ivory} transparent opacity={0.52} />
      </lineSegments>
      <Label
        text={DESK.details.mat}
        printOnly
        p={p}
        pos={[2.18, 0.021, 1.1]}
        width={0.65}
        rotation={[-Math.PI / 2, 0, 0]}
        background={p.olive}
      />
    </group>
  );
}

export function Pottery({
  p,
  ceramic,
  grain,
}: Pick<Surfaces, "p" | "ceramic" | "grain">) {
  const profile = useMemo(
    () =>
      [
        [0.01, 0.035],
        [0.18, 0.035],
        [0.215, 0.05],
        [0.232, 0.1],
        [0.25, 0.3],
        [0.259, 0.45],
        [0.255, 0.49],
        [0.241, 0.505],
        [0.224, 0.492],
        [0.225, 0.46],
        [0.22, 0.3],
        [0.193, 0.09],
        [0.01, 0.09],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  return (
    <group position={[-2.5, 0.145, 1.45]}>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.39, 0.39, 0.045, 64]} />
        <meshStandardMaterial
          color={p.wood}
          bumpMap={grain}
          bumpScale={0.015}
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow receiveShadow>
        <latheGeometry args={[profile, 64]} />
        <meshPhysicalMaterial
          color={p.clay}
          bumpMap={ceramic}
          bumpScale={0.001}
          roughness={0.31}
          clearcoat={0.6}
          clearcoatRoughness={0.24}
        />
      </mesh>
      <Ring pos={[0, 0.54, 0]} radius={0.242} tube={0.012} color={p.ivory} />
      {[0.11, 0.14, 0.17].map((y) => (
        <Ring
          key={y}
          pos={[0, y, 0]}
          radius={0.22 + (y - 0.1) * 0.12}
          tube={0.003}
          color={p.wood}
        />
      ))}
      <mesh position={[0, 0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.224, 48]} />
        <meshPhysicalMaterial
          color={p.woodDark}
          roughness={0.13}
          clearcoat={1}
        />
      </mesh>
      <mesh position={[-0.255, 0.32, 0]} scale={[1, 1.12, 1]} castShadow>
        <torusGeometry args={[0.16, 0.045, 12, 40]} />
        <meshPhysicalMaterial
          color={p.clay}
          bumpMap={ceramic}
          bumpScale={0.0012}
          roughness={0.3}
          clearcoat={0.5}
        />
      </mesh>
    </group>
  );
}

export function Notebook({ p }: { p: Palette }) {
  const page = useMemo(
    () =>
      makeTexture(512, 768, (ctx) => {
        ctx.fillStyle = p.paper;
        ctx.fillRect(0, 0, 512, 768);
        ctx.fillStyle = p.muted;
        ctx.globalAlpha = 0.2;
        for (let y = 25; y < 760; y += 20)
          for (let x = 25; x < 500; x += 20) {
            ctx.beginPath();
            ctx.arc(x, y, 0.9, 0, Math.PI * 2);
            ctx.fill();
          }
        ctx.globalAlpha = 1;
        ctx.fillStyle = p.ink;
        ctx.font = "italic 32px Georgia";
        ctx.fillText(DESK.notebookLabel, 55, 100);
        ctx.font = "15px monospace";
        ctx.fillStyle = p.olive;
        ctx.fillText(DESK.details.sketch, 55, 138);
        ctx.strokeStyle = p.olive;
        ctx.lineWidth = 2.2;
        [
          [75, 220, 140, 90],
          [295, 220, 140, 90],
          [170, 400, 170, 110],
        ].forEach(([x, y, w, h]) => {
          ctx.strokeRect(x, y, w, h);
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 16, y + 20 + i * 18);
            ctx.lineTo(x + w - 25 - i * 12, y + 20 + i * 18);
            ctx.stroke();
          }
        });
        ctx.beginPath();
        ctx.moveTo(215, 265);
        ctx.lineTo(295, 265);
        ctx.lineTo(285, 258);
        ctx.moveTo(365, 310);
        ctx.bezierCurveTo(380, 365, 255, 350, 255, 400);
        ctx.stroke();
        ctx.font = "italic 23px Georgia";
        ctx.fillText(DESK.details.note, 75, 620);
        ctx.strokeStyle = p.clay;
        ctx.beginPath();
        ctx.moveTo(75, 632);
        ctx.quadraticCurveTo(200, 647, 370, 632);
        ctx.stroke();
      }),
    [p],
  );
  useEffect(() => () => page.dispose(), [page]);
  return (
    <group position={[3.5, 0.18, -0.1]} rotation={[0, -0.17, 0]}>
      <Box
        pos={[0, 0.02, 0]}
        size={[1.48, 0.055, 1.94]}
        color={p.clay}
        radius={0.02}
      />
      <Box
        pos={[0, 0.09, -0.025]}
        size={[1.38, 0.12, 1.82]}
        color={p.ivory}
        radius={0.009}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <Box
          key={i}
          pos={[0, 0.055 + i * 0.019, 0.888]}
          size={[1.34, 0.003, 0.005]}
          color={p.shadow}
          radius={0.001}
        />
      ))}
      <mesh
        position={[0, 0.155, -0.025]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[1.38, 1.82]} />
        <meshStandardMaterial map={page} roughness={0.95} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh
          key={i}
          position={[-0.69, 0.16, -0.81 + i * 0.155]}
          rotation={[0, Math.PI / 2, 0]}
          castShadow
        >
          <torusGeometry args={[0.063, 0.009, 6, 16]} />
          <meshStandardMaterial
            color={p.metal}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
      ))}
      <group position={[0.6, 0.195, -0.1]} rotation={[Math.PI / 2, 0, 0.16]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.025, 0.025, 1.19, 6]} />
          <meshStandardMaterial color={p.olive} roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.68, 0]}>
          <coneGeometry args={[0.025, 0.17, 6]} />
          <meshStandardMaterial color={p.ivory} />
        </mesh>
        <mesh position={[0, -0.76, 0]}>
          <coneGeometry args={[0.009, 0.055, 6]} />
          <meshStandardMaterial color={p.ink} />
        </mesh>
        <mesh position={[0, 0.63, 0]}>
          <cylinderGeometry args={[0.027, 0.027, 0.1, 16]} />
          <meshStandardMaterial
            color={p.metal}
            metalness={0.8}
            roughness={0.3}
          />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <capsuleGeometry args={[0.026, 0.04, 4, 12]} />
          <meshStandardMaterial color={p.clay} />
        </mesh>
      </group>
      <Box
        pos={[0.28, 0.153, 0.94]}
        size={[0.13, 0.008, 0.24]}
        color={p.olive}
        radius={0.003}
      />
    </group>
  );
}

export function DetailedPlant({ p, ceramic }: Pick<Surfaces, "p" | "ceramic">) {
  const leaf = useMemo(() => {
    const geo = new THREE.PlaneGeometry(1, 1, 10, 16);
    const points = geo.attributes.position;
    for (let i = 0; i < points.count; i++) {
      const t = points.getY(i) + 0.5,
        across = points.getX(i) * 2;
      points.setXYZ(
        i,
        across * Math.pow(Math.sin(t * Math.PI), 0.8) * 0.19,
        t * 0.82,
        Math.sin(t * Math.PI) * 0.16 -
          Math.abs(across) * 0.065 * Math.sin(t * Math.PI),
      );
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  const veins = useMemo(
    () =>
      makeTexture(256, 512, (ctx) => {
        ctx.fillStyle = p.olive;
        ctx.fillRect(0, 0, 256, 512);
        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        gradient.addColorStop(0, p.olive);
        gradient.addColorStop(0.5, p.leaf);
        gradient.addColorStop(1, p.olive);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 512);
        ctx.strokeStyle = p.paper;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(128, 0);
        ctx.lineTo(128, 512);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          ctx.beginPath();
          ctx.moveTo(128, 40 + i * 40);
          ctx.lineTo(10, 90 + i * 40);
          ctx.moveTo(128, 40 + i * 40);
          ctx.lineTo(246, 90 + i * 40);
          ctx.stroke();
        }
      }),
    [p],
  );
  useEffect(
    () => () => {
      leaf.dispose();
      veins.dispose();
    },
    [leaf, veins],
  );
  return (
    <group position={[-4.48, 0.14, -1.6]}>
      <mesh position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.37, 0.07, 48]} />
        <meshStandardMaterial
          color={p.clay}
          roughness={0.8}
          bumpMap={ceramic}
        />
      </mesh>
      <mesh position={[0, 0.36, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.27, 0.64, 48, 1, true]} />
        <meshStandardMaterial
          color={p.clay}
          roughness={0.85}
          bumpMap={ceramic}
          bumpScale={0.002}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Ring pos={[0, 0.68, 0]} radius={0.355} tube={0.024} color={p.clay} />
      <mesh position={[0, 0.635, 0]}>
        <cylinderGeometry args={[0.33, 0.33, 0.015, 40]} />
        <meshStandardMaterial
          color={p.woodDark}
          bumpMap={ceramic}
          bumpScale={0.04}
        />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const angle = i * 2.4,
          height = 0.48 + (i % 3) * 0.24;
        const x = Math.cos(angle) * 0.17,
          z = Math.sin(angle) * 0.17;
        return (
          <group key={i}>
            <Cable
              p={p}
              color={p.olive}
              radius={0.012}
              points={[
                [0, 0.63, 0],
                [x * 0.4, 0.8, z * 0.4],
                [x, 0.63 + height, z],
              ]}
            />
            <mesh
              geometry={leaf}
              position={[x, 0.63 + height, z]}
              rotation={[0.9 + (i % 3) * 0.26, angle, -0.35]}
              scale={0.75 + (i % 3) * 0.18}
              castShadow
              receiveShadow
            >
              <meshStandardMaterial
                map={veins}
                roughness={0.48}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
