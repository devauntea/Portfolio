"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Label, type Palette } from "./DeskMaterials";
import { mix } from "./DeskSurfaces";
import { DESK } from "@/data/profile";

/*
 * A seated tuxedo cat built the way a real brick model is: every part sits
 * on a stud grid with true proportions (a brick is 1.2 × the stud pitch, a
 * plate a third of a brick), neighbouring parts leave a hairline seam, and
 * exposed tops carry studs while finished surfaces get smooth tiles.
 * Everything merges into one mesh per colour.
 */

const S = 0.14; // stud pitch
const B = S * 1.2; // brick height
const P = B / 3; // plate height
const GAP = 0.005;
const STUD_R = S * 0.3;
const STUD_H = S * 0.21;

type Tone =
  | "black"
  | "white"
  | "blush"
  | "iris"
  | "gold"
  | "collar"
  | "plinth"
  | "whisker";

type Vec = [number, number, number];

/** Centre of cat-grid cell i (0..6, left→right) / j (0..5, back→front). */
const cx = (i: number) => (i - 3) * S;
const cz = (j: number) => (j - 2.5) * S;

class Builder {
  parts = new Map<Tone, THREE.BufferGeometry[]>();

  add(tone: Tone, geometry: THREE.BufferGeometry) {
    const list = this.parts.get(tone) ?? [];
    list.push(geometry);
    this.parts.set(tone, list);
  }

  box(tone: Tone, [x, y, z]: Vec, [w, h, d]: Vec, radius = 0.01) {
    const g = new RoundedBoxGeometry(
      w - GAP,
      h - GAP,
      d - GAP,
      1,
      Math.min(radius, (w - GAP) * 0.45, (h - GAP) * 0.45, (d - GAP) * 0.45),
    );
    g.translate(x, y, z);
    this.add(tone, g);
  }

  /** A brick spanning grid cells, from a bottom height. */
  cells(
    tone: Tone,
    [i0, i1]: [number, number],
    [j0, j1]: [number, number],
    bottom: number,
    height: number,
    { studs = false, radius = 0.01 } = {},
  ) {
    const x = (cx(i0) + cx(i1)) / 2,
      z = (cz(j0) + cz(j1)) / 2;
    this.box(
      tone,
      [x, bottom + height / 2, z],
      [(i1 - i0 + 1) * S, height, (j1 - j0 + 1) * S],
      radius,
    );
    if (studs)
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) this.stud(tone, [cx(i), bottom + height, cz(j)]);
  }

  cylinder(
    tone: Tone,
    [x, y, z]: Vec,
    radius: number,
    height: number,
    axis: "x" | "y" | "z" = "y",
    segments = 20,
    scaleX = 1,
  ) {
    const g = new THREE.CylinderGeometry(radius, radius, height, segments).toNonIndexed();
    if (scaleX !== 1) g.scale(scaleX, 1, 1);
    if (axis === "x") g.rotateZ(-Math.PI / 2);
    if (axis === "z") g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    this.add(tone, g);
  }

  /** A stud on a top face (default) or pointing out of a side face. */
  stud(tone: Tone, [x, y, z]: Vec, direction: "up" | "+x" | "-x" | "+z" = "up") {
    const g = new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 14).toNonIndexed();
    g.translate(0, STUD_H / 2, 0);
    if (direction === "+x") g.rotateZ(-Math.PI / 2);
    if (direction === "-x") g.rotateZ(Math.PI / 2);
    if (direction === "+z") g.rotateX(Math.PI / 2);
    g.translate(x, y, z);
    this.add(tone, g);
  }

  /** A triangular prism (ears, nose), apex up unless flipped. */
  wedge(
    tone: Tone,
    [x, y, z]: Vec,
    width: number,
    height: number,
    depth: number,
    { tilt = 0, flip = false } = {},
  ) {
    const shape = new THREE.Shape([
      new THREE.Vector2(-width / 2, 0),
      new THREE.Vector2(width / 2, 0),
      new THREE.Vector2(0, height),
    ]);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 1,
    });
    g.translate(0, 0, -depth / 2);
    if (flip) g.rotateZ(Math.PI);
    g.rotateZ(tilt);
    g.translate(x, y, z);
    this.add(tone, g);
  }

  /** A thin bar from a point along a direction (whiskers). */
  bar(tone: Tone, from: Vec, direction: Vec, length: number, radius: number) {
    const dir = new THREE.Vector3(...direction).normalize();
    const g = new THREE.CylinderGeometry(radius, radius * 0.6, length, 6).toNonIndexed();
    g.translate(0, length / 2, 0);
    g.applyQuaternion(
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir),
    );
    g.translate(...from);
    this.add(tone, g);
  }

  build() {
    return Array.from(this.parts, ([tone, list]) => {
      const geometry = mergeGeometries(list)!;
      list.forEach((g) => g.dispose());
      return { tone, geometry };
    });
  }
}

