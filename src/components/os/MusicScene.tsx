"use client";

/* The Music app's 3D shelf: a low-poly turntable with a spinning vinyl and
   a pair of over-ear headphones beside it. When something is playing the
   record spins at listening speed and colorful musical notes float up out
   of it like a Minecraft note block. Pure procedural primitives. */

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { paletteById, useTheme } from "@/lib/theme-store";

/* ---------- floating note particles ---------- */

const NOTE_COLORS = [
  "#ff5470", "#ff8a4d", "#ffd45e", "#97e87a",
  "#4de1ff", "#7ee0ff", "#b98aff", "#ff6ec7",
];

function Note({ seed, playing }: { seed: number; playing: boolean }) {
  const g = useRef<THREE.Group>(null);
  const color = NOTE_COLORS[seed % NOTE_COLORS.length];
  // deterministic per-note params (no Math.random in render)
  const baseX = -0.55 + ((seed * 37) % 100) / 100 - 0.5;
  const drift = 0.25 + ((seed * 53) % 100) / 300;
  const speed = 0.5 + ((seed * 29) % 100) / 130;
  const phase = (seed * 61) % 100 / 15;

  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    if (!playing) {
      grp.visible = false;
      return;
    }
    grp.visible = true;
    const t = (clock.elapsedTime * speed + phase) % 3; // 0..3 rise cycle
    grp.position.set(
      baseX + Math.sin((t + phase) * 2) * drift,
      -0.1 + t * 0.9,
      0.1 + Math.cos(t + phase) * 0.15,
    );
    const fade = t < 0.3 ? t / 0.3 : t > 2.4 ? (3 - t) / 0.6 : 1;
    grp.scale.setScalar(0.5 + fade * 0.5);
    grp.rotation.z = Math.sin(t * 3 + phase) * 0.3;
    grp.children.forEach((c) => {
      const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (m) m.opacity = fade;
    });
  });

  return (
    <group ref={g}>
      {/* note head */}
      <mesh scale={[1.15, 0.85, 1]}>
        <circleGeometry args={[0.075, 14]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent side={THREE.DoubleSide} />
      </mesh>
      {/* stem */}
      <mesh position={[0.07, 0.14, 0]}>
        <boxGeometry args={[0.022, 0.3, 0.022]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent />
      </mesh>
      {/* flag */}
      <mesh position={[0.12, 0.26, 0]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.09, 0.05, 0.02]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} transparent />
      </mesh>
    </group>
  );
}

function MusicNotes({ playing }: { playing: boolean }) {
  const seeds = useMemo(() => Array.from({ length: 11 }, (_, i) => i * 7 + 3), []);
  return (
    <group position={[-0.55, 0.05, 0]}>
      {seeds.map((s) => (
        <Note key={s} seed={s} playing={playing} />
      ))}
    </group>
  );
}

/* ---------- turntable ---------- */

function Turntable({ playing }: { playing: boolean }) {
  const disc = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (disc.current) disc.current.rotation.y += dt * (playing ? 2.6 : 0.35);
    if (arm.current) {
      const target = playing ? -0.42 : -0.05;
      arm.current.rotation.y += (target - arm.current.rotation.y) * Math.min(1, dt * 3);
    }
  });
  return (
    <group position={[-0.55, -0.42, 0]} rotation={[0.5, -0.32, 0]}>
      {/* plinth */}
      <mesh position={[0, -0.09, 0]}>
        <boxGeometry args={[2.4, 0.18, 1.9]} />
        <meshStandardMaterial color="#5a3f28" flatShading />
      </mesh>
      {/* platter + vinyl */}
      <group ref={disc}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.05, 36]} />
          <meshStandardMaterial color="#0c0c10" roughness={0.35} metalness={0.15} />
        </mesh>
        {[0.7, 0.56, 0.42].map((r) => (
          <mesh key={r} position={[0, 0.058, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r, 0.006, 6, 48]} />
            <meshStandardMaterial color="#1e1e26" roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.012, 24]} />
          <meshStandardMaterial color="#ffd45e" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.07, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
          <meshStandardMaterial color="#0c0c10" />
        </mesh>
      </group>
      {/* tonearm */}
      <group ref={arm} position={[0.95, 0.12, -0.72]}>
        <mesh>
          <cylinderGeometry args={[0.07, 0.09, 0.16, 10]} />
          <meshStandardMaterial color="#8e97c2" metalness={0.5} flatShading />
        </mesh>
        <mesh position={[-0.45, 0.02, 0.32]} rotation={[0, 0.62, 0]}>
          <boxGeometry args={[1.1, 0.045, 0.05]} />
          <meshStandardMaterial color="#b9c0dd" metalness={0.6} flatShading />
        </mesh>
        <mesh position={[-0.88, -0.02, 0.6]}>
          <boxGeometry args={[0.14, 0.08, 0.1]} />
          <meshStandardMaterial color="#22242a" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- headphones (rebuilt: clear ∩ band + two ear cups) ---------- */

function Headphones({ bob }: { bob: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) {
      g.current.position.y = -0.15 + Math.sin(clock.elapsedTime * 1.2) * (bob ? 0.05 : 0.02);
    }
  });
  const CUP_X = 0.5;
  return (
    <group ref={g} position={[1.15, -0.15, 0.1]} rotation={[0.12, -0.5, 0]}>
      {/* headband: a top arch (half torus arcs over the top, ends at ±CUP_X) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[CUP_X, 0.06, 12, 32, Math.PI]} />
        <meshStandardMaterial color="#2a2d3a" flatShading />
      </mesh>
      {/* band padding underside */}
      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.6]}>
        <torusGeometry args={[CUP_X, 0.035, 10, 32, Math.PI]} />
        <meshStandardMaterial color="#3a3f52" flatShading />
      </mesh>

      {/* two ear cups at the band ends */}
      {[-CUP_X, CUP_X].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          {/* yoke connecting band end to cup */}
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.06, 0.16, 0.06]} />
            <meshStandardMaterial color="#8e97c2" metalness={0.5} flatShading />
          </mesh>
          {/* outer cup (axis along X so it faces sideways) */}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.19, 0.19, 0.14, 20]} />
            <meshStandardMaterial color="#22242a" flatShading />
          </mesh>
          {/* ear pad ring */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x < 0 ? -0.07 : 0.07, 0, 0]}>
            <torusGeometry args={[0.14, 0.05, 10, 20]} />
            <meshStandardMaterial color="#15161d" flatShading />
          </mesh>
          {/* glowing driver */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[x < 0 ? -0.05 : 0.05, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.04, 18]} />
            <meshStandardMaterial color="#0c0c10" emissive="#7ee0ff" emissiveIntensity={bob ? 0.7 : 0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function MusicScene({ playing }: { playing: boolean }) {
  const cosmos = useTheme((s) => paletteById(s.themeId).tokens.cosmos);
  return (
    <div className="h-44 w-full overflow-hidden rounded-md" aria-hidden>
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.1, 3.1], fov: 44 }} gl={{ antialias: true }}>
        <AdaptiveDpr pixelated />
        <color attach="background" args={[cosmos]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 4, 2]} intensity={1.1} color="#ffe9c8" />
        <pointLight position={[-2, 2, 2]} intensity={6} color="#7ee0ff" distance={8} />
        <Turntable playing={playing} />
        <MusicNotes playing={playing} />
        <Headphones bob={playing} />
      </Canvas>
    </div>
  );
}
