"use client";

import { useEffect, useMemo } from "react";
import { Box, Label, makeTexture, type Palette } from "./DeskMaterials";
import { MangaStack } from "./DeskMakerObjects";
import { DESK } from "@/data/profile";

function Poster({ p, index }: { p: Palette; index: number }) {
  const art = DESK.room.posters[index];
  const map = useMemo(
    () =>
      makeTexture(600, 800, (ctx) => {
        ctx.fillStyle = index ? p.paper : p.posterRose;
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = p.ink;
        ctx.font = "18px monospace";
        ctx.fillText(art.issue, 35, 42);
        if (index === 0) {
          ctx.fillStyle = p.ink;
          ctx.beginPath();
          ctx.arc(300, 350, 215, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 12; i++) {
            ctx.strokeStyle = i % 2 ? p.paper : p.posterRose;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(
              300,
              350,
              35 + i * 14,
              55 + i * 12,
              0.35,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          }
          ctx.fillStyle = p.posterSand;
          ctx.beginPath();
          ctx.arc(300, 350, 45, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.ink;
          ctx.font = "bold 65px sans-serif";
          ctx.fillText(art.title[0], 35, 664);
          ctx.fillText(art.title[1], 35, 726);
        } else {
          ctx.fillStyle = p.posterMint;
          ctx.fillRect(35, 90, 530, 480);
          ctx.strokeStyle = p.ink;
          ctx.lineWidth = 28;
          for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(80 + i * 65, 140);
            ctx.lineTo(510 - i * 65, 520);
            ctx.stroke();
          }
          ctx.fillStyle = p.paper;
          ctx.beginPath();
          ctx.arc(300, 330, 88, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = p.ink;
          ctx.font = "bold 57px sans-serif";
          ctx.fillText(art.title[0], 35, 650);
          ctx.fillText(art.title[1], 35, 710);
        }
        ctx.font = "15px monospace";
        ctx.fillText(art.subtitle, 35, 770);
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 4000; i++) {
          ctx.fillStyle = i % 2 ? p.ink : p.paper;
          ctx.fillRect((i * 137) % 600, (i * 211) % 800, 1, 1);
        }
      }),
    [p, index, art],
  );
  useEffect(() => () => map.dispose(), [map]);
  return (
    <group
      position={index ? [-1.6, 3.8, -3.7] : [-3.55, 3.7, -3.7]}
      rotation={[0, 0, index ? -0.035 : 0.035]}
    >
      <Box
        pos={[0, 0, -0.03]}
        size={[1.58, 2.08, 0.075]}
        color={p.woodDark}
        radius={0.015}
      />
      <mesh position={[0, 0, 0.015]}>
        <planeGeometry args={[1.48, 1.98]} />
        <meshStandardMaterial map={map} roughness={0.9} />
      </mesh>
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