function buildCat() {
  const b = new Builder();
  const y0 = 2 * P; // top of the display plinth

  // Display plinth (9 × 8), two plates, studs wherever the cat isn't sitting.
  b.box("plinth", [0, P / 2, 0], [9 * S, P, 8 * S], 0.008);
  b.box("plinth", [0, P * 1.5, 0], [9 * S, P, 8 * S], 0.008);
  const occupied = new Set<string>();
  const occupy = (i0: number, i1: number, j0: number, j1: number) => {
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) occupied.add(`${i},${j}`);
  };
  occupy(1, 5, 0, 3); // torso and haunches
  occupy(2, 2, 4, 5); // paws
  occupy(4, 4, 4, 5);
  occupy(3, 3, 4, 4); // bib
  occupy(6, 6, 0, 5); // tail
  occupy(5, 5, 5, 5);
  for (let i = -1; i <= 7; i++)
    for (let j = -1; j <= 6; j++)
      if (!occupied.has(`${i},${j}`)) b.stud("plinth", [cx(i), y0, cz(j)]);

  // Torso: five courses in a running bond so the seams step.
  for (let course = 0; course < 5; course++) {
    const bottom = y0 + course * B;
    const split: [number, number][] = course % 2 ? [[2, 2], [3, 4]] : [[2, 3], [4, 4]];
    split.forEach((span) => b.cells("black", span, [0, 3], bottom, B));
  }
  // Shoulders behind the head stay studded.
  for (let i = 2; i <= 4; i++) b.stud("black", [cx(i), y0 + 5 * B, cz(0)]);

  // Haunches: three courses and a studded plate, with a round hip on each.
  for (const i of [1, 5]) {
    for (let course = 0; course < 3; course++) {
      const split: [number, number][] = course % 2 ? [[0, 0], [1, 3]] : [[0, 1], [2, 3]];
      split.forEach((span) =>
        b.cells("black", [i, i], span, y0 + course * B, B, { radius: 0.02 }),
      );
    }
    b.cells("black", [i, i], [0, 3], y0 + 3 * B, P, { studs: true });
    const side = i === 1 ? -1 : 1;
    const hip: Vec = [side * (2.5 * S + P / 2), y0 + 3 * B + P - 0.2, cz(1.5)];
    b.cylinder("black", hip, 0.18, P, "x", 32);
    // A ring of side studs on the hip, like a round plate built sideways.
    const face = side * (2.5 * S + P);
    b.stud("black", [face, hip[1], hip[2]], side > 0 ? "+x" : "-x");
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + 0.3;
      b.stud(
        "black",
        [face, hip[1] + Math.sin(a) * 0.112, hip[2] + Math.cos(a) * 0.112],
        side > 0 ? "+x" : "-x",
      );
    }
  }

  // White paws with toe grooves; black front legs rise from them.
  for (const i of [2, 4]) {
    b.cells("white", [i, i], [4, 5], y0, 2 * P, { radius: 0.035 });
    for (const dx of [-0.2, 0.2])
      b.box("black", [cx(i) + dx * S, y0 + P, cz(5) + S / 2 + 0.001], [0.012, 1.3 * P, 0.012], 0.002);
    b.cells("black", [i, i], [4, 4], y0 + 2 * P, (3 * B - 2 * P) / 2);
    b.cells("black", [i, i], [4, 4], y0 + 2 * P + (3 * B - 2 * P) / 2, (3 * B - 2 * P) / 2);
  }

  // The tuxedo bib: narrow between the legs, broad across the chest.
  for (let course = 0; course < 3; course++) b.cells("white", [3, 3], [4, 4], y0 + course * B, B);
  b.cells("white", [2, 4], [4, 4], y0 + 3 * B, B);
  b.cells("white", [2, 3], [4, 4], y0 + 4 * B, B);
  b.cells("white", [4, 4], [4, 4], y0 + 4 * B, B);
  const chest = cz(4) + S / 2;
  for (const [dx, dy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]])
    b.stud("white", [dx * S, y0 + 4 * B + dy * S, chest], "+z");
  for (const dy of [-0.5, 0.5]) b.stud("white", [0, y0 + 1.5 * B + dy * S, chest], "+z");

  // Collar and a little gold tag.
  b.box("collar", [0, y0 + 5 * B + P * 0.45, cz(2.5) + 0.016], [3 * S + 0.05, P * 1.2, 4 * S + 0.05], 0.012);
  b.cylinder("gold", [0, y0 + 5 * B - 0.036, chest + 0.036], 0.04, 0.012, "z", 20);
  b.cylinder("gold", [0, y0 + 5 * B + 0.006, chest + 0.034], 0.013, 0.012, "z", 12);

  // Head: two courses, white muzzle and blaze, studded crown, tiled brow.
  const yh = y0 + 5 * B + P;
  b.cells("black", [1, 2], [1, 4], yh, B);
  b.cells("black", [3, 5], [1, 4], yh, B);
  b.cells("black", [1, 1], [5, 5], yh, B);
  b.cells("white", [2, 4], [5, 5], yh, B);
  b.cells("black", [5, 5], [5, 5], yh, B);
  b.cells("black", [1, 3], [1, 4], yh + B, B);
  b.cells("black", [4, 5], [1, 4], yh + B, B);
  b.cells("black", [1, 2], [5, 5], yh + B, B);
  b.cells("white", [3, 3], [5, 5], yh + B, B);
  b.cells("black", [4, 5], [5, 5], yh + B, B);
  const crown = yh + 2 * B;
  b.cells("black", [1, 5], [1, 2], crown, P, { studs: true });
  b.cells("black", [1, 2], [3, 5], crown, P);
  b.cells("white", [3, 3], [3, 5], crown, P);
  b.cells("black", [4, 5], [3, 5], crown, P);
  // Studs on the sides of the head.
  for (const side of [-1, 1])
    for (const j of [2, 3])
      b.stud("black", [side * 2.5 * S, yh + B / 2, cz(j)], side > 0 ? "+x" : "-x");

  // Muzzle, nose, mouth and whiskers.
  const face = cz(5) + S / 2;
  b.box("white", [0, yh + 0.035 + 0.3 * B, face + S * 0.22], [3 * S - 0.02, 0.6 * B, 0.44 * S], 0.03);
  b.wedge("blush", [0, yh + 0.035 + 0.6 * B - 0.004, face + S * 0.44 + 0.006], 0.08, 0.055, 0.016, { flip: true });
  b.box("blush", [0, yh + 0.02, face + S * 0.25], [0.07, 0.022, 0.05], 0.008);
  for (const side of [-1, 1])
    for (const [lift, sweep] of [[0.18, 0.2], [0, 0.28], [-0.16, 0.36]])
      b.bar(
        "whisker",
        [side * 1.3 * S, yh + 0.035 + 0.32 * B, face + S * 0.3],
        [side, lift, sweep],
        0.26,
        0.004,
      );

  // Eyes: a printed round tile — iris, slit pupil, catch-light, heavy lid.
  for (const side of [-1, 1]) {
    const ex = side * S,
      ey = yh + 1.48 * B;
    b.cylinder("black", [ex, ey, face + 0.006], 0.064, 0.012, "z", 28);
    b.cylinder("iris", [ex, ey, face + 0.014], 0.054, 0.01, "z", 28);
    b.cylinder("black", [ex, ey, face + 0.02], 0.03, 0.006, "z", 20, 0.55);
    b.cylinder("white", [ex + side * -0.016, ey + 0.02, face + 0.024], 0.012, 0.004, "z", 12);
    b.box("black", [ex, ey + 0.052, face + 0.014], [0.14, 0.022, 0.026], 0.008);
  }

  // Ears: sloped bricks with pink inner ears, tilted out a touch.
  for (const side of [-1, 1]) {
    const ex = side * 1.5 * S,
      tilt = -side * 0.14;
    b.wedge("black", [ex, crown + P, cz(3)], 2 * S - 0.01, 0.25, 0.8 * S, { tilt });
    b.wedge("blush", [ex + side * 0.006, crown + P + 0.03, cz(3) + 0.4 * S + 0.006], 0.13, 0.14, 0.01, { tilt });
  }

  // The tail curls round the right haunch and rests by the paws, white tip.
  const tail: [number, number][] = [
    [3, -2.5], [3, -1.5], [3, -0.5], [3, 0.5], [3, 1.5], [2.85, 2.4],
  ];
  tail.forEach(([x, z]) => {
    b.cylinder("black", [x * S, y0 + B / 2, z * S], S / 2 - 0.004, B - GAP, "y", 20);
    b.stud("black", [x * S, y0 + B, z * S]);
  });
  b.cylinder("white", [2.05 * S, y0 + B / 2, 2.75 * S], S / 2 - 0.004, B - GAP, "y", 20);
  b.stud("white", [2.05 * S, y0 + B, 2.75 * S]);

  return b.build();
}

