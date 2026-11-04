"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Canvas,
  useFrame,
  useThree,
  type ThreeEvent,
} from "@react-three/fiber";
import {
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
  ContactShadow,
  Ring,
  Screw,
  Slots,
  SurfacesContext,
  makeTexture,
  surfaceTexture,
  useShadowRefresh,
  useSurfaces,
  type Palette,
} from "./DeskMaterials";
import { createSurfaces, mix } from "./DeskSurfaces";
import {
  DetailedKeyboard,
  DetailedTower,
  DeskMat,
  Pottery,
} from "./DeskObjects";
import { DeskWindow, WINDOW } from "./DeskWindow";
import { SewingMachine } from "./DeskMakerObjects";
import { BrickCat } from "./DeskBrickCat";
import { BIN, TrashBin } from "./DeskBin";
import { DeskWear, DrawerWear, MonitorWear, PedestalWear } from "./DeskWear";
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
  "limewash",
  "dusk",
  "sun",
  "iris",
  "blush",
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
    // A tube, not a flat panel: phosphor bloom, scanlines, darker corners.
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.16;
    ctx.filter = "blur(6px)";
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = p.ink;
    for (let y = 0; y < 860; y += 3) ctx.fillRect(0, y, 1200, 1);
    ctx.globalAlpha = 1;
    const tube = ctx.createRadialGradient(600, 430, 260, 600, 430, 780);
    tube.addColorStop(0, "transparent");
    tube.addColorStop(1, p.ink);
    ctx.fillStyle = tube;
    ctx.globalAlpha = 0.75;
    ctx.fillRect(0, 0, 1200, 860);
    ctx.globalCompositeOperation = "screen";
    const sheen = ctx.createRadialGradient(420, 260, 0, 420, 260, 640);
    sheen.addColorStop(0, p.screen);
    sheen.addColorStop(1, "transparent");
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, 1200, 860);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
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
  night,
  screen,
  onClick,
}: {
  p: Palette;
  night: boolean;
  screen: ReactNode;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
}) {
  const s = useSurfaces();
  // Aged ABS: tinted by the shared yellowing map, matte moulded tooth.
  const abs = {
    map: s.plasticTint,
    tint: true,
    roughness: 1,
    roughnessMap: s.plasticSurface,
    bumpMap: s.plasticSurface,
    bumpScale: 0.12,
    envMapIntensity: 0.7,
  };
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
        {...abs}
      />
      <mesh position={[0, 0.45, -0.35]} castShadow receiveShadow>
        <cylinderGeometry args={[0.37, 0.5, 0.4, 36]} />
        <meshStandardMaterial
          color={p.ivory}
          map={s.plasticTint}
          roughness={1}
          roughnessMap={s.plasticSurface}
          bumpMap={s.plasticSurface}
          bumpScale={0.12}
          envMapIntensity={0.7}
        />
      </mesh>
      <Box
        pos={[0, 1.91, -0.53]}
        size={[3.48, 2.68, 1.72]}
        color={p.ivory}
        radius={0.24}
        {...abs}
      />
      {/* Shadow line where the front bezel meets the rear housing. */}
      <Box
        pos={[0, 1.91, 0.25]}
        size={[3.47, 2.67, 0.18]}
        color={mix(p.shadow, p.ink, 0.35)}
        radius={0.08}
        roughness={0.9}
      />
      <Box
        pos={[0, 1.91, 0.285]}
        size={[3.46, 2.66, 0.16]}
        color={p.ivory}
        radius={0.07}
        {...abs}
      />
      <Box
        pos={[0, 2.01, 0.34]}
        size={[3.08, 2.25, 0.12]}
        color={mix(p.shadow, p.ink, 0.45)}
        radius={0.16}
        roughness={0.85}
        bumpMap={s.plasticSurface}
        bumpScale={0.08}
      />
      <RoundedBox
        position={[0, 2.01, 0.41]}
        args={[2.91, 2.09, 0.1]}
        radius={0.15}
        smoothness={5}
      >
        <meshStandardMaterial color={p.ink} roughness={0.3} metalness={0.1} />
      </RoundedBox>
      <mesh position={[0, 2.01, 0.469]} geometry={glass}>
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* Curved tube glass: dark, a little dusty, catching the room. */}
      <mesh position={[0, 2.01, 0.471]} geometry={glass}>
        <meshPhysicalMaterial
          color={p.ink}
          transparent
          opacity={0.2}
          roughness={0.06}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          envMapIntensity={2.4}
          alphaMap={s.grime}
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
        <meshStandardMaterial color={p.accent} roughness={0.55} />
      </mesh>
      <mesh position={[1.13, 0.78, 0.39]}>
        <sphereGeometry args={[0.023, 12, 12]} />
        <meshStandardMaterial
          color={p.accentLight}
          emissive={p.accentLight}
          emissiveIntensity={1.6}
          roughness={0.2}
          toneMapped={false}
        />
      </mesh>
      {[-0.7, -0.48, -0.26, -0.04].map((x) => (
        <mesh key={x} position={[x, 0.62, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.035, 0.035, 0.035, 12]} />
          <meshStandardMaterial color={p.shadow} roughness={0.7} />
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
      <MonitorWear p={p} />
      {/* The tube washes the keys and the desk in front of it. */}
      <pointLight
        position={[0, 1.9, 1.1]}
        intensity={(hover ? 2.5 : 1.3) * (night ? 2 : 1)}
        color={p.screen}
        distance={night ? 5.5 : 4}
      />
    </group>
  );
}

function Drawer({
  p,
  focus,
  reduced,
  onClick,
}: {
  p: Palette;
  focus: DeskFocus;
  reduced: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  const refreshShadows = useShadowRefresh();
  const surfaces = useSurfaces();
  const walnut = {
    map: surfaces.wood,
    roughness: 1,
    roughnessMap: surfaces.woodSurface,
    bumpMap: surfaces.woodSurface,
    bumpScale: 0.25,
  };
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
    if (Math.abs(ref.current.position.z - goal) > 0.001) {
      invalidate();
      refreshShadows();
    }
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
          {...walnut}
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
        {...walnut}
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
        {...walnut}
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
          {...walnut}
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
        <DrawerWear p={p} />
      </group>
      <PedestalWear p={p} />
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
  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(0, -3, 0);
    return target;
  }, []);
  const { tooth } = useSurfaces();
  // Powder-coated steel: satin, faintly orange-peeled, never mirror-bright.
  const coat = {
    color: p.accent,
    roughness: 1,
    roughnessMap: tooth,
    bumpMap: tooth,
    bumpScale: 0.06,
    metalness: 0.35,
  };
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
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.59, 0.18, 48]} />
        <meshStandardMaterial {...coat} />
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
          <meshStandardMaterial {...coat} side={THREE.FrontSide} />
        </mesh>
        {/* White enamel reflector inside the shade. */}
        <mesh>
          <cylinderGeometry args={[0.235, 0.68, 0.515, 48, 1, true]} />
          <meshStandardMaterial
            color={p.paper}
            roughness={0.45}
            side={THREE.BackSide}
            emissive={p.light}
            emissiveIntensity={night ? 0.55 : 0}
          />
        </mesh>
        {night && (
          <mesh position={[0, -0.05, 0]}>
            <sphereGeometry args={[0.14, 20, 14]} />
            <meshBasicMaterial color={p.light} toneMapped={false} />
          </mesh>
        )}
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
          <meshBasicMaterial
            color={night ? p.light : mix(p.paper, p.ink, 0.1)}
            transparent
            opacity={night ? 0.92 : 1}
          />
        </mesh>
        <primitive object={lightTarget} />
        <spotLight
          position={[0, -0.35, 0]}
          target={lightTarget}
          color={p.light}
          intensity={night ? 42 : 3}
          angle={1.12}
          penumbra={0.65}
          distance={10}
          decay={2}
          castShadow={night}
          shadow-mapSize={[1024, 1024]}
          shadow-camera-near={0.1}
          shadow-camera-far={10}
          shadow-normalBias={0.003}
          shadow-bias={-0.00005}
          shadow-radius={3}
        />
      </group>
    </group>
  );
}

