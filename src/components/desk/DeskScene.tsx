"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import { ContactShadows, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { DESK } from "@/data/profile";

export type DeskFocus = "desk" | "monitor" | "resume";
type Palette = Record<
  | "paper"
  | "ivory"
  | "shadow"
  | "ink"
  | "muted"
  | "olive"
  | "leaf"
  | "clay"
  | "wood"
  | "woodDark"
  | "metal"
  | "screen"
  | "light",
  string
>;
type SceneProps = {
  focus: DeskFocus;
  reduced: boolean;
  night: boolean;
  onMonitor: () => void;
  onResume: () => void;
  onAbout: () => void;
  onLamp: () => void;
  onReady: () => void;
  onFail: () => void;
};
const colorKeys: (keyof Palette)[] = [
  "paper",
  "ivory",
  "shadow",
  "ink",
  "muted",
  "olive",
  "leaf",
  "clay",
  "wood",
  "woodDark",
  "metal",
  "screen",
  "light",
];

function palette(): Palette {
  const style = getComputedStyle(document.documentElement);
  return Object.fromEntries(
    colorKeys.map((key) => [
      key,
      style
        .getPropertyValue(
          `--desk-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`,
        )
        .trim(),
    ]),
  ) as Palette;
}

function makeTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function woodTexture(p: Palette) {
  return makeTexture(1024, 512, (ctx) => {
    ctx.fillStyle = p.wood;
    ctx.fillRect(0, 0, 1024, 512);
    // Seeded grain: stable across renders, with no external texture downloads.
    let seed = 57;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 1700; i++) {
      const y = rand() * 512;
      ctx.strokeStyle = i % 3 ? p.woodDark : p.ivory;
      ctx.globalAlpha = rand() * 0.12;
      ctx.lineWidth = rand() * 1.8 + 0.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        300,
        y + rand() * 14 - 7,
        600,
        y - rand() * 10,
        1024,
        y + rand() * 12 - 6,
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = p.woodDark;
    [128, 256, 384].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    });
  });
}

function screenTexture(p: Palette) {
  return makeTexture(1200, 860, (ctx) => {
    ctx.fillStyle = p.screen;
    ctx.fillRect(0, 0, 1200, 860);
    ctx.fillStyle = p.ink;
    ctx.fillRect(0, 0, 1200, 56);
    ctx.fillStyle = p.paper;
    ctx.font = "18px monospace";
    ctx.fillText(DESK.screen.system, 30, 36);
    ctx.fillText("●  ONLINE", 1030, 36);
    ctx.fillStyle = p.olive;
    ctx.font = "17px monospace";
    ctx.fillText(DESK.screen.greeting, 62, 145);
    ctx.fillStyle = p.ink;
    ctx.font = "92px Georgia";
    ctx.fillText("Ideas", 58, 280);
    ctx.fillText("made real.", 58, 383);
    ctx.font = "25px sans-serif";
    ctx.fillText("Engineering, imagination", 62, 450);
    ctx.fillText("& everything in between.", 62, 487);
    ctx.save();
    ctx.translate(925, 325);
    ctx.rotate(-0.4);
    ctx.strokeStyle = p.olive;
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 150, 45 + i * 14, i * 0.23, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    DESK.nav.forEach((n, i) => {
      const x = 65 + i * 283;
      ctx.fillStyle = p.olive;
      ctx.beginPath();
      ctx.roundRect(x, 614, 48, 15, 3);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(x, 624, 75, 51, 4);
      ctx.fill();
      ctx.fillStyle = p.ink;
      ctx.font = "21px monospace";
      ctx.fillText(n.label, x, 713);
    });
    ctx.strokeStyle = p.olive;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(0, 780);
    ctx.lineTo(1200, 780);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.ink;
    ctx.font = "17px monospace";
    ctx.fillText(DESK.screen.footer, 34, 823);
    ctx.fillText("DN / 2026", 1010, 823);
  });
}

