"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  Box,
  Ring,
  Label,
  Screw,
  Cable,
  surfaceTexture,
  type Palette,
} from "./DeskMaterials";
import { CameraRoll } from "./CameraRoll";
import { DESK } from "@/data/profile";

export function DeskCamera({
  p,
  onClick,
  active,
  ready,
  reduced,
  onClose,
}: {
  p: Palette;
  active: boolean;
  ready: boolean;
  reduced: boolean;
  onClose: () => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const leather = useMemo(() => surfaceTexture("leather"), []);
  const dial = useMemo(() => {
    const parts = Array.from({ length: 40 }, (_, i) => {
      const angle = (i / 40) * Math.PI * 2;
      return new THREE.BoxGeometry(0.004, 0.012, 0.012)
        .translate(0, 0.065, 0)
        .rotateZ(angle);
    });
    const merged = mergeGeometries(parts)!;
    parts.forEach((part) => part.dispose());
    return merged;
  }, []);
  useEffect(
    () => () => {
      leather.dispose();
      dial.dispose();
    },
    [leather, dial],
  );
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [active, reduced, invalidate]);
  useFrame((_, delta) => {
    const target = active ? 1 : 0;
    progress.current = reduced
      ? target
      : THREE.MathUtils.damp(
          progress.current,
          target,
          4.8,
          Math.min(delta, 1 / 30),
        );
    const t = progress.current;
    if (group.current) {
      group.current.position.set(
        THREE.MathUtils.lerp(3.45, 0, t),
        THREE.MathUtils.lerp(0.38, 2.3, t) + Math.sin(t * Math.PI) * 0.3,
        THREE.MathUtils.lerp(1.12, 5.2, t),
      );
      group.current.rotation.set(
        Math.sin(t * Math.PI) * -0.2,
        THREE.MathUtils.lerp(-0.22, -Math.PI, t),
        Math.sin(t * Math.PI) * -0.08,
      );
      group.current.scale.setScalar(THREE.MathUtils.lerp(1, 2.4, t));
    }
    if (Math.abs(t - target) > 0.0001) invalidate();
  });
  return (
    <group
      ref={group}
      position={[3.45, 0.38, 1.12]}
      rotation={[0, -0.22, 0]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Box
        pos={[0, 0, 0]}
        size={[0.91, 0.53, 0.38]}
        color={p.metal}
        metalness={0.6}
        radius={0.06}
      />
      <Box
        pos={[0, -0.04, 0.2]}
        size={[0.88, 0.28, 0.015]}
        color={p.ink}
        radius={0.01}
        bumpMap={leather}
        bumpScale={0.0014}
      />
      <mesh
        position={[0.13, -0.025, 0.3]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.23, 0.23, 0.23, 32]} />
        <meshStandardMaterial color={p.ink} metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0.13, -0.025, 0.42]}>
        <circleGeometry args={[0.16, 32]} />
        <meshPhysicalMaterial
          color={p.accent}
          metalness={0.7}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      <Box
        pos={[-0.29, 0.17, 0.21]}
        size={[0.17, 0.09, 0.015]}
        color={p.paper}
        radius={0.01}
      />
      <mesh position={[-0.25, 0.29, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
        <meshStandardMaterial color={p.ink} />
      </mesh>
      {[0.255, 0.32, 0.39].map((z, i) => (
        <Ring
          key={z}
          pos={[0.13, -0.025, z]}
          radius={0.232 - i * 0.015}
          tube={0.012}
          color={i === 1 ? p.metal : p.ink}
          rotation={[0, 0, 0]}
          metalness={0.65}
        />
      ))}
      <Ring
        pos={[0.13, -0.025, 0.425]}
        radius={0.155}
        tube={0.01}
        color={p.metal}
        rotation={[0, 0, 0]}
        metalness={0.8}
      />
      <mesh position={[0.13, -0.025, 0.43]}>
        <circleGeometry args={[0.1, 32]} />
        <meshPhysicalMaterial
          color={p.ink}
          metalness={0.3}
          roughness={0.08}
          clearcoat={1}
        />
      </mesh>
      <Label
        text={DESK.details.camera}
        printOnly
        p={p}
        pos={[-0.22, 0.145, 0.211]}
        width={0.25}
        background={p.metal}
      />
      {[-0.39, 0.39].map((x) => (
        <Screw key={x} p={p} pos={[x, -0.18, 0.211]} scale={0.5} />
      ))}
      <Box
        pos={[0.27, 0.28, 0]}
        size={[0.18, 0.035, 0.1]}
        color={p.ink}
        radius={0.01}
      />
      <Ring
        pos={[-0.25, 0.325, 0]}
        radius={0.063}
        tube={0.008}
        color={p.metal}
        metalness={0.8}
      />
      <Cable
        p={p}
        color={p.woodDark}
        radius={0.026}
        points={[
          [-0.46, 0.06, 0],
          [-0.65, -0.2, 0.15],
          [-0.64, -0.21, 0.7],
          [0.1, -0.21, 0.9],
          [0.6, -0.21, 0.6],
          [0.46, 0.06, 0],
        ]}
      />
      {/* A real rear body and LCD, revealed as the camera turns in the visitor's hands. */}
      <Box
        pos={[0, 0, -0.199]}
        size={[0.86, 0.48, 0.02]}
        color={p.ink}
        radius={0.03}
        roughness={0.72}
        bumpMap={leather}
        bumpScale={0.0012}
      />
      <Box
        pos={[0.09, -0.005, -0.216]}
        size={[0.67, 0.435, 0.018]}
        color={p.shadow}
        radius={0.014}
      />
      <Box
        pos={[0.09, -0.005, -0.228]}
        size={[0.64, 0.415, 0.015]}
        color={p.ink}
        radius={0.008}
      />
      <group position={[-0.33, -0.035, -0.23]} rotation={[0, Math.PI, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.024, 32]} />
          <meshStandardMaterial
            color={p.metal}
            roughness={0.35}
            metalness={0.8}
          />
        </mesh>
        <Ring
          pos={[0, 0, 0.014]}
          radius={0.061}
          tube={0.009}
          color={p.shadow}
          rotation={[0, 0, 0]}
        />
        <mesh geometry={dial} position={[0, 0, 0.017]}>
          <meshStandardMaterial
            color={p.metal}
            roughness={0.32}
            metalness={0.75}
          />
        </mesh>
        <mesh position={[0, 0, 0.027]}>
          <circleGeometry args={[0.047, 32]} />
          <meshStandardMaterial color={p.ink} roughness={0.55} />
        </mesh>
        <Label
          p={p}
          text={DESK.camera.set}
          pos={[0, 0, 0.029]}
          width={0.085}
          color={p.paper}
          printOnly
        />
      </group>
      {[-0.15, 0.15].map((y) => (
        <Box
          key={y}
          pos={[-0.33, y, -0.235]}
          size={[0.085, 0.036, 0.02]}
          color={p.shadow}
          radius={0.01}
        />
      ))}
      <Label
        text={DESK.camera.model}
        p={p}
        pos={[0.07, 0.226, -0.224]}
        rotation={[0, Math.PI, 0]}
        width={0.26}
        color={p.paper}
        printOnly
      />
      {active && ready && (
        <Html
          transform
          position={[0.09, -0.005, -0.241]}
          rotation={[0, Math.PI, 0]}
          distanceFactor={0.4}
          zIndexRange={[7, 1]}
          wrapperClass="camera-html"
        >
          <CameraRoll onClose={onClose} />
        </Html>
      )}
    </group>
  );
}
