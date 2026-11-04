"use client";

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  Box,
  Label,
  makeTexture,
  useSurfaces,
  type Palette,
} from "./DeskMaterials";
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

/** Cloth- and leather-bound journals, each with its own foil title. */
const JOURNALS: ((p: Palette) => {
  cover: string;
  foil: string;
  title: string;
  leather?: boolean;
})[] = [
  (p) => ({ cover: mix(p.red, p.woodDark, 0.35), foil: mix(p.sun, p.light, 0.3), title: DESK.notebookLabel, leather: true }),
  (p) => ({ cover: p.posterMint, foil: p.ink, title: DESK.ideasLabel }),
  (p) => ({ cover: mix(p.paper, p.clay, 0.22), foil: mix(p.red, p.woodDark, 0.2), title: DESK.notebookLabel }),
];

function Hardcover({
  p,
  position,
  rotation,
  cover,
  foil,
  title,
  leather = false,
}: {
  p: Palette;
  position: [number, number, number];
  rotation: number;
  cover: string;
  foil: string;
  title: string;
  leather?: boolean;
}) {
  const s = useSurfaces();
  const w = 1.4,
    h = 0.13,
    d = 0.96;
  const spine = useMemo(
    () =>
      makeTexture(1024, 96, (ctx) => {
        ctx.fillStyle = cover;
        ctx.fillRect(0, 0, 1024, 96);
        // Book cloth weave, or the pebble of leather.
        ctx.globalAlpha = leather ? 0.12 : 0.08;
        ctx.fillStyle = p.ink;
        if (leather)
          for (let i = 0; i < 1600; i++)
            ctx.fillRect((i * 389) % 1024, (i * 131) % 96, 2 + (i % 3), 1 + (i % 2));
        else
          for (let x = 0; x < 1024; x += 3) ctx.fillRect(x, 0, 1, 96);
        // Foil rules and a stamped title.
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = foil;
        for (const x of [56, 64, 960, 968]) ctx.fillRect(x, 14, 2, 68);
        ctx.font = "bold 34px Georgia, serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(title, 512, 50, 760);
        // Worn ends and a rubbed lower edge.
        for (const [x0, x1] of [[0, 40], [1024, 984]]) {
          const rub = ctx.createLinearGradient(x0, 0, x1, 0);
          rub.addColorStop(0, p.paper);
          rub.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = rub;
          ctx.fillRect(0, 0, 1024, 96);
        }
        ctx.globalAlpha = 1;
      }),
    [p, cover, foil, title, leather],
  );
  useEffect(() => () => spine.dispose(), [spine]);
  const board = {
    color: cover,
    roughness: 1,
    roughnessMap: s.tooth,
    bumpMap: s.tooth,
    bumpScale: leather ? 0.14 : 0.08,
    clearcoat: leather ? 0.25 : 0,
    clearcoatRoughness: 0.5,
  };
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Boards overhang the text block on three sides, as real ones do. */}
      {[-1, 1].map((side) => (
        <Box
          key={side}
          pos={[0, side * (h / 2 - 0.008), 0]}
          size={[w, 0.016, d]}
          radius={0.005}
          {...board}
        />
      ))}
      <Box
        pos={[0, 0, -0.012]}
        size={[w - 0.04, h - 0.03, d - 0.05]}
        color={p.paper}
        map={s.pages}
        roughness={0.95}
        radius={0.004}
      />
      {/* A rounded spine with its stamped title. */}
      <Box pos={[0, 0, d / 2 - 0.016]} size={[w, h + 0.004, 0.034]} radius={0.015} {...board} />
      <mesh position={[0, 0, d / 2 + 0.0015]}>
        <planeGeometry args={[w - 0.04, h - 0.012]} />
        <meshStandardMaterial
          map={spine}
          roughness={0.85}
          bumpMap={s.tooth}
          bumpScale={0.06}
          transparent={false}
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
        {JOURNALS.map((book, i) => (
          <Hardcover
            key={i}
            p={p}
            position={[0.8, 0.16 + i * 0.15, 0.05]}
            rotation={i * 0.035 - 0.02}
            {...book(p)}
          />
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