/** Limewashed brick with a true opening for the window, and sealed concrete. */
function Room({ p }: { p: Palette }) {
  const s = useSurfaces();
  const wall = useMemo(() => {
    const shape = new THREE.Shape()
      .moveTo(-20, -3.1)
      .lineTo(20, -3.1)
      .lineTo(20, 9.9)
      .lineTo(-20, 9.9)
      .closePath();
    const l = WINDOW.x - WINDOW.width / 2,
      r = WINDOW.x + WINDOW.width / 2,
      b = WINDOW.y - WINDOW.height / 2,
      t = WINDOW.y + WINDOW.height / 2;
    shape.holes.push(
      new THREE.Path().moveTo(l, b).lineTo(r, b).lineTo(r, t).lineTo(l, t).closePath(),
    );
    // ShapeGeometry UVs are world units, so brick size is constant everywhere.
    return new THREE.ShapeGeometry(shape);
  }, []);
  useEffect(() => () => wall.dispose(), [wall]);
  return (
    <>
      <mesh geometry={wall} position={[0, 0, -3.91]} receiveShadow>
        <meshStandardMaterial
          map={s.wall}
          roughness={1}
          roughnessMap={s.wallSurface}
          bumpMap={s.wallSurface}
          bumpScale={0.9}
          envMapIntensity={0.5}
        />
      </mesh>
      <Box
        pos={[0, -2.75, -3.85]}
        size={[40, 0.35, 0.1]}
        color={mix(p.limewash, p.shadow, 0.25)}
        roughness={1}
        roughnessMap={s.tooth}
        bumpMap={s.tooth}
        bumpScale={0.05}
      />
      <Box
        pos={[0, -3.08, 0]}
        size={[40, 0.12, 40]}
        color={p.shadow}
        map={s.floor}
        roughness={1}
        roughnessMap={s.floorSurface}
        bumpMap={s.floorSurface}
        bumpScale={0.35}
        radius={0.01}
        castShadow={false}
      />
    </>
  );
}

