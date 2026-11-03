"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { Box, makeTexture, type Palette } from "./DeskMaterials";
import { DESK } from "@/data/profile";

export const WINDOW = { x: 4.1, y: 2.7, z: -3.75, width: 3.3, height: 3.2 };

function CityView({ p, night }: { p: Palette; night: boolean }) {
  const sky = useMemo(
    () =>
      makeTexture(512, 512, (ctx) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, night ? p.skyNight : p.sky);
        gradient.addColorStop(0.55, night ? p.skyNight : p.sky);
        gradient.addColorStop(1, night ? p.city : p.horizon);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        if (night) {
          ctx.fillStyle = p.light;
          for (let i = 0; i < 50; i++) {
            const x = (i * 167 + 37) % 512,
              y = (i * 89 + 21) % 310;
            ctx.globalAlpha = 0.3 + (i % 4) * 0.15;
            ctx.fillRect(x, y, 1.4, 1.4);
          }
        } else {
          ctx.fillStyle = p.paper;
          ctx.globalAlpha = 0.2;
          [
            [80, 100, 90, 12],
            [300, 180, 140, 9],
            [170, 270, 150, 8],
          ].forEach(([x, y, w, h]) => {
            ctx.beginPath();
            ctx.ellipse(x, y, w, h, -0.08, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }),
    [p, night],
  );
  const facade = useMemo(
    () =>
      makeTexture(256, 512, (ctx) => {
        ctx.fillStyle = p.city;
        ctx.fillRect(0, 0, 256, 512);
        for (let row = 0; row < 12; row++)
          for (let col = 0; col < 5; col++) {
            const lit = night && (row * 7 + col * 3) % 5 < 2;
            ctx.fillStyle = lit ? p.light : p.ink;
            ctx.globalAlpha = lit ? 0.9 : 0.4;
            ctx.fillRect(18 + col * 48, 15 + row * 42, 23, 26);
            ctx.fillStyle = p.paper;
            ctx.globalAlpha = 0.2;
            ctx.fillRect(16 + col * 48, 42 + row * 42, 28, 2);
          }
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = p.woodDark;
        for (let y = 4; y < 512; y += 10) ctx.fillRect(0, y, 256, 1);
      }),
    [p, night],
  );
  useEffect(
    () => () => {
      sky.dispose();
      facade.dispose();
    },
    [sky, facade],
  );
  return (
    <group>
      <mesh position={[0, 0, -9]}>
        <planeGeometry args={[26, 18]} />
        <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[-1.2, 2.9, -8.8]}>
        <circleGeometry args={[night ? 0.24 : 0.38, 48]} />
        <meshBasicMaterial
          color={night ? p.paper : p.light}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const height = 1.4 + ((i * 7) % 9) * 0.23;
        return (
          <mesh
            key={i}
            position={[-6 + i * 1.08, -3 + height / 2, -7 + (i % 3) * 0.16]}
          >
            <boxGeometry args={[0.82, height, 0.55]} />
            <meshBasicMaterial
              color={night ? p.skyNight : p.city}
              fog={false}
            />
          </mesh>
        );
      })}
      {[-3.1, -1.7, 0.1, 1.7, 3.2].map((x, i) => {
        const height = 1.5 + (i % 3) * 0.42;
        return (
          <group key={x} position={[x, -2.9, -3.8 - (i % 2) * 0.8]}>
            <mesh position={[0, height / 2, 0]}>
              <boxGeometry args={[1.2, height, 0.8]} />
              <meshBasicMaterial
                map={facade}
                color={i % 2 ? p.ivory : p.clay}
                fog={false}
              />
            </mesh>
            <mesh position={[0, height + 0.045, 0]}>
              <boxGeometry args={[1.3, 0.09, 0.9]} />
              <meshBasicMaterial color={p.ink} fog={false} />
            </mesh>
            {i % 2 === 0 && (
              <group position={[0.18, height + 0.38, 0]}>
                <mesh>
                  <cylinderGeometry args={[0.19, 0.19, 0.42, 14]} />
                  <meshBasicMaterial color={p.woodDark} fog={false} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                  <coneGeometry args={[0.24, 0.14, 14]} />
                  <meshBasicMaterial color={p.ink} fog={false} />
                </mesh>
                {[-0.13, 0.13].map((px) => (
                  <mesh key={px} position={[px, -0.3, 0]}>
                    <boxGeometry args={[0.035, 0.26, 0.035]} />
                    <meshBasicMaterial color={p.ink} fog={false} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        );
      })}
      <group position={[2.25, -0.65, -6.5]}>
        <mesh>
          <boxGeometry args={[0.65, 2.6, 0.6]} />
          <meshBasicMaterial map={facade} color={p.ivory} fog={false} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <boxGeometry args={[0.4, 0.5, 0.4]} />
          <meshBasicMaterial color={p.city} fog={false} />
        </mesh>
        <mesh position={[0, 1.96, 0]}>
          <coneGeometry args={[0.13, 0.55, 4]} />
          <meshBasicMaterial color={p.city} fog={false} />
        </mesh>
        <mesh position={[0, 2.38, 0]}>
          <cylinderGeometry args={[0.012, 0.022, 0.4, 6]} />
          <meshBasicMaterial color={p.ink} fog={false} />
        </mesh>
      </group>
    </group>
  );
}

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
  const light = useRef<THREE.PointLight>(null);
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
    if (light.current) light.current.intensity = (night ? 1.5 : 6) * t;
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
      <pointLight
        ref={light}
        position={[0, 0.4, 1.4]}
        color={night ? p.sky : p.light}
        intensity={0}
        distance={7}
        decay={2}
      />
      {active && (
        <Html position={[0.1, 0.6, 0.65]} center zIndexRange={[6, 0]}>
          <button
            className={`desk-hotspot blind-control ${dragging ? "is-pulling" : ""}`}
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