function labelTexture(
  text: string,
  p: Palette,
  background = p.ivory,
  color = p.ink,
) {
  return makeTexture(512, 96, (ctx) => {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = color;
    ctx.font = "28px monospace";
    ctx.textAlign = "center";
    ctx.fillText(text, 256, 58);
  });
}

function Box({
  pos,
  size,
  color,
  radius = 0.035,
  map,
  roughness = 0.65,
  metalness = 0,
  children,
}: {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  radius?: number;
  map?: THREE.Texture;
  roughness?: number;
  metalness?: number;
  children?: React.ReactNode;
}) {
  return (
    <RoundedBox
      position={pos}
      args={size}
      radius={radius}
      smoothness={3}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial
        color={map ? undefined : color}
        map={map}
        roughness={roughness}
        metalness={metalness}
      />
      {children}
    </RoundedBox>
  );
}

function Label({
  text,
  p,
  pos,
  width = 0.8,
  rotation = [0, 0, 0],
  background,
}: {
  text: string;
  p: Palette;
  pos: [number, number, number];
  width?: number;
  rotation?: [number, number, number];
  background?: string;
}) {
  const tex = useMemo(
    () => labelTexture(text, p, background),
    [text, p, background],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation={rotation}>
      <planeGeometry args={[width, width * 0.1875]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
}

function Cable({
  points,
  p,
}: {
  points: [number, number, number][];
  p: Palette;
}) {
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
    [points],
  );
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 32, 0.025, 7, false]} />
      <meshStandardMaterial color={p.ink} roughness={0.85} />
    </mesh>
  );
}

function CameraRig({ focus, reduced }: Pick<SceneProps, "focus" | "reduced">) {
  const { camera, pointer, invalidate, gl } = useThree();
  const target = useRef(new THREE.Vector3(-1.6, 0.7, -0.5));
  const destination = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    invalidate();
  }, [focus, reduced, invalidate]);
  useEffect(() => {
    const wake = () => invalidate();
    gl.domElement.addEventListener("pointermove", wake);
    return () => gl.domElement.removeEventListener("pointermove", wake);
  }, [gl, invalidate]);
  useFrame((_, delta) => {
    if (focus === "monitor") {
      destination.set(0.35, 2.01, 2.5);
      look.set(0.35, 2.01, -0.33);
    } else if (focus === "resume") {
      destination.set(-2.8, 2.5, 6.6);
      look.set(-2.8, -0.45, 1.3);
    } else {
      destination.set(
        -1.1 + (reduced ? 0 : pointer.x * 0.19),
        4.4 + (reduced ? 0 : pointer.y * 0.08),
        10.8,
      );
      look.set(-1.6, 0.7, -0.5);
    }
    // Demand rendering may have been idle for minutes. Do not let that
    // elapsed time turn the first frame of a camera transition into a jump.
    const amount = reduced ? 1 : 1 - Math.exp(-Math.min(delta, 1 / 30) * 4.8);
    camera.position.lerp(destination, amount);
    target.current.lerp(look, amount);
    camera.lookAt(target.current);
    if (
      camera.position.distanceToSquared(destination) > 0.000001 ||
      target.current.distanceToSquared(look) > 0.000001
    )
      invalidate();
  });
  return null;
}

