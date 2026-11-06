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
  useSurfaces,
  type Palette,
} from "./DeskMaterials";
import { mix } from "./DeskSurfaces";
import { DiscDrive } from "./DeskMedia";
import { KeyboardWear, TowerWear } from "./DeskWear";
import { DESK } from "@/data/profile";

type Surfaces = {
  p: Palette;
  grain: THREE.Texture;
  woven: THREE.Texture;
  ceramic: THREE.Texture;
};

// Each legend is baked into one atlas, and all keycaps share three draw calls.
// Alphas and modifiers are two plastics, and every cap has aged a little
// differently (per-vertex colour, so it costs nothing extra to draw).
export function DetailedKeyboard({ p }: { p: Palette }) {
  const s = useSurfaces();
  const model = useMemo(() => {
    type Key = {
      label: string;
      x: number;
      z: number;
      width: number;
      accent: boolean;
      modifier: boolean;
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
          modifier: label.length > 1 || (label !== "" && "↑←↓→".includes(label)),
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
          modifier: ["num", "/", "*", "+"].includes(label),
        });
      }),
    );
    // The most-typed legends have half worn away.
    const worn = new Set(["A", "S", "E", "R", "T", "N", "back", "←", "→"]);
    const atlas = makeTexture(1024, 1024, (ctx) => {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      keys.forEach((key, i) => {
        ctx.globalAlpha = worn.has(key.label) ? 0.38 : 1;
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
    const alpha = new THREE.Color().setStyle(p.paper),
      modifier = new THREE.Color().setStyle(mix(p.paper, p.shadow, 0.42)),
      accent = new THREE.Color(1, 1, 1),
      tone = new THREE.Color(),
      aged = new THREE.Color().setStyle(mix(p.paper, p.clay, 0.5));
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
      // Deterministic per-key ageing: some caps yellowed more than others.
      const wear = ((i * 7919) % 97) / 97;
      tone
        .copy(key.accent ? accent : key.modifier ? modifier : alpha)
        .lerp(aged, key.accent ? 0 : wear * 0.22)
        .multiplyScalar(
          (0.96 + ((i * 31) % 11) / 250) * (worn.has(key.label) ? 1.04 : 1),
        );
      const colors = new Float32Array(cap.attributes.position.count * 3);
      for (let v = 0; v < colors.length; v += 3) {
        colors[v] = tone.r;
        colors[v + 1] = tone.g;
        colors[v + 2] = tone.b;
      }
      cap.setAttribute("color", new THREE.BufferAttribute(colors, 3));
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
        roughness={0.8}
      />
      <Box
        pos={[0, 0, 0]}
        size={[3.62, 0.16, 1.39]}
        color={p.ivory}
        radius={0.07}
        map={s.plasticTint}
        tint
        roughness={1}
        roughnessMap={s.plasticSurface}
        bumpMap={s.plasticSurface}
        bumpScale={0.1}
        envMapIntensity={0.7}
      />
      <Box
        pos={[0, 0.085, -0.035]}
        size={[3.4, 0.025, 1.16]}
        color={mix(p.shadow, p.ink, 0.5)}
        radius={0.01}
        roughness={0.9}
      />
      {model.merged.slice(0, 2).map((geometry, i) => (
        <mesh key={i} geometry={geometry} castShadow receiveShadow>
          <meshStandardMaterial
            color={i ? p.accent : "white"}
            vertexColors
            roughness={1}
            roughnessMap={s.plasticSurface}
            bumpMap={s.plasticSurface}
            bumpScale={0.06}
            envMapIntensity={0.6}
          />
        </mesh>
      ))}
      {/* Printed legends are lit like the plastic they sit on. */}
      <mesh geometry={model.merged[2]}>
        <meshStandardMaterial
          map={model.atlas}
          transparent
          alphaTest={0.1}
          depthWrite={false}
          roughness={0.7}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          position={[1.1 + i * 0.17, 0.09, -0.535]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[0.018, 12]} />
          <meshBasicMaterial color={i === 0 ? p.accentLight : p.muted} />
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
      <KeyboardWear p={p} />
    </group>
  );
}

export function DetailedTower({
  p,
  musicRequest,
  reduced,
}: Pick<Surfaces, "p"> & {
  musicRequest: number;
  reduced: boolean;
}) {
  const s = useSurfaces();
  const abs = {
    map: s.plasticTint,
    tint: true,
    roughness: 1,
    roughnessMap: s.plasticSurface,
    bumpMap: s.plasticSurface,
    bumpScale: 0.12,
    envMapIntensity: 0.7,
  };
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
        color={mix(p.shadow, p.ink, 0.3)}
        radius={0.065}
        roughness={0.85}
      />
      {/* Lifted 5mm above the case top (and tucked 5mm inside its back) so
          the faces are never coplanar: coplanar tops z-fought as the camera
          parallaxed with the pointer. */}
      <Box
        pos={[0, 0.02, -0.015]}
        size={[1.08, 1.93, 1.82]}
        color={p.ivory}
        radius={0.06}
        {...abs}
      />
      <Box
        pos={[0, 0, 0.925]}
        size={[1.065, 1.92, 0.08]}
        color={p.ivory}
        radius={0.07}
        {...abs}
      />
      <DiscDrive p={p} request={musicRequest} reduced={reduced} />
      {[0.3, -0.02].map((y, i) => (
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
            {...abs}
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
                color={p.accent}
                radius={0.002}
              />
            </>
          )}
        </group>
      ))}
      <mesh position={[0, -0.65, 0.972]}>
        <planeGeometry args={[0.72, 0.43]} />
        <meshStandardMaterial
          map={grille}
          roughness={0.8}
          bumpMap={grille}
          bumpScale={0.6}
        />
      </mesh>
      <mesh position={[0.28, -0.29, 0.984]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.072, 0.072, 0.03, 24]} />
        <meshStandardMaterial
          color={p.accent}
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
      <TowerWear p={p} />
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
        color={mix(p.shadow, p.muted, 0.35)}
        bumpMap={woven}
        bumpScale={0.18}
        roughness={0.96}
        envMapIntensity={0.4}
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
        background={p.shadow}
      />
    </group>
  );
}

