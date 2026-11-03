"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  Html,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import {
  Box,
  Label,
  Cable,
  Ring,
  Screw,
  Slots,
  makeTexture,
  surfaceTexture,
  type Palette,
} from "./DeskMaterials";
import {
  DetailedKeyboard,
  DetailedTower,
  DeskMat,
  Pottery,
} from "./DeskObjects";
import { DeskWindow, WINDOW } from "./DeskWindow";
import { BrickDisplay, SewingMachine } from "./DeskMakerObjects";
import { RoomDecor } from "./DeskRoomDecor";
import { DeskSpeakers } from "./DeskMedia";
import { ComputerScreen, type ComputerSection } from "./ComputerScreen";
import { DeskCamera } from "./DeskCamera";
import { DESK } from "@/data/profile";

export type DeskFocus = "desk" | "monitor" | "resume" | "music" | "camera";
type SceneProps = {
  focus: DeskFocus;
  section: ComputerSection;
  onSection: (section: ComputerSection) => void;
  onClose: () => void;
  musicRequest: number;
  musicActive: boolean;
  onMusic: () => void;
  onGames: () => void;
  reduced: boolean;
  night: boolean;
  onMonitor: () => void;
  onResume: () => void;
  onCamera: () => void;
  cameraReady: boolean;
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
  "accent",
  "accentLight",
  "clay",
  "wood",
  "woodDark",
  "metal",
  "screen",
  "light",
  "foliage",
  "foliageLight",
  "blue",
  "red",
  "sky",
  "skyNight",
  "horizon",
  "city",
  "brick",
  "limestone",
  "windowGlass",
  "posterRose",
  "posterMint",
  "posterSand",
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

function woodTexture(p: Palette) {
  return makeTexture(2048, 1024, (ctx) => {
    ctx.fillStyle = p.wood;
    ctx.fillRect(0, 0, 2048, 1024);
    // Broad walnut ribbons under fine grain: varied boards, never ruled stripes.
    let seed = 57;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let board = 0; board < 5; board++) {
      const top = board * 205;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, 2048, 205);
      ctx.clip();
      const wash = ctx.createLinearGradient(0, top, 0, top + 205);
      wash.addColorStop(0, p.woodDark);
      wash.addColorStop(0.4, p.clay);
      wash.addColorStop(1, p.wood);
      ctx.globalAlpha = 0.14 + board * 0.008;
      ctx.fillStyle = wash;
      ctx.fillRect(0, top, 2048, 205);
      const knotX = 370 + (board % 3) * 530;
      for (let i = 0; i < 680; i++) {
        const y = top - 25 + rand() * 255;
        ctx.strokeStyle = i % 4 ? p.woodDark : p.clay;
        ctx.globalAlpha = 0.025 + rand() * 0.055;
        ctx.lineWidth = 0.35 + rand() * 1.4;
        ctx.beginPath();
        for (let x = 0; x <= 2048; x += 12) {
          const wave = Math.sin(x / 310 + y / 120) * 5;
          const knot =
            Math.exp(-(((x - knotX) / 270) ** 2)) *
            Math.sin((y - top - 90) / 58) *
            38;
          const yy = y + wave + knot;
          if (x === 0) ctx.moveTo(x, yy);
          else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.restore();
      if (board) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = p.woodDark;
        ctx.fillRect(0, top, 2048, 1);
      }
    }
    ctx.globalAlpha = 1;
  });
}