function Monitor({
  p,
  onClick,
}: {
  p: Palette;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const texture = useMemo(() => screenTexture(p), [p]);
  useEffect(() => () => texture.dispose(), [texture]);
  const [hover, setHover] = useState(false);
  return (
    <group
      position={[0.35, 0, -0.8]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
        setHover(true);
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
        setHover(false);
      }}
    >
      <Box
        pos={[0, 0.2, -0.2]}
        size={[1.75, 0.2, 1.3]}
        color={p.ivory}
        radius={0.13}
      />
      <mesh position={[0, 0.45, -0.35]} castShadow>
        <cylinderGeometry args={[0.37, 0.5, 0.4, 36]} />
        <meshStandardMaterial color={p.ivory} roughness={0.5} />
      </mesh>
      <Box
        pos={[0, 1.91, -0.53]}
        size={[3.48, 2.68, 1.72]}
        color={p.ivory}
        radius={0.24}
      />
      <Box
        pos={[0, 2.01, 0.34]}
        size={[3.08, 2.25, 0.12]}
        color={p.shadow}
        radius={0.16}
      />
      <RoundedBox
        position={[0, 2.01, 0.41]}
        args={[2.91, 2.09, 0.1]}
        radius={0.15}
        smoothness={5}
      >
        <meshStandardMaterial color={p.ink} roughness={0.13} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, 2.01, 0.469]}>
        <planeGeometry args={[2.78, 1.99, 24, 24]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <Label
        text={DESK.computerLabel}
        p={p}
        pos={[-0.36, 0.79, 0.34]}
        width={1.8}
      />
      <mesh position={[1.34, 0.78, 0.354]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 20]} />
        <meshStandardMaterial color={p.olive} />
      </mesh>
      <mesh position={[1.13, 0.78, 0.37]}>
        <sphereGeometry args={[0.023, 12, 12]} />
        <meshBasicMaterial color={p.leaf} />
      </mesh>
      {[-0.7, -0.48, -0.26, -0.04].map((x) => (
        <mesh key={x} position={[x, 0.6, 0.325]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.035, 12]} />
          <meshStandardMaterial color={p.shadow} />
        </mesh>
      ))}
      {Array.from({ length: 12 }, (_, i) => (
        <Box
          key={i}
          pos={[1.748, 1.95, -0.12 - i * 0.075]}
          size={[0.012, 0.74, 0.027]}
          color={p.shadow}
          radius={0.005}
        />
      ))}
      <pointLight
        position={[0, 2, 1]}
        intensity={hover ? 2.5 : 1.3}
        color={p.screen}
        distance={4}
      />
    </group>
  );
}

function Keyboard({ p }: { p: Palette }) {
  return (
    <group position={[0.22, 0.16, 1.25]} rotation={[0.055, 0, 0]}>
      <Box
        pos={[0, 0, 0]}
        size={[3.32, 0.18, 1.12]}
        color={p.ivory}
        radius={0.09}
      />
      <Box
        pos={[0, 0.1, -0.01]}
        size={[3.12, 0.04, 0.96]}
        color={p.shadow}
        radius={0.025}
      />
      {Array.from({ length: 5 }, (_, row) =>
        Array.from({ length: row === 4 ? 10 : 17 }, (_, col) => {
          const x =
            row === 4
              ? -1.4 + col * 0.18 + (col > 3 ? 0.9 : 0)
              : -1.43 + col * 0.178;
          return (
            <Box
              key={`${row}-${col}`}
              pos={[x, 0.16, -0.38 + row * 0.18]}
              size={[0.15, 0.1, 0.145]}
              color={
                col === 0 && row === 0
                  ? p.olive
                  : row === 0
                    ? p.shadow
                    : p.paper
              }
              radius={0.021}
            />
          );
        }),
      )}
      <Box
        pos={[-0.37, 0.16, 0.34]}
        size={[0.98, 0.1, 0.145]}
        color={p.paper}
        radius={0.024}
      />
      <Label
        text="Q W E R T Y U I O P"
        p={p}
        pos={[-0.5, 0.216, -0.19]}
        width={1.8}
        rotation={[-Math.PI / 2, 0, 0]}
        background={p.paper}
      />
    </group>
  );
}