/**
 * Golden hour. A low sun from a tall steel window just out of frame on the
 * left throws its sash and a few leaves across the wall and the back of the
 * desk; a soft overhead fill reads as bounce and occlusion; the visible
 * window adds a cooler dusk rim. At night the lamp takes over and the same
 * window lets in a faint, cool moon.
 */
function Lighting({ p, night }: { p: Palette; night: boolean }) {
  const { gobo } = useSurfaces();
  const sunTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(-1.6, 1.1, -3.4);
    return target;
  }, []);
  return (
    <>
      <ambientLight
        intensity={night ? 0.08 : 0.12}
        color={night ? p.skyNight : p.paper}
      />
      <hemisphereLight
        color={night ? p.skyNight : p.paper}
        groundColor={p.woodDark}
        intensity={night ? 0.42 : 0.62}
      />
      <directionalLight
        position={[1.5, 14, 5]}
        intensity={night ? 0.1 : 0.85}
        color={night ? p.sky : p.light}
        castShadow={!night}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={9}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-normalBias={0.004}
        shadow-bias={-0.0001}
        shadow-radius={10}
      />
      <directionalLight
        position={[4.3, 3.4, -3.4]}
        intensity={night ? 0.3 : 0.55}
        color={night ? p.sky : p.dusk}
      />
      <primitive object={sunTarget} />
      <spotLight
        position={[-13, 11, 10]}
        target={sunTarget}
        color={night ? p.sky : p.sun}
        intensity={night ? 0.55 : 3.6}
        angle={0.3}
        penumbra={0.15}
        decay={0}
        distance={0}
        map={gobo}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={8}
        shadow-camera-far={40}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-radius={2.5}
      />
      <Environment
        resolution={128}
        frames={1}
        environmentIntensity={night ? 0.2 : 0.42}
      >
        {/* The sun window, the visible dusk window, a warm ceiling bounce. */}
        <Lightformer
          form="rect"
          color={p.sun}
          intensity={4}
          position={[-9, 4, 5]}
          scale={[4, 6, 1]}
          target={[0, 1, 0]}
        />
        <Lightformer
          form="rect"
          color={p.dusk}
          intensity={2.4}
          position={[4.1, 2.7, -6]}
          scale={[3.3, 3.2, 1]}
          target={[0, 1, 2]}
        />
        <Lightformer
          form="rect"
          color={p.light}
          intensity={0.7}
          position={[0, 8, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[10, 6, 1]}
        />
        <Lightformer
          form="rect"
          color={p.woodDark}
          intensity={0.5}
          position={[0, -4, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[20, 20, 1]}
        />
      </Environment>
    </>
  );
}

/** Soft occlusion beneath everything that never moves. */
function Grounding({ p }: { p: Palette }) {
  const ink = p.ink;
  const top = 0.128,
    mat = 0.166,
    floor = -3.015;
  const shadows: Parameters<typeof ContactShadow>[0][] = [
    { pos: [0.65, 0.127, 0.9], size: [5.8, 2.9], opacity: 0.32, color: ink },
    { pos: [0.35, top, -1.0], size: [2.35, 1.8], opacity: 0.55, color: ink },
    { pos: [0.35, 0.127, -1.35], size: [4.1, 2.7], opacity: 0.22, color: ink },
    { pos: [-2.5, top, -1.55], size: [1.6, 2.4], opacity: 0.62, color: ink },
    { pos: [0.22, mat, 1.25], size: [4, 1.8], opacity: 0.5, color: ink },
    { pos: [2.52, mat, 1.3], size: [0.75, 1.05], rotation: -0.16, opacity: 0.45, round: true, color: ink },
    { pos: [-1.72, top, -0.08], size: [0.85, 0.85], opacity: 0.55, color: ink },
    { pos: [2.36, top, -0.25], size: [0.85, 0.85], opacity: 0.55, color: ink },
    { pos: [3.68, top, -0.65], size: [2.8, 1.6], rotation: -0.16, opacity: 0.5, color: ink },
    { pos: [-3.8, top, 0.45], size: [1.6, 1.45], rotation: 0.16, opacity: 0.5, color: ink },
    { pos: [4.95, top, -1.85], size: [1.55, 1.55], opacity: 0.55, round: true, color: ink },
    { pos: [-2.5, top, 1.45], size: [1.05, 1.05], opacity: 0.4, round: true, color: ink },
    { pos: [0, floor, 0], size: [12.5, 6.8], opacity: 0.3, color: ink },
    { pos: [-3.5, floor, 0.25], size: [2.8, 4.3], opacity: 0.55, color: ink },
    { pos: [4.78, floor, -0.3], size: [0.7, 4.4], opacity: 0.45, color: ink },
    { pos: [0, floor, -3.72], size: [40, 0.9], opacity: 0.4, color: ink },
    { pos: [BIN.x, floor, BIN.z], size: [1.55, 1.55], opacity: 0.6, round: true, color: ink },
  ];
  return (
    <>
      {shadows.map((shadow, i) => (
        <ContactShadow key={i} {...shadow} />
      ))}
    </>
  );
}

function Mouse({ p }: { p: Palette }) {
  const s = useSurfaces();
  return (
    <group position={[2.52, 0.27, 1.3]} rotation={[0, -0.16, 0]}>
      <mesh
        position={[0, -0.035, 0]}
        castShadow
        receiveShadow
        scale={[0.269, 0.105, 0.425]}
      >
        <sphereGeometry args={[1, 32, 20]} />
        <meshStandardMaterial color={p.shadow} roughness={0.75} />
      </mesh>
      <mesh castShadow receiveShadow scale={[0.27, 0.14, 0.43]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial
          color={p.ivory}
          map={s.plasticTint}
          roughness={1}
          roughnessMap={s.plasticSurface}
          bumpMap={s.plasticSurface}
          bumpScale={0.1}
          envMapIntensity={0.7}
        />
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
  );
}

/**
 * A lens, not a viewport: gentle warm vignette and a fixed film grain,
 * multiplied over the frame in the same pass. Lives on layer 1 so shadow
 * and environment captures never see it, and never takes pointer events.
 */
function Grade({ p, night }: { p: Palette; night: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3),
    );
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          tint: { value: new THREE.Color() },
          strength: { value: 0 },
          grain: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = position.xy * 0.5 + 0.5;
            gl_Position = vec4(position.xy, 0.0, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 tint;
          uniform float strength;
          uniform float grain;
          varying vec2 vUv;
          float hash(vec2 p) {
            p = fract(p * vec2(443.897, 441.423));
            p += dot(p, p.yx + 19.19);
            return fract((p.x + p.y) * p.x);
          }
          void main() {
            vec2 q = (vUv - 0.5) * vec2(1.1, 1.0);
            float v = smoothstep(0.4, 0.98, length(q));
            vec3 shade = mix(vec3(1.0), tint, v * strength);
            shade *= 1.0 - grain * hash(floor(gl_FragCoord.xy));
            gl_FragColor = vec4(shade, 1.0);
          }`,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.ZeroFactor,
        blendDst: THREE.SrcColorFactor,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const tint = useMemo(
    () => (night ? p.ink : mix(p.woodDark, p.clay, 0.3)),
    [night, p],
  );
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.layers.set(1);
    const { uniforms } = mesh.material as THREE.ShaderMaterial;
    uniforms.tint.value.setStyle(tint);
    uniforms.strength.value = night ? 0.5 : 0.3;
    uniforms.grain.value = night ? 0.06 : 0.045;
  });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      frustumCulled={false}
      renderOrder={10000}
      raycast={() => null}
    />
  );
}

function World(props: SceneProps) {
  const { onReady, onFail } = props;
  const p = useMemo(() => palette(), []);
  const surfaces = useMemo(
    () => createSurfaces(p, { wallHead: WINDOW.y + WINDOW.height / 2 }),
    [p],
  );
  const grain = useMemo(() => surfaceTexture("grain"), []);
  const woven = useMemo(() => surfaceTexture("woven"), []);
  const ceramic = useMemo(() => surfaceTexture("ceramic"), []);
  useEffect(
    () => () => {
      grain.dispose();
      woven.dispose();
      ceramic.dispose();
    },
    [grain, woven, ceramic],
  );
  useEffect(() => () => surfaces.dispose(), [surfaces]);
  const { gl } = useThree();
  const refreshShadows = useShadowRefresh();
  // Any change of scene state may move a caster or switch a shadowed light.
  useLayoutEffect(() => {
    refreshShadows();
  });
  useEffect(() => {
    onReady();
    return () => {
      document.body.style.cursor = "";
    };
  }, [onReady]);
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
  const walnut = {
    map: surfaces.wood,
    roughness: 1,
    roughnessMap: surfaces.woodSurface,
    bumpMap: surfaces.woodSurface,
    bumpScale: 0.25,
  };
  const steel = {
    color: p.ink,
    roughness: 1,
    roughnessMap: surfaces.tooth,
    bumpMap: surfaces.tooth,
    bumpScale: 0.05,
    metalness: 0.3,
    radius: 0.02,
  };
  return (
    <SurfacesContext.Provider value={surfaces}>
      <color attach="background" args={[props.night ? p.ink : p.paper]} />
      <fog
        attach="fog"
        args={[props.night ? p.ink : mix(p.paper, p.sun, 0.12), 18, 40]}
      />
      <Lighting p={p} night={props.night} />
      <CameraRig focus={props.focus} reduced={props.reduced} />
      <Room p={p} />
      <DeskWindow
        p={p}
        night={props.night}
        reduced={props.reduced}
        active={active}
      />
      {/* Oiled walnut top: matte, worn where it is used. */}
      <Box
        pos={[0, 0, 0]}
        size={[11.2, 0.25, 5.65]}
        color={p.wood}
        map={surfaces.deskTop}
        roughness={1}
        roughnessMap={surfaces.deskTopSurface}
        bumpMap={surfaces.deskTopSurface}
        bumpScale={0.3}
        clearcoat={0.06}
        clearcoatRoughness={0.55}
        radius={0.065}
      />
      <Box
        pos={[0, -0.17, 2.67]}
        size={[11, 0.08, 0.09]}
        color={p.woodDark}
        {...walnut}
        radius={0.02}
      />
      <Box
        pos={[0, -0.33, -2.55]}
        size={[10.85, 0.42, 0.12]}
        color={p.wood}
        {...walnut}
        radius={0.02}
      />
      <Box pos={[4.78, -1.52, 1.5]} size={[0.17, 2.85, 0.17]} {...steel} />
      <Box pos={[4.78, -1.52, -2.1]} size={[0.17, 2.85, 0.17]} {...steel} />
      <Box pos={[4.78, -2.83, -0.3]} size={[0.19, 0.14, 3.8]} {...steel} />
      <Drawer
        p={p}
        focus={props.focus}
        reduced={props.reduced}
        onClick={click(props.onResume)}
      />
      <DeskMat p={p} woven={woven} />
      <Monitor
        p={p}
        night={props.night}
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
      <Mouse p={p} />
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
        musicRequest={props.musicRequest}
        reduced={props.reduced}
      />
      <RoomDecor p={p} />
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
      <BrickCat p={p} />
      <TrashBin p={p} />
      <DeskWear p={p} />
      <SewingMachine
        p={p}
        woven={woven}
        reduced={props.reduced}
        active={active}
      />
      <Grounding p={p} />
      <Grade p={p} night={props.night} />
      {/* Real light shadow maps update on demand with the camera, drawer and
          blinds. No baked overhead layer that leaves shadows behind. */}
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
    </SurfacesContext.Provider>
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
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
        // Shadow maps re-render only when a caster moves; see useShadowRefresh.
        gl.shadowMap.autoUpdate = false;
        gl.shadowMap.needsUpdate = true;
        camera.layers.enable(1);
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
