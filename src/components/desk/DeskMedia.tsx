"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  Box,
  Ring,
  Cable,
  Label,
  useShadowRefresh,
  useSurfaces,
  type Palette,
} from "./DeskMaterials";
import { DESK } from "@/data/profile";

const ease = (t: number) => {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

export function DiscDrive({
  p,
  request,
  reduced,
}: {
  p: Palette;
  request: number;
  reduced: boolean;
}) {
  const tray = useRef<THREE.Group>(null),
    disc = useRef<THREE.Group>(null);
  const time = useRef(4);
  const invalidate = useThree((s) => s.invalidate);
  const refreshShadows = useShadowRefresh();
  useEffect(() => {
    time.current = request > 0 && !reduced ? 0 : 4;
    invalidate();
  }, [request, reduced, invalidate]);
  useFrame((_, delta) => {
    const t = time.current;
    if (tray.current)
      tray.current.position.z =
        -0.85 + 0.85 * (ease(t / 0.7) - ease((t - 2.1) / 0.9));
    if (disc.current) {
      disc.current.visible = t > 0.45 && t < 3.05;
      const land = ease((t - 0.55) / 1.2);
      disc.current.position.set(
        0,
        THREE.MathUtils.lerp(0.65, 0.055, land),
        THREE.MathUtils.lerp(1.15, 0.43, land),
      );
      disc.current.rotation.x = THREE.MathUtils.lerp(-0.65, 0, land);
    }
    if (t < 3.2) {
      time.current += Math.min(delta, 1 / 30);
      invalidate();
      refreshShadows();
    }
  });
  return (
    <group position={[0, 0.62, 1.01]}>
      <Box
        pos={[0, 0, -0.015]}
        size={[0.9, 0.25, 0.04]}
        color={p.shadow}
        radius={0.012}
      />
      <Box
        pos={[0, 0.01, 0.012]}
        size={[0.82, 0.08, 0.015]}
        color={p.ink}
        radius={0.008}
      />
      <group ref={tray} position={[0, 0, -0.85]}>
        <Box
          pos={[0, -0.025, 0.43]}
          size={[0.8, 0.035, 0.86]}
          color={p.ink}
          radius={0.025}
        />
        <Ring
          pos={[0, -0.004, 0.43]}
          radius={0.36}
          tube={0.008}
          color={p.shadow}
        />
        <Box
          pos={[0, 0, 0.86]}
          size={[0.85, 0.21, 0.055]}
          color={p.ivory}
          radius={0.012}
        />
        <Label
          text={DESK.room.disc}
          p={p}
          printOnly
          pos={[-0.05, 0.015, 0.89]}
          width={0.62}
        />
        <group ref={disc} visible={false}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.045, 0.35, 64]} />
            <meshPhysicalMaterial
              color={p.metal}
              roughness={0.15}
              metalness={0.9}
              iridescence={1}
              iridescenceIOR={1.4}
              side={THREE.DoubleSide}
            />
          </mesh>
          <Ring pos={[0, 0.001, 0]} radius={0.1} tube={0.008} color={p.paper} />
          <Label
            text={DESK.computer.title}
            p={p}
            printOnly
            pos={[0, 0.003, 0.18]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={0.38}
          />
        </group>
      </group>
      <Box
        pos={[0.32, -0.075, 0.06]}
        size={[0.06, 0.025, 0.015]}
        color={p.metal}
        radius={0.003}
      />
    </group>
  );
}

