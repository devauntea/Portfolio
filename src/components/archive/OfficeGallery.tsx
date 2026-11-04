"use client";

/* Two rooms added in v2:
  , Office: a warm little study for the Resume Folder (the interactive
     folder itself is the DOM panel; this is its lamplit habitat).
  , Gallery3D: a lit exhibition wall of six framed prints (drei
     GradientTexture placeholders). The camera rides a rail past them
     (see CameraRig); clicking a frame sets `focus` in the scroll store
     and the camera glides in. Plaques are drei Html, shown on focus
     or hover. */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { GradientTexture, Html } from "@react-three/drei";
import { GALLERY, type GalleryFrame as GalleryFrameDef } from "@/data/profile";
import { useArchive } from "@/lib/scroll-store";

/* ---------- the office ---------- */

export function Office() {
  const shade = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (shade.current)
      shade.current.intensity = 5.2 + Math.sin(clock.elapsedTime * 0.8) * 0.35;
  });
  return (
    <group>
      {/* rug + floor pool of light */}
      <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.4, 12]} />
        <meshStandardMaterial color="#2b2016" flatShading />
      </mesh>
      <mesh position={[0, -1.53, 0.4]} rotation={[-Math.PI / 2, 0, 0.3]}>
        <planeGeometry args={[3.4, 2.2]} />
        <meshStandardMaterial color="#5a3f28" flatShading />
      </mesh>
      {/* desk */}
      <group position={[0, -0.6, -0.4]}>
        <mesh position={[0, 0.32, 0]}>
          <boxGeometry args={[2.6, 0.12, 1.3]} />
          <meshStandardMaterial color="#7a5230" flatShading />
        </mesh>
        {[[-1.15, -0.5], [1.15, -0.5], [-1.15, 0.5], [1.15, 0.5]].map(([x, z], i) => (
          <mesh key={i} position={[x, -0.14, z]}>
            <boxGeometry args={[0.1, 0.82, 0.1]} />
            <meshStandardMaterial color="#5c4433" flatShading />
          </mesh>
        ))}
        {/* manila folder (decorative twin of the DOM one) */}
        <group position={[-0.35, 0.42, 0.1]} rotation={[0, 0.25, 0]}>
          <mesh>
            <boxGeometry args={[0.9, 0.03, 0.65]} />
            <meshStandardMaterial color="#d8b878" flatShading />
          </mesh>
          <mesh position={[0.02, 0.035, 0]} rotation={[0, 0, 0.06]}>
            <boxGeometry args={[0.9, 0.02, 0.65]} />
            <meshStandardMaterial color="#c9a869" flatShading />
          </mesh>
        </group>
        {/* mug */}
        <mesh position={[0.8, 0.48, -0.25]}>
          <cylinderGeometry args={[0.09, 0.08, 0.18, 8]} />
          <meshStandardMaterial color="#8a5fd6" flatShading />
        </mesh>
        {/* lamp */}
        <group position={[1, 0.38, 0.35]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.12, 0.16, 0.06, 8]} />
            <meshStandardMaterial color="#3a4066" flatShading />
          </mesh>
          <mesh position={[-0.1, 0.35, 0]} rotation={[0, 0, 0.5]}>
            <cylinderGeometry args={[0.025, 0.025, 0.65, 6]} />
            <meshStandardMaterial color="#3a4066" flatShading />
          </mesh>
          <mesh position={[-0.32, 0.6, 0]} rotation={[0, 0, 1.1]}>
            <coneGeometry args={[0.14, 0.22, 8, 1, true]} />
            <meshStandardMaterial color="#c9a869" side={THREE.DoubleSide} flatShading />
          </mesh>
          <pointLight ref={shade} position={[-0.38, 0.52, 0]} color="#ffd9a0" distance={7} decay={1.9} />
        </group>
      </group>
      {/* chair silhouette */}
      <mesh position={[0, -1, 1.1]}>
        <boxGeometry args={[0.7, 0.1, 0.6]} />
        <meshStandardMaterial color="#4a3520" flatShading />
      </mesh>
      <mesh position={[0, -0.55, 1.4]}>
        <boxGeometry args={[0.7, 0.85, 0.1]} />
        <meshStandardMaterial color="#4a3520" flatShading />
      </mesh>
    </group>
  );
}