function Drawer({
  p,
  focus,
  reduced,
  onClick,
  wood,
}: {
  p: Palette;
  focus: DeskFocus;
  reduced: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  wood: THREE.Texture;
}) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [focus, invalidate]);
  useFrame((_, dt) => {
    if (!ref.current) return;
    const goal = focus === "resume" ? 1.05 : 0;
    ref.current.position.z = reduced
      ? goal
      : THREE.MathUtils.damp(
          ref.current.position.z,
          goal,
          6,
          Math.min(dt, 1 / 30),
        );
    if (Math.abs(ref.current.position.z - goal) > 0.001) invalidate();
  });
  return (
    <group
      position={[-3.5, 0, 0.25]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Box
        pos={[0, -1.52, 0]}
        size={[2.35, 2.85, 3.7]}
        color={p.wood}
        map={wood}
        radius={0.05}
      />
      <Box
        pos={[0, -0.84, 1.87]}
        size={[2.16, 1.43, 0.05]}
        color={p.ink}
        radius={0.02}
      />
      <Box
        pos={[0, -2.25, 1.9]}
        size={[2.15, 1.25, 0.12]}
        color={p.wood}
        map={wood}
        radius={0.03}
      />
      <Box
        pos={[0, -1.88, 2.01]}
        size={[0.6, 0.055, 0.09]}
        color={p.metal}
        metalness={0.8}
        radius={0.025}
      />
      <group ref={ref}>
        <Box pos={[0, -1.4, 0.7]} size={[2.04, 0.1, 2.5]} color={p.woodDark} />
        <Box
          pos={[-0.98, -0.87, 0.7]}
          size={[0.08, 1.1, 2.5]}
          color={p.woodDark}
        />
        <Box
          pos={[0.98, -0.87, 0.7]}
          size={[0.08, 1.1, 2.5]}
          color={p.woodDark}
        />
        {Array.from({ length: 7 }, (_, i) => (
          <group
            key={i}
            position={[0, -0.49, -0.2 + i * 0.26]}
            rotation={[-0.12, 0, 0]}
          >
            <Box
              pos={[0, 0, 0]}
              size={[1.85, 1.1, 0.045]}
              color={i % 3 === 0 ? p.olive : p.ivory}
              radius={0.012}
            />
            <Box
              pos={[-0.56 + (i % 3) * 0.5, 0.57, 0]}
              size={[0.45, 0.14, 0.045]}
              color={i % 3 === 0 ? p.olive : p.ivory}
              radius={0.02}
            />
          </group>
        ))}
        <Box
          pos={[0, -0.84, 1.94]}
          size={[2.15, 1.43, 0.15]}
          color={p.wood}
          map={wood}
          radius={0.035}
        />
        <Box
          pos={[0, -0.5, 2.06]}
          size={[0.67, 0.07, 0.12]}
          color={p.metal}
          metalness={0.8}
          radius={0.025}
        />
        <Label
          text={DESK.fileLabel}
          p={p}
          pos={[0, -0.85, 2.025]}
          width={0.9}
        />
      </group>
    </group>
  );
}

function Plant({ p }: { p: Palette }) {
  return (
    <group position={[-4.48, 0.1, -1.6]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.37, 0.28, 0.64, 36]} />
        <meshStandardMaterial color={p.clay} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.035, 32]} />
        <meshStandardMaterial color={p.woodDark} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => {
        const angle = i * 2.4,
          height = 0.5 + (i % 4) * 0.16;
        const x = Math.cos(angle) * 0.32,
          z = Math.sin(angle) * 0.3;
        return (
          <group key={i}>
            <mesh
              position={[x / 2, 0.65 + height / 2, z / 2]}
              rotation={[Math.sin(angle) * 0.3, 0, -Math.cos(angle) * 0.3]}
            >
              <cylinderGeometry args={[0.013, 0.018, height, 6]} />
              <meshStandardMaterial color={p.olive} />
            </mesh>
            <mesh
              position={[x, 0.65 + height, z]}
              rotation={[0.6 + i * 0.2, angle, 0.6]}
              scale={[0.14, 0.36, 0.045]}
              castShadow
            >
              <sphereGeometry args={[1, 12, 10]} />
              <meshStandardMaterial
                color={i % 2 ? p.olive : p.leaf}
                roughness={0.8}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function Lamp({
  p,
  night,
  onClick,
}: {
  p: Palette;
  night: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group
      position={[3.65, 0.1, -1.65]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.59, 0.18, 48]} />
        <meshStandardMaterial color={p.olive} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 2.2, 16]} />
        <meshStandardMaterial
          color={p.metal}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <group position={[-0.24, 2.34, 0]} rotation={[0, 0, 0.22]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.24, 0.69, 0.52, 48, 1, true]} />
          <meshStandardMaterial
            color={p.olive}
            roughness={0.38}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.255, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.65, 48]} />
          <meshBasicMaterial color={night ? p.light : p.paper} />
        </mesh>
        <pointLight
          position={[0, -0.35, 0]}
          color={p.light}
          intensity={night ? 24 : 5}
          distance={7}
          decay={2}
        />
      </group>
    </group>
  );
}

