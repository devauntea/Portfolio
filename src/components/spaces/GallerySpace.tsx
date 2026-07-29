"use client";

/* Fullscreen walkable gallery: a first-person room built around the same
   six framed prints. Drag (mouse or finger) to look around; WASD / arrow
   keys — or the on-screen pad on touch — to walk. Position is clamped to
   the room, plaques appear when you point at a frame (click pins one).
   Esc or the top bar returns to the desktop. */

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr } from "@react-three/drei";
import { Gallery3D } from "@/components/archive/OfficeGallery";
import { paletteById, useTheme } from "@/lib/theme-store";
import { useOs } from "@/lib/os-store";
import { setAmbient } from "@/lib/sound";
import { PixelIcon } from "@/components/os/PixelIcons";

/* movement state shared between DOM controls and the 3D rig */
const pressed = new Set<string>();
const KEY_MAP: Record<string, string> = {
  arrowup: "fwd", w: "fwd",
  arrowdown: "back", s: "back",
  arrowleft: "left", a: "left",
  arrowright: "right", d: "right",
};

const BOUNDS = { minX: -9.2, maxX: 9.2, minZ: -0.4, maxZ: 6.6 };
const EYE_Y = 0; // floor is at -2.2 in the room → ~2.2 units of eye height

function FirstPersonRig({ look }: { look: React.RefObject<{ yaw: number; pitch: number }> }) {
  const pos = useRef(new THREE.Vector3(0, EYE_Y, 5.8));
  useFrame(({ camera }, dt) => {
    const l = look.current!;
    const speed = 4.2;
    let fwd = 0;
    let strafe = 0;
    if (pressed.has("fwd")) fwd += 1;
    if (pressed.has("back")) fwd -= 1;
    if (pressed.has("left")) strafe -= 1;
    if (pressed.has("right")) strafe += 1;
    if (fwd !== 0 || strafe !== 0) {
      const len = Math.hypot(fwd, strafe);
      const sin = Math.sin(l.yaw);
      const cos = Math.cos(l.yaw);
      // camera faces -z at yaw 0; forward moves where you look
      pos.current.x += ((-sin * fwd) + cos * strafe) * (speed * dt) / len;
      pos.current.z += ((-cos * fwd) + -sin * strafe) * (speed * dt) / len;
      pos.current.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, pos.current.x));
      pos.current.z = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, pos.current.z));
    }
    camera.position.copy(pos.current);
    camera.rotation.set(l.pitch, l.yaw, 0, "YXZ");
  });
  return null;
}

/* the rest of the room around the exhibit wall */
function RoomShell() {
  return (
    <group>
      {/* ceiling */}
      <mesh position={[0, 3.1, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 10]} />
        <meshStandardMaterial color="#e4e0d6" roughness={0.9} />
      </mesh>
      {/* back wall (behind you when you enter) */}
      <mesh position={[0, 0.4, 7.4]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[22, 7]} />
        <meshStandardMaterial color="#e9e5dc" roughness={0.9} />
      </mesh>
      {/* side walls */}
      <mesh position={[-10.8, 0.4, 2.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 7]} />
        <meshStandardMaterial color="#e9e5dc" roughness={0.9} />
      </mesh>
      <mesh position={[10.8, 0.4, 2.5]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 7]} />
        <meshStandardMaterial color="#e9e5dc" roughness={0.9} />
      </mesh>
      {/* a bench in the middle, like every real gallery */}
      <group position={[0, -1.9, 3.2]}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[2.4, 0.14, 0.7]} />
          <meshStandardMaterial color="#8a7f6e" roughness={0.6} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 0.1, 0]}>
            <boxGeometry args={[0.16, 0.34, 0.6]} />
            <meshStandardMaterial color="#6e6455" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function PadButton({ dir, label }: { dir: string; label: string }) {
  return (
    <button
      aria-label={`walk ${dir}`}
      onPointerDown={(e) => {
        e.preventDefault();
        pressed.add(dir);
      }}
      onPointerUp={() => pressed.delete(dir)}
      onPointerLeave={() => pressed.delete(dir)}
      className="bevel-out grid h-11 w-11 select-none place-items-center bg-panel font-mono text-sm text-starlight active:bevel-in"
    >
      {label}
    </button>
  );
}

export function GallerySpace() {
  const exitSpace = useOs((s) => s.exitSpace);
  const cosmos = useTheme((s) => paletteById(s.themeId).tokens.cosmos);
  const look = useRef({ yaw: 0, pitch: 0 });
  const dragging = useRef(false);
  const lastPointer = useRef<[number, number]>([0, 0]);

  useEffect(() => {
    setAmbient("gallery");
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        exitSpace();
        return;
      }
      const dir = KEY_MAP[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        pressed.add(dir);
      }
    };
    const up = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key.toLowerCase()];
      if (dir) pressed.delete(dir);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      pressed.clear();
    };
  }, [exitSpace]);

  return (
    <div className="fixed inset-0 z-[60] bg-cosmos" aria-label="Walkable gallery space">
      <div
        className="absolute inset-0"
        onPointerDown={(e) => {
          dragging.current = true;
          lastPointer.current = [e.clientX, e.clientY];
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const [lx, ly] = lastPointer.current;
          look.current.yaw -= (e.clientX - lx) * 0.0042;
          look.current.pitch = Math.max(
            -0.65,
            Math.min(0.65, look.current.pitch - (e.clientY - ly) * 0.0035),
          );
          lastPointer.current = [e.clientX, e.clientY];
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerLeave={() => {
          dragging.current = false;
        }}
      >
        <Canvas dpr={[1, 1.75]} camera={{ position: [0, EYE_Y, 5.8], fov: 62 }} gl={{ antialias: true }}>
          <AdaptiveDpr pixelated />
          <color attach="background" args={[cosmos]} />
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#fff6e8", "#5a544a", 0.5]} />
          <Gallery3D />
          <RoomShell />
          <FirstPersonRig look={look} />
        </Canvas>
      </div>

      {/* crosshair */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-starlight/70 mix-blend-difference" />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="bevel-out flex items-center gap-2 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-starlight">
          <PixelIcon id="gallery" className="h-4 w-4 shrink-0" />
          The Gallery — drag to look · WASD to walk · point at a print for its story
        </span>
        <button
          onClick={exitSpace}
          data-cursor="hand"
          className="bevel-out bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-starlight active:bevel-in"
        >
          ← desktop (Esc)
        </button>
      </div>

      {/* touch walk pad */}
      <div className="absolute bottom-5 left-5 grid grid-cols-3 gap-1 sm:hidden" aria-label="Walk controls">
        <span />
        <PadButton dir="fwd" label="▲" />
        <span />
        <PadButton dir="left" label="◀" />
        <PadButton dir="back" label="▼" />
        <PadButton dir="right" label="▶" />
      </div>
    </div>
  );
}