function screenTexture(p: Palette) {
  return makeTexture(1200, 860, (ctx) => {
    ctx.fillStyle = p.ink;
    ctx.fillRect(0, 0, 1200, 860);
    ctx.fillStyle = p.paper;
    ctx.font = "22px monospace";
    ctx.fillText(DESK.computer.title, 50, 60);
    ctx.fillText(DESK.computer.edition, 780, 60);
    ctx.strokeStyle = p.muted;
    ctx.beginPath();
    ctx.moveTo(50, 90);
    ctx.lineTo(1150, 90);
    ctx.stroke();
    ctx.font = "bold 110px sans-serif";
    ctx.fillText(DESK.computer.standby[0], 50, 280);
    ctx.fillText(DESK.computer.standby[1], 50, 395);
    ctx.font = "25px monospace";
    ctx.fillText(DESK.computer.idleNote, 55, 475);
    DESK.computer.apps.slice(0, 3).forEach((app, i) => {
      const x = 55 + i * 370;
      ctx.fillStyle = [p.posterMint, p.posterRose, p.posterSand][i];
      ctx.beginPath();
      ctx.roundRect(x, 560, 335, 190, 14);
      ctx.fill();
      ctx.fillStyle = p.ink;
      ctx.font = "65px sans-serif";
      ctx.fillText(app.symbol, x + 25, 643);
      ctx.font = "bold 30px sans-serif";
      ctx.fillText(app.label.toUpperCase(), x + 25, 713);
    });
    ctx.fillStyle = p.paper;
    ctx.font = "18px monospace";
    ctx.fillText(DESK.computer.idleLinks, 55, 812);
  });
}

