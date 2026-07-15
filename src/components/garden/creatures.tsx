"use client";

/* The four agent creatures as procedural low-poly R3F bodies. Pure visuals:
   no click handling, no wandering — IslandScene wraps each body in a
   CreatureActor that owns movement, emotes, and selection. Props:
   - hue:   base color (number, three.js can't read CSS vars)
   - stone: dormant statue mode — grey tints, emissives off, animation frozen
   - pace:  idle-animation speed multiplier (energy-driven, ~0.4–1.3)   */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { AgentId } from "@/data/agents";

export interface BodyProps {
  hue: number;
  stone: boolean;
  pace: number;
}

const STONE = 0x565b77;
const STONE_DARK = 0x474c66;

/** Advances a private clock only while animated — statues stay frozen
    mid-pose instead of snapping back to t=0. The deterministic phase
    desyncs creatures from each other (no Math.random in render — lint). */
function useCreatureClock(active: boolean, pace: number, phase: number) {
  const t = useRef(0);
  useEffect(() => {
    if (t.current === 0) t.current = phase;
  }, [phase]);
  useFrame((_, dt) => {
    if (active) t.current += dt * pace;
  });
  return t;
}

export function PaperWing({ hue, stone, pace }: BodyProps) {
  const g = useRef<THREE.Group>(null);
  const lw = useRef<THREE.Mesh>(null);
  const rw = useRef<THREE.Mesh>(null);
  const clock = useCreatureClock(!stone, pace, 2.1);
  useFrame(() => {
    const t = clock.current;
    if (g.current) g.current.position.y = 0.55 + (stone ? 0 : Math.sin(t * 1.6) * 0.12);
    const flap = stone ? 0.2 : 0.32 * Math.sin(t * 5);
    if (lw.current) lw.current.rotation.z = 0.5 + flap;
    if (rw.current) rw.current.rotation.z = -0.5 - flap;
  });
  const body = stone ? STONE : hue;
  return (
    <group ref={g} position={[0, 0.55, 0]}>
      <mesh castShadow>
        <icosahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      <mesh position={[-0.14, 0.3, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.24, 5]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0.14, 0.3, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.08, 0.24, 5]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      {/* eyes */}
      <mesh position={[-0.1, 0.06, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={0x05060f}
          emissive={stone ? 0x000000 : 0xeef1ff}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0.1, 0.06, 0.26]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={0x05060f}
          emissive={stone ? 0x000000 : 0xeef1ff}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh ref={lw} position={[-0.38, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.3]} />
        <meshStandardMaterial color={stone ? STONE_DARK : 0xe8e4ff} flatShading />
      </mesh>
      <mesh ref={rw} position={[0.38, 0.04, 0]}>
        <boxGeometry args={[0.5, 0.02, 0.3]} />
        <meshStandardMaterial color={stone ? STONE_DARK : 0xe8e4ff} flatShading />
      </mesh>
    </group>
  );
}

export function EchoFox({ hue, stone, pace }: BodyProps) {
  const g = useRef<THREE.Group>(null);
  const tails = useRef<(THREE.Mesh | null)[]>([]);
  const clock = useCreatureClock(!stone, pace, 6.4);
  useFrame(() => {
    const t = clock.current;
    if (g.current) {
      g.current.position.y = 0.3 + (stone ? 0 : Math.sin(t * 2) * 0.05);
    }
    if (!stone) {
      tails.current.forEach((tail, i) => {
        if (tail) tail.rotation.z = 0.7 + Math.sin(t * 3 + i) * 0.2;
      });
    }
  });
  const body = stone ? STONE : hue;
  return (
    <group ref={g} position={[0, 0.3, 0]}>
      <mesh scale={[1, 0.8, 1.2]}>
        <icosahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      {/* snout */}
      <mesh position={[0, 0.05, 0.28]}>
        <coneGeometry args={[0.1, 0.24, 5]} />
        <meshStandardMaterial color={stone ? STONE_DARK : 0xffe3c2} flatShading />
      </mesh>
      {/* ears */}
      <mesh position={[-0.1, 0.24, 0.12]} rotation={[0, 0, 0.25]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      <mesh position={[0.1, 0.24, 0.12]} rotation={[0, 0, -0.25]}>
        <coneGeometry args={[0.07, 0.2, 4]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      {/* six tails */}
      {Array.from({ length: 6 }).map((_, i) => {
        const spread = (i - 2.5) * 0.28;
        return (
          <mesh
            key={i}
            ref={(el) => {
              tails.current[i] = el;
            }}
            position={[spread * 0.3, 0.05, -0.34]}
            rotation={[0.5, spread, 0.7]}
          >
            <coneGeometry args={[0.06, 0.44, 5]} />
            <meshStandardMaterial
              color={stone ? STONE : i % 2 ? 0xffc07a : hue}
              emissive={stone ? 0x000000 : hue}
              emissiveIntensity={stone ? 0 : 0.3}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}

export function CashRaptor({ hue, stone, pace }: BodyProps) {
  const g = useRef<THREE.Group>(null);
  const clock = useCreatureClock(!stone, pace, 11.8);
  useFrame(() => {
    const t = clock.current;
    if (g.current) {
      g.current.position.y = 0.35 + (stone ? 0 : Math.abs(Math.sin(t * 2.4)) * 0.08);
    }
  });
  const body = stone ? STONE : hue;
  return (
    <group ref={g} position={[0, 0.35, 0]}>
      <mesh rotation={[0.3, 0, 0]}>
        <capsuleGeometry args={[0.2, 0.3, 4, 8]} />
        <meshStandardMaterial
          color={body}
          metalness={stone ? 0 : 0.6}
          roughness={stone ? 1 : 0.3}
          flatShading
        />
      </mesh>
      <mesh position={[0, 0.3, 0.18]}>
        <boxGeometry args={[0.22, 0.2, 0.3]} />
        <meshStandardMaterial
          color={body}
          metalness={stone ? 0 : 0.6}
          roughness={stone ? 1 : 0.3}
          flatShading
        />
      </mesh>
      {/* camera-lens eye */}
      <mesh position={[0, 0.33, 0.34]}>
        <cylinderGeometry args={[0.05, 0.05, 0.06, 12]} />
        <meshStandardMaterial
          color={0x111111}
          emissive={stone ? 0x000000 : 0x4de1ff}
          emissiveIntensity={0.6}
        />
      </mesh>
      {/* pin quills */}
      {[-0.12, 0, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 0.4, -0.05]} rotation={[-0.4, 0, 0]}>
          <coneGeometry args={[0.03, 0.2, 4]} />
          <meshStandardMaterial
            color={stone ? STONE_DARK : 0xffd45e}
            emissive={stone ? 0x000000 : 0xffd45e}
            emissiveIntensity={stone ? 0 : 0.4}
          />
        </mesh>
      ))}
      {/* legs */}
      <mesh position={[0, -0.28, 0]}>
        <boxGeometry args={[0.08, 0.2, 0.08]} />
        <meshStandardMaterial color={stone ? STONE_DARK : 0x555555} flatShading />
      </mesh>
    </group>
  );
}

export function FortressTortoise({ hue, stone, pace }: BodyProps) {
  const g = useRef<THREE.Group>(null);
  const coin = useRef<THREE.Mesh>(null);
  const clock = useCreatureClock(!stone, pace, 16.3);
  useFrame(() => {
    const t = clock.current;
    if (g.current) g.current.position.y = 0.3 + (stone ? 0 : Math.sin(t * 1.1) * 0.03);
    if (coin.current && !stone) coin.current.rotation.y = t * 2;
  });
  const body = stone ? STONE : hue;
  return (
    <group ref={g} position={[0, 0.3, 0]}>
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.34, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={body} flatShading />
      </mesh>
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.3, 0.2, Math.sin(a) * 0.3]}>
            <boxGeometry args={[0.07, 0.12, 0.07]} />
            <meshStandardMaterial color={stone ? STONE_DARK : 0x8a8570} flatShading />
          </mesh>
        );
      })}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[0.32, 0.34, 0.14, 10]} />
        <meshStandardMaterial color={stone ? STONE : 0x5a6a4a} flatShading />
      </mesh>
      <mesh position={[0, -0.05, 0.36]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color={stone ? STONE : 0x7a8a5a} flatShading />
      </mesh>
      <mesh ref={coin} position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 16]} />
        <meshStandardMaterial
          color={stone ? STONE_DARK : 0xffd45e}
          emissive={stone ? 0x000000 : 0xffd45e}
          emissiveIntensity={stone ? 0 : 0.5}
          metalness={stone ? 0 : 0.8}
        />
      </mesh>
    </group>
  );
}

export const CREATURE: Record<AgentId, (p: BodyProps) => React.ReactElement> = {
  "paper-wing": PaperWing,
  "echo-fox": EchoFox,
  "cash-raptor": CashRaptor,
  "fortress-tortoise": FortressTortoise,
};