function CameraObject({
  p,
  onClick,
}: {
  p: Palette;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  return (
    <group
      position={[3.45, 0.38, 1.12]}
      rotation={[0, -0.22, 0]}
      onClick={onClick}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "";
      }}
    >
      <Box
        pos={[0, 0, 0]}
        size={[0.91, 0.53, 0.38]}
        color={p.metal}
        metalness={0.6}
        radius={0.06}
      />
      <Box
        pos={[0, -0.04, 0.2]}
        size={[0.88, 0.28, 0.015]}
        color={p.ink}
        radius={0.01}
      />
      <mesh
        position={[0.13, -0.025, 0.3]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.23, 0.23, 0.23, 32]} />
        <meshStandardMaterial color={p.ink} metalness={0.5} roughness={0.25} />
      </mesh>
      <mesh position={[0.13, -0.025, 0.42]}>
        <circleGeometry args={[0.16, 32]} />
        <meshPhysicalMaterial
          color={p.olive}
          metalness={0.7}
          roughness={0.1}
          clearcoat={1}
        />
      </mesh>
      <Box
        pos={[-0.29, 0.17, 0.21]}
        size={[0.17, 0.09, 0.015]}
        color={p.paper}
        radius={0.01}
      />
      <mesh position={[-0.25, 0.29, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.06, 16]} />
        <meshStandardMaterial color={p.ink} />
      </mesh>
    </group>
  );
}