function CameraRig({ focus, reduced }: Pick<SceneProps, "focus" | "reduced">) {
  const { camera, pointer, invalidate, gl, size } = useThree();
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
      destination.set(0.35, 2.12, 4.1);
      look.set(0.35, 2.01, -0.24);
    } else if (focus === "camera") {
      destination.set(0, 2.3, 8.5);
      look.set(0, 2.3, 0);
    } else if (focus === "music") {
      destination.set(
        -1.1,
        3.8,
        9.4 + Math.max(0, 1.6 - size.width / size.height) * 12,
      );
      look.set(-0.8, 1.2, -0.5);
    } else if (focus === "resume") {
      destination.set(-2.8, 2.5, 6.6);
      look.set(-2.8, -0.45, 1.3);
    } else {
      // Keep the maker’s tools in frame on narrower landscape displays.
      const extraDistance = Math.max(0, 1.6 - size.width / size.height) * 17;
      destination.set(
        -1.1 + (reduced ? 0 : pointer.x * 0.19),
        4.4 + extraDistance * 0.2 + (reduced ? 0 : pointer.y * 0.08),
        10.8 + extraDistance,
      );
      look.set(-1.6 - extraDistance * 0.1, 0.7, -0.5);
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
  plastic,
  screen,
  onClick,
}: {
  p: Palette;
  plastic: THREE.Texture;
  screen: ReactNode;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const texture = useMemo(() => screenTexture(p), [p]);
  const glass = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2.78, 1.99, 40, 32);
    const vertices = geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      let x = vertices.getX(i),
        y = vertices.getY(i);
      const cornerX = Math.max(Math.abs(x) - 1.27, 0);
      const cornerY = Math.max(Math.abs(y) - 0.875, 0);
      const length = Math.hypot(cornerX, cornerY);
      if (length > 0.12) {
        x = Math.sign(x) * (1.27 + (cornerX / length) * 0.12);
        y = Math.sign(y) * (0.875 + (cornerY / length) * 0.12);
      }
      vertices.setXYZ(
        i,
        x,
        y,
        0.09 * (1 - (x / 1.39) ** 2) * (1 - (y / 0.995) ** 2),
      );
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(
    () => () => {
      texture.dispose();
      glass.dispose();
    },
    [texture, glass],
  );
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
        bumpMap={plastic}
        bumpScale={0.0008}
      />
      <Box
        pos={[0, 1.91, 0.25]}
        size={[3.47, 2.67, 0.18]}
        color={p.shadow}
        radius={0.08}
      />
      <Box
        pos={[0, 1.91, 0.285]}
        size={[3.46, 2.66, 0.16]}
        color={p.ivory}
        radius={0.07}
        roughness={0.54}
        bumpMap={plastic}
        bumpScale={0.0006}
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
      <mesh position={[0, 2.01, 0.469]} geometry={glass}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.01, 0.471]} geometry={glass}>
        <meshPhysicalMaterial
          color={p.paper}
          transparent
          opacity={0.085}
          roughness={0.09}
          metalness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.08}
          depthWrite={false}
        />
      </mesh>
      {screen && (
        <Html
          transform
          position={[0, 2.01, 0.566]}
          distanceFactor={1.1583}
          zIndexRange={[7, 1]}
          wrapperClass="crt-html"
          pointerEvents="auto"
        >
          {screen}
        </Html>
      )}
      <Label
        text={DESK.computerLabel}
        printOnly
        p={p}
        pos={[-0.36, 0.79, 0.372]}
        width={1.8}
      />
      <mesh position={[1.34, 0.78, 0.385]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.065, 0.065, 0.04, 20]} />
        <meshStandardMaterial color={p.accent} />
      </mesh>
      <mesh position={[1.13, 0.78, 0.39]}>
        <sphereGeometry args={[0.023, 12, 12]} />
        <meshBasicMaterial color={p.accentLight} />
      </mesh>
      {[-0.7, -0.48, -0.26, -0.04].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.035, 12]} />
          <meshStandardMaterial color={p.shadow} />
        </mesh>
      ))}
      <Slots
        positions={Array.from(
          { length: 12 },
          (_, i) =>
            [1.748, 1.95, -0.12 - i * 0.075] as [number, number, number],
        )}
        size={[0.012, 0.74, 0.027]}
        color={p.shadow}
      />
      <Slots
        positions={Array.from(
          { length: 16 },
          (_, i) =>
            [-1.25 + i * 0.165, 3.253, -0.64] as [number, number, number],
        )}
        size={[0.07, 0.006, 0.55]}
        color={p.shadow}
      />
      <Label
        text={DESK.details.monitor}
        printOnly
        p={p}
        pos={[0.62, 0.68, 0.378]}
        width={0.95}
      />
      {[-1.52, 1.52].map((x) => (
        <Screw key={x} p={p} pos={[x, 0.69, 0.372]} scale={0.7} />
      ))}
      <Ring
        pos={[0, 0.32, -0.35]}
        radius={0.43}
        tube={0.016}
        color={p.shadow}
      />
      <pointLight
        position={[0, 2, 1]}
        intensity={hover ? 2.5 : 1.3}
        color={p.screen}
        distance={4}
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
    const goal = focus === "resume" ? 1.55 : 0;
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
      {[-1.12, 1.12].map((x) => (
        <Box
          key={x}
          pos={[x, -1.52, 0]}
          size={[0.12, 2.85, 3.7]}
          color={p.wood}
          map={wood}
          radius={0.025}
        />
      ))}
      <Box
        pos={[0, -1.52, -1.8]}
        size={[2.16, 2.85, 0.13]}
        color={p.woodDark}
        radius={0.02}
      />
      <Box
        pos={[0, -2.9, 0]}
        size={[2.2, 0.1, 3.7]}
        color={p.wood}
        map={wood}
        radius={0.02}
      />
      <Box
        pos={[0, -0.84, -1.72]}
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
        <Box
          pos={[0, -0.87, -0.57]}
          size={[2.02, 1.1, 0.08]}
          color={p.woodDark}
          radius={0.015}
        />
        {[-1.025, 1.025].map((x) => (
          <group key={x}>
            <Box
              pos={[x, -1.1, 0.4]}
              size={[0.025, 0.14, 2.65]}
              color={p.metal}
              metalness={0.85}
              roughness={0.3}
              radius={0.008}
            />
            <Box
              pos={[x, -0.96, 0.4]}
              size={[0.035, 0.025, 2.65]}
              color={p.shadow}
              radius={0.007}
            />
            <Cable
              p={p}
              color={p.metal}
              radius={0.013}
              points={[
                [x * 0.88, -0.29, -0.4],
                [x * 0.88, -0.29, 1.65],
              ]}
            />
          </group>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <group
            key={i}
            position={[0, -0.73, -0.2 + i * 0.26]}
            rotation={[-0.12, 0, 0]}
          >
            <Box
              pos={[0, 0, 0]}
              size={[1.85, 0.92, 0.045]}
              color={i % 3 === 0 ? p.accent : p.ivory}
              radius={0.012}
            />
            <Box
              pos={[-0.56 + (i % 3) * 0.5, 0.49, 0]}
              size={[0.45, 0.14, 0.045]}
              color={i % 3 === 0 ? p.accent : p.ivory}
              radius={0.02}
            />
            <Label
              text={DESK.details.folders[i]}
              p={p}
              pos={[-0.56 + (i % 3) * 0.5, 0.495, 0.025]}
              width={0.39}
            />
            <Box
              pos={[0, 0.01, -0.031]}
              size={[1.73, 0.87, 0.015]}
              color={p.paper}
              radius={0.005}
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
        {[-0.3, 0.3].map((x) => (
          <group key={x}>
            <Box
              pos={[x, -0.5, 2.035]}
              size={[0.07, 0.15, 0.07]}
              color={p.metal}
              metalness={0.8}
              radius={0.015}
            />
            <Screw p={p} pos={[x, -0.455, 2.075]} scale={0.65} />
          </group>
        ))}
        <Box
          pos={[0, -0.85, 2.024]}
          size={[1, 0.24, 0.014]}
          color={p.metal}
          metalness={0.7}
          roughness={0.3}
          radius={0.006}
        />
        <Label
          text={DESK.fileLabel}
          p={p}
          pos={[0, -0.85, 2.035]}
          width={0.9}
        />
      </group>
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
      position={[4.95, 0.1, -1.85]}
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
        <meshStandardMaterial
          color={p.accent}
          roughness={0.4}
          metalness={0.3}
        />
      </mesh>
      <mesh position={[0, 1.22, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 2.2, 16]} />
        <meshStandardMaterial
          color={p.metal}
          metalness={0.85}
          roughness={0.3}
        />
      </mesh>
      <Ring
        pos={[0, 0.17, 0]}
        radius={0.5}
        tube={0.014}
        color={p.metal}
        metalness={0.75}
      />
      <mesh position={[0.23, 0.195, 0.2]}>
        <cylinderGeometry args={[0.055, 0.055, 0.035, 24]} />
        <meshStandardMaterial color={p.ink} roughness={0.35} />
      </mesh>
      <Cable
        p={p}
        radius={0.018}
        points={[
          [0, 0.1, -0.4],
          [0.25, 0.04, -0.65],
          [0.65, 0.04, -0.7],
          [0.8, -0.3, -1.15],
          [0.85, -1.8, -1.2],
        ]}
      />
      <group position={[-0.24, 2.34, 0]} rotation={[0, 0, 0.22]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.24, 0.69, 0.52, 48, 1, true]} />
          <meshStandardMaterial
            color={p.accent}
            roughness={0.38}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Ring
          pos={[0, -0.255, 0]}
          radius={0.68}
          tube={0.015}
          color={p.metal}
          metalness={0.7}
        />
        <Ring
          pos={[0, 0.26, 0]}
          radius={0.24}
          tube={0.012}
          color={p.accent}
          metalness={0.25}
        />
        <mesh position={[0, 0.3, 0]} castShadow>
          <sphereGeometry args={[0.075, 20, 12]} />
          <meshStandardMaterial
            color={p.metal}
            metalness={0.8}
            roughness={0.25}
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

function World(props: SceneProps) {
  const { onReady, onFail } = props;
  const p = useMemo(() => palette(), []);
  const wood = useMemo(() => woodTexture(p), [p]);
  const grain = useMemo(() => surfaceTexture("grain"), []);
  const woven = useMemo(() => surfaceTexture("woven"), []);
  const ceramic = useMemo(() => surfaceTexture("ceramic"), []);
  const plaster = useMemo(() => surfaceTexture("plaster"), []);
  useEffect(
    () => () => {
      grain.dispose();
      woven.dispose();
      ceramic.dispose();
      plaster.dispose();
    },
    [grain, woven, ceramic, plaster],
  );
  const { gl } = useThree();
  useEffect(() => {
    onReady();
    return () => {
      document.body.style.cursor = "";
      wood.dispose();
    };
  }, [onReady, wood]);
  useEffect(() => {
    const failed = (event: Event) => {
      event.preventDefault();
      onFail();
    };
    gl.domElement.addEventListener("webglcontextlost", failed);
    return () => gl.domElement.removeEventListener("webglcontextlost", failed);
  }, [gl, onFail]);
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
      <ambientLight intensity={props.night ? 0.3 : 0.35} color={p.paper} />
      <hemisphereLight args={[p.paper, p.woodDark, props.night ? 0.5 : 0.8]} />
      <directionalLight
        position={[-3, 7, 4]}
        intensity={props.night ? 0.35 : 3.1}
        color={p.light}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8.5}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-6.5}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-normalBias={0.008}
        shadow-bias={-0.0001}
        shadow-radius={3}
      />
      <directionalLight
        position={[4.3, 3.4, -3.4]}
        intensity={props.night ? 0.45 : 1.1}
        color={props.night ? p.paper : p.sky}
      />
      <Environment
        resolution={128}
        frames={1}
        environmentIntensity={props.night ? 0.32 : 0.65}
      >
        <Lightformer
          form="rect"
          color={p.paper}
          intensity={3}
          position={[-4, 5, 3]}
          rotation={[0, Math.PI / 4, 0]}
          scale={[5, 7, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color={p.light}
          intensity={2}
          position={[4, 3, -3]}
          scale={[3, 5, 1]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          color={p.paper}
          intensity={1}
          position={[0, 7, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 4, 1]}
        />
      </Environment>
      <CameraRig focus={props.focus} reduced={props.reduced} />
      <Box
        pos={[0, -3.08, 0]}
        size={[40, 0.12, 40]}
        color={p.shadow}
        radius={0.01}
      />
      {/* Four plaster panels leave a real opening onto the exterior scene. */}
      {[
        {
          x: (-20 + WINDOW.x - WINDOW.width / 2) / 2,
          y: 3.4,
          w: 20 + WINDOW.x - WINDOW.width / 2,
          h: 13,
        },
        {
          x: (20 + WINDOW.x + WINDOW.width / 2) / 2,
          y: 3.4,
          w: 20 - WINDOW.x - WINDOW.width / 2,
          h: 13,
        },
        {
          x: WINDOW.x,
          y: (-3.1 + WINDOW.y - WINDOW.height / 2) / 2,
          w: WINDOW.width,
          h: WINDOW.y - WINDOW.height / 2 + 3.1,
        },
        {
          x: WINDOW.x,
          y: (9.9 + WINDOW.y + WINDOW.height / 2) / 2,
          w: WINDOW.width,
          h: 9.9 - WINDOW.y - WINDOW.height / 2,
        },
      ].map((wall, i) => (
        <Box
          key={i}
          pos={[wall.x, wall.y, -4]}
          size={[wall.w, wall.h, 0.18]}
          bumpMap={plaster}
          bumpScale={0.003}
          roughness={0.95}
          color={p.paper}
          radius={0.01}
        />
      ))}
      <Box pos={[0, -2.75, -3.85]} size={[40, 0.35, 0.1]} color={p.ivory} />
      <DeskWindow
        p={p}
        night={props.night}
        reduced={props.reduced}
        active={active}
      />
      <Box
        pos={[0, 0, 0]}
        size={[11.2, 0.25, 5.65]}
        bumpMap={grain}
        bumpScale={0.004}
        roughness={0.43}
        clearcoat={0.28}
        color={p.wood}
        map={wood}
        radius={0.065}
      />
      <Box
        pos={[0, -0.17, 2.67]}
        size={[11, 0.08, 0.09]}
        color={p.woodDark}
        map={wood}
        radius={0.02}
      />
      <Box
        pos={[0, -0.33, -2.55]}
        size={[10.85, 0.42, 0.12]}
        color={p.wood}
        map={wood}
        radius={0.02}
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
      <DeskMat p={p} woven={woven} />
      <Monitor
        p={p}
        plastic={ceramic}
        onClick={click(() => {
          if (props.focus === "desk") props.onMonitor();
        })}
        screen={
          props.focus === "monitor" ? (
            <ComputerScreen
              section={props.section}
              onSection={props.onSection}
              onResume={props.onResume}
              onClose={props.onClose}
              active
              reduced={props.reduced}
            />
          ) : null
        }
      />
      <DetailedKeyboard p={p} />
      <group position={[2.52, 0.27, 1.3]} rotation={[0, -0.16, 0]}>
        <mesh
          position={[0, -0.035, 0]}
          castShadow
          scale={[0.269, 0.105, 0.425]}
        >
          <sphereGeometry args={[1, 32, 20]} />
          <meshStandardMaterial color={p.shadow} roughness={0.65} />
        </mesh>
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
        <Cable
          p={p}
          color={p.shadow}
          radius={0.005}
          points={[
            [0, 0.015, -0.42],
            [0, 0.1, -0.25],
            [0, 0.135, -0.07],
            [0, 0.14, 0.035],
          ]}
        />
        <mesh position={[0, 0.142, -0.08]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.025, 20]} />
          <meshStandardMaterial color={p.ink} roughness={0.95} />
        </mesh>
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
      <DetailedTower
        p={p}
        ceramic={ceramic}
        musicRequest={props.musicRequest}
        reduced={props.reduced}
      />
      <RoomDecor p={p} wood={wood} />
      <DeskSpeakers
        p={p}
        request={props.musicRequest}
        active={props.musicActive}
        reduced={props.reduced}
      />
      <Lamp p={p} night={props.night} onClick={click(props.onLamp)} />
      <DeskCamera
        p={p}
        active={props.focus === "camera"}
        ready={props.cameraReady}
        reduced={props.reduced}
        onClose={props.onClose}
        onClick={click(() => {
          if (active) props.onCamera();
        })}
      />
      <Pottery p={p} ceramic={ceramic} grain={grain} />
      <BrickDisplay p={p} />
      <SewingMachine
        p={p}
        woven={woven}
        reduced={props.reduced}
        active={active}
      />
      <ContactShadows
        position={[0, 0.128, 0]}
        opacity={0.42}
        scale={[11.2, 5.65]}
        blur={1.15}
        far={3.8}
        resolution={1024}
        frames={1}
        color={p.woodDark}
      />
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
          <Html position={[-2.5, 2.45, -0.5]} center zIndexRange={[5, 0]}>
            <button className="desk-hotspot" onClick={props.onMusic}>
              <span>♫</span>
              {DESK.room.musicAction}
            </button>
          </Html>
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
          <Html position={[4.95, 2.9, -1.85]} center zIndexRange={[5, 0]}>
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
              onClick={props.onCamera}
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
  const [dpr, setDpr] = useState(1);
  return (
    <Canvas
      shadows="percentage"
      dpr={dpr}
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
      <RenderQuality onChange={setDpr} />
      <World {...props} />
    </Canvas>
  );
}

/** Retina detail without multiplying ultrawide/4K fill cost indefinitely. */
function RenderQuality({ onChange }: { onChange: (dpr: number) => void }) {
  const width = useThree((state) => state.size.width);
  const height = useThree((state) => state.size.height);
  useEffect(() => {
    if (!width || !height) return;
    onChange(
      Math.min(
        window.devicePixelRatio || 1,
        2,
        Math.sqrt(5_000_000 / (width * height)),
      ),
    );
  }, [width, height, onChange]);
  return null;
}