function Speaker({ p, x, z }: { p: Palette; x: number; z: number }) {
  const s = useSurfaces();
  return (
    <group position={[x, 0.15, z]}>
      <Box
        pos={[0, 0.53, 0]}
        size={[0.47, 1.06, 0.47]}
        color={p.ivory}
        radius={0.06}
        map={s.plasticTint}
        tint
        roughness={1}
        roughnessMap={s.plasticSurface}
        bumpMap={s.plasticSurface}
        bumpScale={0.12}
        envMapIntensity={0.7}
      />
      <Box
        pos={[0, 0.55, 0.23]}
        size={[0.37, 0.86, 0.025]}
        color={p.ink}
        radius={0.035}
        roughness={1}
        roughnessMap={s.tooth}
        bumpMap={s.tooth}
        bumpScale={0.08}
      />
      {[
        { y: 0.42, r: 0.14 },
        { y: 0.84, r: 0.07 },
      ].map(({ y, r }) => (
        <group key={y} position={[0, y, 0.25]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[r, r * 0.72, 0.045, 32]} />
            <meshStandardMaterial
              color={p.shadow}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
          <Ring
            pos={[0, 0, 0.025]}
            radius={r}
            tube={0.016}
            color={p.ink}
            rotation={[0, 0, 0]}
          />
          <mesh position={[0, 0, 0.03]} scale={[r * 0.45, r * 0.45, 0.025]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color={p.ink} roughness={0.35} />
          </mesh>
        </group>
      ))}
      <Label
        text={DESK.room.speakers}
        p={p}
        printOnly
        pos={[0, 0.11, 0.25]}
        width={0.37}
      />
      <Cable
        p={p}
        radius={0.012}
        points={[
          [0, 0.06, -0.2],
          [0.1, 0.02, -0.5],
          [0.35, 0.02, -1],
          [0.55, -0.1, -1.2],
        ]}
      />
    </group>
  );
}

export function DeskSpeakers({
  p,
  active,
  request,
  reduced,
}: {
  p: Palette;
  active: boolean;
  request: number;
  reduced: boolean;
}) {
  const notes = useRef<(THREE.Group | null)[]>([]),
    age = useRef(20);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    age.current = 0;
    invalidate();
  }, [request, invalidate]);
  useEffect(() => {
    invalidate();
  }, [active, reduced, invalidate]);
  useFrame((_, delta) => {
    const playing = active && request > 0 && !reduced && age.current < 14;
    notes.current.forEach((note, i) => {
      if (!note) return;
      note.visible = playing && age.current > 1.7;
      const t = (Math.max(0, age.current - 1.7) * 0.6 + i * 0.41) % 2.5;
      const x = i < 4 ? -1.72 : 2.36;
      note.position.set(
        x + Math.sin(t * 2 + i) * 0.12,
        1.25 + t * 0.5,
        -0.08 + Math.cos(i) * 0.04,
      );
      note.rotation.z = Math.sin(t * 2 + i) * 0.15;
      const fade = Math.min(t * 3, (2.5 - t) * 2, 1);
      note.scale.setScalar(0.65 + fade * 0.35);
      note.children.forEach((child) => {
        ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity =
          fade;
      });
    });
    if (playing) {
      age.current += Math.min(delta, 1 / 30);
      invalidate();
    }
  });
  return (
    <group>
      <Speaker p={p} x={-1.72} z={-0.08} />
      <Speaker p={p} x={2.36} z={-0.25} />
      {Array.from({ length: 8 }, (_, i) => (
        <group
          key={i}
          ref={(node) => {
            notes.current[i] = node;
          }}
          visible={false}
        >
          <mesh scale={[1.2, 0.8, 1]}>
            <circleGeometry args={[0.065, 16]} />
            <meshStandardMaterial
              color={i % 2 ? p.posterRose : p.posterMint}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.061, 0.12, 0]}>
            <boxGeometry args={[0.019, 0.26, 0.015]} />
            <meshStandardMaterial
              color={i % 2 ? p.posterRose : p.posterMint}
              transparent
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0.1, 0.22, 0]} rotation={[0, 0, -0.4]}>
            <boxGeometry args={[0.09, 0.035, 0.015]} />
            <meshStandardMaterial
              color={i % 2 ? p.posterRose : p.posterMint}
              transparent
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
