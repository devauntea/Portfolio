"use client";

import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Box, Label, type Palette } from "./DeskMaterials";
import { MangaStack } from "./DeskMakerObjects";
import { DESK } from "@/data/profile";

function Poster({ p, index }: { p: Palette; index: number }) {
  const art = DESK.room.posters[index];
  const [map, setMap] = useState<THREE.Texture | null>(null);
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    let alive = true;
    const texture = new THREE.TextureLoader().load(art.src, (loaded) => {
      if (!alive) return;
      loaded.colorSpace = THREE.SRGBColorSpace;
      loaded.anisotropy = 4;
      setMap(loaded);
      invalidate();
    });
    return () => {
      alive = false;
      texture.dispose();
    };
  }, [art.src, invalidate]);
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
      />
      <Box
        pos={[0, 0, 0.012]}
        size={[1.55, 1.8, 0.012]}
        color={p.paper}
        radius={0.005}
      />
      {map && (
        <mesh position={[0, 0, 0.024]}>
          <planeGeometry args={[1.42, 1.42 / art.ratio]} />
          <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export function RoomDecor({ p }: { p: Palette }) {
  return (
    <>
      <group position={[-6.4, 2.75, -3.05]}>
        <Box
          pos={[0, 0, 0]}
          size={[4.25, 0.15, 1.3]}
          color={p.wood}
          radius={0.025}
        />
        {[-1.6, 1.6].map((x) => (
          <group key={x}>
            <Box
              pos={[x, -0.35, -0.47]}
              size={[0.06, 0.7, 0.07]}
              color={p.metal}
              metalness={0.8}
            />
            <Box
              pos={[x, -0.1, 0]}
              size={[0.06, 0.08, 1.05]}
              color={p.metal}
              metalness={0.8}
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
