"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Label, useSurfaces, type Palette } from "./DeskMaterials";
import { mix, printTexture } from "./DeskSurfaces";
import { MangaStack } from "./DeskMakerObjects";
import { DESK } from "@/data/profile";

function Poster({ p, index }: { p: Palette; index: number }) {
  const art = DESK.room.posters[index];
  const s = useSurfaces();
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let alive = true;
    let texture: THREE.Texture | null = null;
    new THREE.ImageLoader().load(art.src, (image) => {
      if (!alive) return;
      // Developed as a print: paper warmth, lifted blacks, a little tooth.
      texture = printTexture(image, p);
      setMap(texture);
      invalidate();
    });
    return () => {
      alive = false;
      texture?.dispose();
    };
  }, [art.src, invalidate, p]);
  const printHeight = 1.42 / art.ratio;
  // Ebonised wood: dark stain over real grain, which runs along each rail.
  const rail = {
    color: mix(p.woodDark, p.ink, 0.35),
    map: s.wood,
    tint: true,
    roughness: 1,
    roughnessMap: s.woodSurface,
    bumpMap: s.woodSurface,
    bumpScale: 0.2,
    radius: 0.012,
  };
  return (
    <group
      position={index ? [-1.6, 3.8, -3.7] : [-3.55, 3.7, -3.7]}
      rotation={[0, 0, index ? -0.035 : 0.035]}
    >
      <Box
        pos={[0, 0, -0.03]}
        size={[1.65, 1.9, 0.075]}
        color={p.woodDark}
        radius={0.015}
        roughness={0.9}
      />
      {/* Mat board, with the bevel cut showing its white core. */}
      <Box
        pos={[0, 0, 0.012]}
        size={[1.55, 1.8, 0.012]}
        color={mix(p.paper, p.limewash, 0.4)}
        radius={0.005}
        roughness={1}
        roughnessMap={s.tooth}
        bumpMap={s.tooth}
        bumpScale={0.04}
      />
      <mesh position={[0, 0, 0.0205]}>
        <planeGeometry args={[1.452, printHeight + 0.032]} />
        <meshStandardMaterial color={mix(p.paper, p.light, 0.7)} roughness={0.9} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[side * 0.801, 0, 0.025]} rotation={[0, 0, Math.PI / 2]}>
            <Box pos={[0, 0, 0]} size={[1.9, 0.048, 0.09]} {...rail} />
          </group>
          <Box pos={[0, side * 0.926, 0.025]} size={[1.57, 0.048, 0.09]} {...rail} />
        </group>
      ))}
      {map && (
        <mesh position={[0, 0, 0.024]} receiveShadow>
          <planeGeometry args={[1.42, printHeight]} />
          <meshStandardMaterial map={map} roughness={0.78} envMapIntensity={0.3} />
        </mesh>
      )}
      {/* Glazing: only its reflections are added over the print. */}
      <mesh position={[0, 0, 0.062]}>
        <planeGeometry args={[1.56, 1.81]} />
        <meshStandardMaterial
          color="black"
          roughness={0.08}
          metalness={0}
          envMapIntensity={1.4}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export function RoomDecor({ p }: { p: Palette }) {
  const s = useSurfaces();
  return (
    <>
      <group position={[-6.4, 2.75, -3.05]}>
        <Box
          pos={[0, 0, 0]}
          size={[4.25, 0.15, 1.3]}
          color={p.wood}
          radius={0.025}
          map={s.wood}
          roughness={1}
          roughnessMap={s.woodSurface}
          bumpMap={s.woodSurface}
          bumpScale={0.25}
        />
        {[-1.6, 1.6].map((x) => (
          <group key={x}>
            <Box
              pos={[x, -0.35, -0.47]}
              size={[0.06, 0.7, 0.07]}
              color={p.ink}
              metalness={0.4}
              roughness={1}
              roughnessMap={s.tooth}
              bumpMap={s.tooth}
              bumpScale={0.05}
            />
            <Box
              pos={[x, -0.1, 0]}
              size={[0.06, 0.08, 1.05]}
              color={p.ink}
              metalness={0.4}
              roughness={1}
              roughnessMap={s.tooth}
              bumpMap={s.tooth}
              bumpScale={0.05}
            />
          </group>
        ))}
        {[0, 1, 2].map((i) => (
          <group
            key={i}
            position={[0.8, 0.16 + i * 0.15, 0.05]}
            rotation={[0, i * 0.035, 0]}
          >
            <Box
              pos={[0, 0, 0]}
              size={[1.4, 0.13, 0.96]}
              color={i % 2 ? p.posterMint : p.paper}
              radius={0.009}
            />
            <Label
              text={i === 1 ? DESK.ideasLabel : DESK.notebookLabel}
              p={p}
              pos={[0, 0, 0.486]}
              width={1.25}
              printOnly
            />
          </group>
        ))}
        <Label
          text={DESK.room.shelf}
          p={p}
          printOnly
          pos={[0, -0.015, 0.66]}
          width={2.5}
        />
      </group>
      <MangaStack p={p} />
      <Poster p={p} index={0} />
      <Poster p={p} index={1} />
    </>
  );
}