function World(props: SceneProps) {
  const p = useMemo(palette, []);
  const wood = useMemo(() => woodTexture(p), [p]);
  const { gl } = useThree();
  useEffect(() => {
    props.onReady();
    return () => {
      document.body.style.cursor = "";
      wood.dispose();
    };
  }, [props.onReady, wood]);
  useEffect(() => {
    const failed = (event: Event) => {
      event.preventDefault();
      props.onFail();
    };
    gl.domElement.addEventListener("webglcontextlost", failed);
    return () => gl.domElement.removeEventListener("webglcontextlost", failed);
  }, [gl, props.onFail]);
  const click = (fn: () => void) => (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "";
    fn();
  };
  const active = props.focus === "desk";
  return (
    <>
      <color attach="background" args={[props.night ? p.shadow : p.paper]} />
      <fog attach="fog" args={[props.night ? p.shadow : p.paper, 18, 40]} />
      <ambientLight intensity={props.night ? 0.5 : 0.75} color={p.paper} />
      <hemisphereLight args={[p.paper, p.woodDark, props.night ? 0.8 : 1.1]} />
      <directionalLight
        position={[-4, 8, 5]}
        intensity={props.night ? 0.7 : 2.8}
        color={p.light}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-normalBias={0.035}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />
      <directionalLight position={[5, 4, -2]} intensity={0.7} color={p.paper} />
      <CameraRig focus={props.focus} reduced={props.reduced} />
      <Box
        pos={[0, -3.08, 0]}
        size={[40, 0.12, 40]}
        color={p.shadow}
        radius={0.01}
      />
      <Box
        pos={[0, 3.4, -4]}
        size={[40, 13, 0.18]}
        color={p.paper}
        radius={0.01}
      />
      <Box pos={[0, -2.75, -3.85]} size={[40, 0.35, 0.1]} color={p.ivory} />
      {/* Recessed wall panel and its sun-washed slats. */}
      <group position={[5.9, 4.2, -3.75]} rotation={[0, 0, -0.13]}>
        <Box pos={[0, 0, 0]} size={[3.7, 4.5, 0.14]} color={p.ivory} />
        {Array.from({ length: 11 }, (_, i) => (
          <Box
            key={i}
            pos={[0, -1.9 + i * 0.38, 0.18]}
            size={[3.7, 0.08, 0.35]}
            color={p.paper}
            radius={0.01}
          />
        ))}
      </group>
      <Box
        pos={[0, 0, 0]}
        size={[11.2, 0.25, 5.65]}
        color={p.wood}
        map={wood}
        radius={0.065}
      />
      <Box
        pos={[4.78, -1.52, 1.5]}
        size={[0.17, 2.85, 0.17]}
        color={p.ink}
        radius={0.02}
      />
      <Box
        pos={[4.78, -1.52, -2.1]}
        size={[0.17, 2.85, 0.17]}
        color={p.ink}
        radius={0.02}
      />
      <Box
        pos={[4.78, -2.83, -0.3]}
        size={[0.19, 0.14, 3.8]}
        color={p.ink}
        radius={0.02}
      />
      <Drawer
        p={p}
        focus={props.focus}
        reduced={props.reduced}
        onClick={click(props.onResume)}
        wood={wood}
      />
      {/* A stitched desk mat gives the peripherals a quiet visual boundary. */}
      <Box
        pos={[0.65, 0.145, 0.9]}
        size={[5.45, 0.024, 2.55]}
        color={p.olive}
        radius={0.07}
      />
      <Monitor p={p} onClick={click(props.onMonitor)} />
      <Keyboard p={p} />
      <group position={[2.52, 0.27, 1.3]} rotation={[0, -0.16, 0]}>
        <mesh castShadow scale={[0.27, 0.14, 0.43]}>
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color={p.ivory} roughness={0.45} />
        </mesh>
        <Box
          pos={[0, 0.13, -0.08]}
          size={[0.025, 0.015, 0.15]}
          color={p.shadow}
          radius={0.005}
        />
      </group>
      <Cable
        p={p}
        points={[
          [2.52, 0.21, 0.9],
          [2.7, 0.18, 0.3],
          [2.4, 0.18, -0.7],
          [1.4, 0.18, -1.4],
        ]}
      />
      <Cable
        p={p}
        points={[
          [0.2, 0.23, 0.65],
          [0.1, 0.2, 0.1],
          [-0.5, 0.16, -0.1],
          [-0.7, 0.16, -0.7],
        ]}
      />
      <group position={[-2.5, 1.08, -1.55]}>
        <Box
          pos={[0, 0, 0]}
          size={[1.05, 1.92, 1.83]}
          color={p.ivory}
          radius={0.1}
        />
        <Box
          pos={[0, 0.47, 0.93]}
          size={[0.84, 0.22, 0.03]}
          color={p.shadow}
          radius={0.018}
        />
        <Box
          pos={[0, 0.47, 0.95]}
          size={[0.64, 0.025, 0.02]}
          color={p.ink}
          radius={0.004}
        />
        <Box
          pos={[0, 0.05, 0.93]}
          size={[0.83, 0.21, 0.03]}
          color={p.shadow}
          radius={0.018}
        />
        <Box
          pos={[0, 0.05, 0.95]}
          size={[0.48, 0.055, 0.02]}
          color={p.ink}
          radius={0.004}
        />
        <mesh position={[0.27, -0.3, 0.96]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.065, 0.065, 0.025, 20]} />
          <meshStandardMaterial color={p.olive} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <Box
            key={i}
            pos={[0, -0.56 - i * 0.045, 0.94]}
            size={[0.56, 0.013, 0.012]}
            color={p.shadow}
            radius={0.003}
          />
        ))}
      </group>
      <Plant p={p} />
      <Lamp p={p} night={props.night} onClick={click(props.onLamp)} />
      <CameraObject p={p} onClick={click(props.onAbout)} />
      {/* A handmade mug and well-used notebooks echo the owner's offline interests. */}
      <group position={[-2.5, 0.15, 1.45]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.25, 0.23, 0.48, 40, 1, true]} />
          <meshStandardMaterial
            color={p.clay}
            roughness={0.72}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, 0.455, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.225, 32]} />
          <meshStandardMaterial color={p.woodDark} roughness={0.2} />
        </mesh>
        <mesh position={[-0.25, 0.27, 0]}>
          <torusGeometry args={[0.16, 0.045, 10, 24]} />
          <meshStandardMaterial color={p.clay} />
        </mesh>
      </group>
      <group position={[3.5, 0.24, -0.1]} rotation={[0, -0.17, 0]}>
        <Box
          pos={[0, 0, 0]}
          size={[1.45, 0.17, 1.9]}
          color={p.clay}
          radius={0.025}
        />
        <Box
          pos={[0, 0.12, -0.08]}
          size={[1.3, 0.07, 1.65]}
          color={p.paper}
          radius={0.014}
        />
        <Label
          text={DESK.notebookLabel}
          p={p}
          pos={[0, 0.161, -0.08]}
          rotation={[-Math.PI / 2, 0, 0]}
          width={1.07}
          background={p.paper}
        />
        <Box
          pos={[0.45, 0.2, -0.25]}
          size={[0.035, 0.035, 1.2]}
          color={p.olive}
          radius={0.012}
        />
      </group>
      <group position={[-4.2, 0.19, 0.52]} rotation={[0, 0.11, 0]}>
        <Box
          pos={[0, 0, 0]}
          size={[1.35, 0.07, 1.78]}
          color={p.olive}
          radius={0.025}
        />
        <Box
          pos={[0, 0.065, -0.02]}
          size={[1.2, 0.055, 1.6]}
          color={p.ivory}
          radius={0.012}
        />
        <Label
          text={DESK.ideasLabel}
          p={p}
          pos={[0, 0.099, -0.05]}
          width={1.02}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      </group>
      <ContactShadows
        position={[0, -2.99, 0]}
        opacity={0.45}
        scale={18}
        blur={2.7}
        far={7}
        resolution={512}
        frames={1}
        color={p.woodDark}
      />
      {active && (
        <>
          <Html position={[0.35, 3.6, -0.4]} center zIndexRange={[5, 0]}>
            <button className="desk-hotspot" onClick={props.onMonitor}>
              <span>01</span>
              {DESK.monitor}
              <b>↗</b>
            </button>
          </Html>
          <Html position={[-3.5, -1.24, 2.36]} center zIndexRange={[5, 0]}>
            <button className="desk-hotspot" onClick={props.onResume}>
              <span>02</span>
              {DESK.files}
              <b>↗</b>
            </button>
          </Html>
          <Html position={[3.7, 2.9, -1.65]} center zIndexRange={[5, 0]}>
            <button
              className="desk-hotspot desk-hotspot--small"
              aria-label={DESK.lamp}
              aria-pressed={props.night}
              onClick={props.onLamp}
            >
              ☼
            </button>
          </Html>
          <Html position={[3.45, 0.65, 1.12]} center zIndexRange={[5, 0]}>
            <button
              className="desk-hotspot desk-hotspot--small"
              aria-label={DESK.photo}
              onClick={props.onAbout}
            >
              03
            </button>
          </Html>
        </>
      )}
    </>
  );
}

export default function DeskScene(props: SceneProps) {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      frameloop="demand"
      camera={{ position: [-1.1, 4.4, 10.8], fov: 43, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
    >
      <World {...props} />
    </Canvas>
  );
}