/* ---------- the 3D gallery ---------- */

export const GALLERY_LAYOUT = {
  count: GALLERY.length,
  x0: -7.5,
  dx: 3,
  y: 0,
  wallZ: -2,
  frameZ: -1.82,
};

export const galleryFrameX = (i: number) => GALLERY_LAYOUT.x0 + i * GALLERY_LAYOUT.dx;

/** The print inside a frame: loads the real photo when the file exists,
    otherwise keeps the gradient placeholder (missing files fail soft, so
    frames fill in one by one as photos land in public/images/gallery). */
function PrintSurface({ f }: { f: GalleryFrameDef }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!f.src) return;
    let alive = true;
    new THREE.TextureLoader().load(
      f.src,
      (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => {}, // 404 → stay on the gradient
    );
    return () => {
      alive = false;
    };
  }, [f.src]);

  if (tex) {
    return (
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[1.5, 1.9]} />
        <meshStandardMaterial map={tex} emissive="#ffffff" emissiveIntensity={0.04} />
      </mesh>
    );
  }
  return (
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[1.5, 1.9]} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.06}>
        <GradientTexture stops={[0, 1]} colors={f.colors} size={128} />
      </meshStandardMaterial>
    </mesh>
  );
}

function GalleryFrame({ index }: { index: number }) {
  const f = GALLERY[index];
  const focus = useArchive((s) => s.focus);
  const setFocus = useArchive((s) => s.setFocus);
  const [hover, setHover] = useState(false);
  const focused = focus === index;
  const showPlaque = focused || hover;

  return (
    <group position={[galleryFrameX(index), GALLERY_LAYOUT.y, GALLERY_LAYOUT.frameZ]}>
      {/* frame + matte + print */}
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          setFocus(focused ? null : index);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.dataset.cursor = "hand";
        }}
        onPointerOut={() => {
          setHover(false);
          delete document.body.dataset.cursor;
        }}
      >
        <boxGeometry args={[1.95, 2.35, 0.09]} />
        <meshStandardMaterial color="#241f1a" flatShading />
      </mesh>
      <mesh position={[0, 0, 0.055]}>
        <planeGeometry args={[1.72, 2.12]} />
        <meshStandardMaterial color="#efece4" />
      </mesh>
      <PrintSurface f={f} />

      {/* plaque */}
      {showPlaque && (
        <Html position={[1.35, -0.4, 0.1]} distanceFactor={6} zIndexRange={[25, 0]}>
          <div className="pointer-events-none w-44 rounded-md border border-seam bg-panel/95 p-2.5 shadow-lg">
            <p className="text-[11px] font-semibold text-starlight">{f.title}</p>
            <p className="mt-0.5 font-mono text-[9px] text-faint">{f.date}</p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-faint">{f.story}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

export function Gallery3D() {
  return (
    <group>
      {/* wall + polished floor */}
      <mesh position={[0, 0.4, GALLERY_LAYOUT.wallZ]}>
        <planeGeometry args={[22, 7]} />
        <meshStandardMaterial color="#efece4" roughness={0.85} />
      </mesh>
      <mesh position={[0, -2.2, 1.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 8.5]} />
        <meshStandardMaterial color="#dad6cd" roughness={0.25} metalness={0.15} />
      </mesh>
      {/* baseboard */}
      <mesh position={[0, -2.05, GALLERY_LAYOUT.wallZ + 0.02]}>
        <boxGeometry args={[22, 0.24, 0.04]} />
        <meshStandardMaterial color="#b8b2a6" />
      </mesh>

      {/* warm gallery spots (one per pair of frames) */}
      {[0, 1, 2].map((i) => (
        <pointLight
          key={i}
          position={[GALLERY_LAYOUT.x0 + 1.5 + i * 6, 2.6, 0.6]}
          color="#ffe9c8"
          intensity={9}
          distance={8}
          decay={1.9}
        />
      ))}

      {GALLERY.map((_, i) => (
        <GalleryFrame key={i} index={i} />
      ))}
    </group>
  );
}
