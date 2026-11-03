"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Box, type Palette } from "./DeskMaterials";
import { CityView } from "./DeskOutside";
import { DESK } from "@/data/profile";

export const WINDOW = { x: 4.1, y: 2.7, z: -3.75, width: 3.3, height: 3.2 };

export function DeskWindow({
  p,
  night,
  reduced,
  active,
}: {
  p: Palette;
  night: boolean;
  reduced: boolean;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const target = useRef(0),
    progress = useRef(0);
  const slats = useRef<(THREE.Group | null)[]>([]);
  const rail = useRef<THREE.Group>(null),
    handle = useRef<THREE.Group>(null);
  const straps = useRef<(THREE.Mesh | null)[]>([]),
    pull = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.SpotLight>(null);
  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(-WINDOW.x, 0.15 - WINDOW.y, 1 - WINDOW.z);
    return target;
  }, []);
  const cleanDrag = useRef<() => void>(() => {});
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => () => cleanDrag.current(), []);
  useEffect(() => {
    invalidate();
  }, [night, reduced, invalidate]);
  const toggle = () => {
    target.current = open ? 0 : 1;
    setOpen(!open);
    invalidate();
  };
  const start = (event: PointerEvent) => {
    if (event.button !== 0 || !active) return;
    cleanDrag.current();
    event.preventDefault();
    const initial = target.current,
      initialY = event.clientY,
      id = event.pointerId;
    let moved = 0;
    setDragging(true);
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      moved = e.clientY - initialY;
      target.current = THREE.MathUtils.clamp(
        initial + (moved / 110) * (initial > 0.5 ? -1 : 1),
        0,
        1,
      );
      invalidate();
    };
    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
    };
    const settle = (cancelled: boolean) => {
      detach();
      cleanDrag.current = () => {};
      setDragging(false);
      const next = cancelled
        ? initial > 0.5
        : Math.abs(moved) < 8
          ? initial < 0.5
          : target.current > 0.5;
      target.current = next ? 1 : 0;
      setOpen(next);
      invalidate();
    };
    const finish = (e: PointerEvent) => {
      if (e.pointerId === id) settle(false);
    };
    const cancel = () => settle(true);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    cleanDrag.current = detach;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
  };
  useFrame((_, delta) => {
    progress.current = reduced
      ? target.current
      : THREE.MathUtils.damp(
          progress.current,
          target.current,
          8,
          Math.min(delta, 1 / 30),
        );
    const t = progress.current;
    slats.current.forEach((slat, i) => {
      if (slat) {
        slat.position.y = THREE.MathUtils.lerp(
          -1.42 + i * 0.255,
          1.44 - (11 - i) * 0.052,
          t,
        );
        slat.rotation.x = THREE.MathUtils.lerp(1.12, 0.02, t);
      }
    });
    const bottom = THREE.MathUtils.lerp(-1.55, 0.82, t);
    if (rail.current) rail.current.position.y = bottom;
    straps.current.forEach((strap) => {
      if (strap) {
        strap.position.y = (1.52 + bottom) / 2;
        strap.scale.y = 1.52 - bottom;
      }
    });
    const extension = Math.sin(t * Math.PI) * 0.45;
    if (handle.current) handle.current.position.y = 0.6 - extension;
    if (pull.current) {
      pull.current.position.y = 1.075 - extension / 2;
      pull.current.scale.y = 0.95 + extension;
    }
    if (light.current) light.current.intensity = (night ? 6 : 38) * (0.12 + 0.88 * t);
    if (Math.abs(t - target.current) > 0.0001) invalidate();
  });
  const begin = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    start(event.nativeEvent);
  };
  return (
    <group position={[WINDOW.x, WINDOW.y, WINDOW.z]}>
      <CityView p={p} night={night} />
      {/* Deep reveals obscure the exterior beyond the actual opening. */}
      {[-1.72, 1.72].map((x) => (
        <Box
          key={x}
          pos={[x, 0, -0.08]}
          size={[0.16, 3.55, 0.5]}
          color={p.ivory}
          radius={0.02}
        />
      ))}
      {[-1.7, 1.7].map((y) => (
        <Box
          key={y}
          pos={[0, y, -0.08]}
          size={[3.6, 0.16, 0.5]}
          color={p.ivory}
          radius={0.02}
        />
      ))}
      <Box
        pos={[0, -1.72, 0.2]}
        size={[3.8, 0.16, 0.85]}
        color={p.paper}
        radius={0.025}
      />
      <Box
        pos={[0, 1.68, 0.22]}
        size={[3.58, 0.2, 0.27]}
        color={p.paper}
        radius={0.025}
      />
      <Box
        pos={[0, 0, -0.22]}
        size={[0.055, 3.3, 0.08]}
        color={p.ivory}
        radius={0.008}
      />
      <Box
        pos={[0, -0.25, -0.21]}
        size={[3.3, 0.055, 0.08]}
        color={p.ivory}
        radius={0.008}
      />
      {Array.from({ length: 12 }, (_, i) => (
        <group
          key={i}
          ref={(el) => {
            slats.current[i] = el;
          }}
          position={[0, -1.42 + i * 0.255, 0.22]}
        >
          <Box
            pos={[0, 0, 0]}
            size={[3.3, 0.028, 0.29]}
            castShadow
            color={p.paper}
            radius={0.01}
          />
        </group>
      ))}
      <group ref={rail} position={[0, -1.55, 0.23]}>
        <Box
          pos={[0, 0, 0]}
          size={[3.38, 0.08, 0.31]}
          color={p.ivory}
          radius={0.02}
        />
      </group>
      {[-1.17, 1.17].map((x, i) => (
        <mesh
          key={x}
          ref={(el) => {
            straps.current[i] = el;
          }}
          position={[x, 0, 0.4]}
          scale={[1, 3.1, 1]}
        >
          <cylinderGeometry args={[0.008, 0.008, 1, 6]} />
          <meshStandardMaterial color={p.shadow} />
        </mesh>
      ))}
      <group
        onPointerDown={begin}
        onPointerOver={() => {
          document.body.style.cursor = "ns-resize";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <mesh ref={pull} position={[1.48, 1.075, 0.5]} scale={[1, 0.95, 1]}>
          <cylinderGeometry args={[0.014, 0.014, 1, 8]} />
          <meshStandardMaterial color={p.paper} />
        </mesh>
        <group ref={handle} position={[1.48, 0.6, 0.5]}>
          <mesh castShadow>
            <capsuleGeometry args={[0.065, 0.17, 6, 16]} />
            <meshPhysicalMaterial
              color={p.accent}
              clearcoat={0.4}
              roughness={0.35}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.22, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      </group>
      <primitive object={lightTarget} />
      <spotLight
        ref={light}
        position={[0, 1.05, -0.08]}
        target={lightTarget}
        color={night ? p.sky : p.light}
        intensity={0}
        angle={1.18}
        penumbra={0.8}
        distance={16}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.06}
        shadow-camera-far={16}
        shadow-normalBias={0.002}
        shadow-bias={-0.00002}
        shadow-radius={3}
      />
      {active && (
        <Html
          position={[open ? 1.48 : 0.1, 0.6, 0.65]}
          center
          zIndexRange={[6, 0]}
        >
          <button
            className={`desk-hotspot blind-control ${open ? "is-open" : ""} ${dragging ? "is-pulling" : ""}`}
            aria-label={
              open ? DESK.details.blindsClose : DESK.details.blindsOpen
            }
            aria-pressed={open}
            onPointerDown={(e) => start(e.nativeEvent)}
            onClick={(e) => {
              if (e.detail === 0) toggle();
            }}
          >
            <span aria-hidden="true">↕</span>
            <div>
              {open ? DESK.details.blindsClose : DESK.details.blindsOpen}
              <small>{DESK.details.blindsHint}</small>
            </div>
          </button>
          <span className="sr-only" role="status">
            {open ? DESK.details.outside : ""}
          </span>
        </Html>
      )}
    </group>
  );
}