export function Pottery({
  p,
  ceramic,
  grain,
}: Pick<Surfaces, "p" | "ceramic" | "grain">) {
  // One closed cross-section forms the foot, outside, rounded lip and inside.
  // The mug starts exactly on the coaster; the coffee sits below the lip.
  const profile = useMemo(
    () => [
      [0, 0.014], [0.165, 0.014], [0.178, 0.004], [0.194, 0.004],
      [0.205, 0.014], [0.214, 0.031], [0.224, 0.058], [0.234, 0.105],
      [0.244, 0.19], [0.253, 0.30], [0.26, 0.42], [0.263, 0.503],
      [0.261, 0.519], [0.255, 0.529], [0.246, 0.533], [0.236, 0.53],
      [0.229, 0.522], [0.227, 0.507], [0.225, 0.42], [0.218, 0.30],
      [0.209, 0.19], [0.2, 0.12], [0.189, 0.084], [0.17, 0.071], [0, 0.071],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    [],
  );
  const handle = useMemo(() => new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.244, 0.426, 0),
    new THREE.Vector3(-0.338, 0.444, 0),
    new THREE.Vector3(-0.448, 0.395, 0),
    new THREE.Vector3(-0.472, 0.292, 0),
    new THREE.Vector3(-0.433, 0.185, 0),
    new THREE.Vector3(-0.326, 0.126, 0),
    new THREE.Vector3(-0.227, 0.151, 0),
  ]), []);
  const glaze = {
    color: p.ivory, bumpMap: ceramic, bumpScale: 0.0007,
    roughness: 0.26, clearcoat: 0.65, clearcoatRoughness: 0.2,
  };
  return (
    <group position={[-2.5, 0.125, 1.45]} rotation={[0, -0.2, 0]}>
      <mesh position={[0, 0.022, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.385, 0.37, 0.044, 80]} />
        <meshStandardMaterial color={p.wood} bumpMap={grain} bumpScale={0.12} roughness={0.82} />
      </mesh>
      <Ring pos={[0, 0.043, 0]} radius={0.355} tube={0.003} color={p.woodDark} />
      <group position={[0, 0.04, 0]}>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[profile, 96]} />
          <meshPhysicalMaterial {...glaze} />
        </mesh>
        <mesh castShadow receiveShadow>
          <tubeGeometry args={[handle, 48, 0.038, 16, false]} />
          <meshPhysicalMaterial {...glaze} />
        </mesh>
        {/* Concave meniscus meets the inner wall, with no floating disk/rim. */}
        <mesh receiveShadow>
          <latheGeometry args={[[
            new THREE.Vector2(0.226, 0.461),
            new THREE.Vector2(0.218, 0.457),
            new THREE.Vector2(0.195, 0.456),
            new THREE.Vector2(0, 0.456),
          ], 96]} />
          <meshPhysicalMaterial color={p.woodDark} roughness={0.18} clearcoat={1} clearcoatRoughness={0.08} />
        </mesh>
      </group>
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
        ctx.fillStyle = p.accent;
        ctx.fillText(DESK.details.sketch, 55, 138);
        ctx.strokeStyle = p.accent;
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
          <meshStandardMaterial color={p.accent} roughness={0.5} />
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
        color={p.accent}
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
        ctx.fillStyle = p.foliage;
        ctx.fillRect(0, 0, 256, 512);
        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        gradient.addColorStop(0, p.foliage);
        gradient.addColorStop(0.5, p.foliageLight);
        gradient.addColorStop(1, p.foliage);
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
    <group position={[-5, 0.14, -2.1]}>
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
              color={p.foliage}
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