export function BrickCat({ p }: { p: Palette }) {
  const parts = useMemo(() => buildCat(), []);
  useEffect(() => () => parts.forEach(({ geometry }) => geometry.dispose()), [parts]);
  const tones: Record<
    Tone,
    { color: string; roughness: number; clearcoat: number; metalness?: number }
  > = {
    black: { color: p.ink, roughness: 0.3, clearcoat: 0.35 },
    white: { color: p.paper, roughness: 0.34, clearcoat: 0.3 },
    blush: { color: p.blush, roughness: 0.32, clearcoat: 0.3 },
    iris: { color: p.iris, roughness: 0.18, clearcoat: 0.6 },
    gold: { color: mix(p.sun, p.light, 0.3), roughness: 0.3, clearcoat: 0.4, metalness: 0.45 },
    collar: { color: mix(p.red, p.blush, 0.35), roughness: 0.4, clearcoat: 0.2 },
    plinth: { color: mix(p.ink, p.shadow, 0.42), roughness: 0.42, clearcoat: 0.2 },
    whisker: { color: mix(p.paper, p.shadow, 0.3), roughness: 0.5, clearcoat: 0 },
  };
  return (
    <group position={[-3.8, 0.125, 0.45]} rotation={[0, 0.16, 0]}>
      {parts.map(({ tone, geometry }) => {
        const { color, roughness, clearcoat, metalness = 0 } = tones[tone];
        return (
          <mesh key={tone} geometry={geometry} castShadow receiveShadow>
            <meshPhysicalMaterial
              color={color}
              roughness={roughness}
              metalness={metalness}
              clearcoat={clearcoat}
              clearcoatRoughness={0.3}
              envMapIntensity={0.85}
            />
          </mesh>
        );
      })}
      {/* Printed nameplate tile on the plinth. */}
      <Label
        text={DESK.details.bricks}
        p={p}
        pos={[0, P, 4 * S + 0.002]}
        width={0.58}
        background={mix(p.paper, p.shadow, 0.25)}
      />
    </group>
  );
}
