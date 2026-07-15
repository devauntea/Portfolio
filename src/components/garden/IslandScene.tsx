"use client";

/* The Agent Garden island: one floating low-poly chunk of earth with a
   campfire, a tree, four care stations, and the four creatures roaming free.

   Visitors see a frozen diorama: living colors, gentle idle pose, no wander,
   no HUD, plus a plaque ("unlock to interact"). Owners see the live game —
   dormant agents as stone statues on their pedestals, awake ones wandering
   at an energy-scaled pace, nappers curled at the mushrooms, hover stat
   bars, emote bubbles, and a campfire whose color tracks the garden's
   average happiness. All purely procedural; no model files. */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Float, Html, OrbitControls, Sparkles } from "@react-three/drei";
import { AGENTS, type AgentDef, type AgentId } from "@/data/agents";
import { useGarden } from "@/lib/agent-store";
import { overallHappiness } from "@/lib/garden-sim";
import { CREATURE } from "./creatures";

export type HeldAction = "feed" | "train" | "nap" | null;
export type StationId = "food" | "toys" | "train" | "nap";

const HUE: Record<string, number> = {
  teleporter: 0x4de1ff,
  ember: 0xff7a3d,
  gold: 0xffd45e,
  toxic: 0x9bff6a,
};
const HUE_CSS: Record<string, string> = {
  teleporter: "var(--lumen)",
  ember: "var(--ember)",
  gold: "var(--gilt)",
  toxic: "var(--sprout)",
};

/* island layout (x, z) — grass cap radius is 4.6 */
const HOME: [number, number][] = [
  [-2.1, 1.5], // paper-wing
  [2.1, 1.5], // echo-fox
  [2.3, -1.6], // cash-raptor
  [-2.3, -1.6], // fortress-tortoise
];
const STATION_POS: Record<StationId, [number, number]> = {
  food: [1.3, 2.6],
  toys: [-1.4, 2.5],
  train: [3.1, -0.2],
  nap: [-3.0, -0.4],
};
const FIRE_MIN_R = 1.2; // wanderers keep clear of the campfire
const WANDER_R = 2.9;

/* deterministic scatter (no Math.random in render — lint) */
const TUFTS: [number, number, number][] = [
  [-3.4, 0, 1.2], [-1.2, 0, 3.4], [0.8, 0, 3.7], [2.9, 0, 1.9],
  [3.8, 0, -0.9], [1.9, 0, -3.1], [-0.6, 0, -3.7], [-3.6, 0, -1.8],
];
const ROCKS: [number, number, number, number][] = [
  [-3.9, 0, 0.2, 0.28], [3.4, 0, 2.4, 0.2], [0.2, 0, -3.9, 0.24],
];

function cursorOn(kind: "hand" | "magnify") {
  return (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    document.body.dataset.cursor = kind;
  };
}
function cursorOff() {
  delete document.body.dataset.cursor;
}

/* ---------- island terrain ---------- */

function Terrain() {
  return (
    <group>
      {/* grass cap */}
      <mesh position={[0, -0.26, 0]}>
        <cylinderGeometry args={[4.6, 4.15, 0.52, 12]} />
        <meshStandardMaterial color={0x35704f} flatShading />
      </mesh>
      {/* earth cone below */}
      <mesh position={[0, -2.1, 0]}>
        <coneGeometry args={[4.15, 3.2, 12]} />
        <meshStandardMaterial color={0x2a2148} flatShading />
      </mesh>
      {TUFTS.map((p, i) => (
        <mesh key={i} position={[p[0], 0.12, p[2]]}>
          <coneGeometry args={[0.1, 0.32, 5]} />
          <meshStandardMaterial color={0x4c9268} flatShading />
        </mesh>
      ))}
      {ROCKS.map(([x, , z, s], i) => (
        <mesh key={i} position={[x, 0.1, z]} rotation={[0.3, i, 0]}>
          <dodecahedronGeometry args={[s, 0]} />
          <meshStandardMaterial color={0x3b3f5c} flatShading />
        </mesh>
      ))}
      {/* small tree */}
      <group position={[-2.5, 0, -2.6]}>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.12, 0.18, 1, 6]} />
          <meshStandardMaterial color={0x5c4433} flatShading />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <icosahedronGeometry args={[0.62, 0]} />
          <meshStandardMaterial color={0x2f7d52} flatShading />
        </mesh>
        <mesh position={[0.35, 0.95, 0.2]}>
          <icosahedronGeometry args={[0.4, 0]} />
          <meshStandardMaterial color={0x39905f} flatShading />
        </mesh>
      </group>
    </group>
  );
}

/* ---------- campfire (color tracks average happiness) ---------- */

const FIRE_SAD = new THREE.Color(0x4d5f8f);
const FIRE_MID = new THREE.Color(0xff7a3d);
const FIRE_HAPPY = new THREE.Color(0xffd45e);
const fireColor = new THREE.Color();

function Campfire({ neutral }: { neutral: boolean }) {
  const flames = useRef<(THREE.Mesh | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (neutral) {
      fireColor.copy(FIRE_MID);
    } else {
      const agents = useGarden.getState().agents;
      const h = overallHappiness(Object.values(agents));
      if (h < 50) fireColor.lerpColors(FIRE_SAD, FIRE_MID, h / 50);
      else fireColor.lerpColors(FIRE_MID, FIRE_HAPPY, (h - 50) / 50);
    }
    flames.current.forEach((f, i) => {
      if (!f) return;
      const flick = 1 + Math.sin(t * 7 + i * 2.1) * 0.12 + Math.sin(t * 13 + i) * 0.06;
      f.scale.set(flick, flick * (1 + Math.sin(t * 9 + i) * 0.15), flick);
      (f.material as THREE.MeshStandardMaterial).color.copy(fireColor);
      (f.material as THREE.MeshStandardMaterial).emissive.copy(fireColor);
    });
    if (light.current) {
      light.current.color.copy(fireColor);
      light.current.intensity = 9 + Math.sin(t * 8) * 1.6;
    }
  });
  return (
    <group>
      {/* stone ring */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.58, 0.08, Math.sin(a) * 0.58]} rotation={[0.2, a, 0]}>
            <dodecahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color={0x3b3f5c} flatShading />
          </mesh>
        );
      })}
      {/* crossed logs */}
      <mesh position={[0, 0.1, 0]} rotation={[0, 0.5, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 6]} />
        <meshStandardMaterial color={0x5c4433} flatShading />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, -0.6, Math.PI / 2]}>
        <cylinderGeometry args={[0.07, 0.07, 0.8, 6]} />
        <meshStandardMaterial color={0x54402f} flatShading />
      </mesh>
      {/* flames */}
      {[0.5, 0.36, 0.28].map((h, i) => (
        <mesh
          key={i}
          ref={(el) => {
            flames.current[i] = el;
          }}
          position={[(i - 1) * 0.09, 0.18 + h / 2, (i % 2) * 0.08]}
        >
          <coneGeometry args={[h * 0.42, h, 6]} />
          <meshStandardMaterial emissiveIntensity={1.4} transparent opacity={0.92} flatShading />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, 0.9, 0]} distance={10} decay={1.6} />
    </group>
  );
}

/* ---------- care stations ---------- */

function StationLabel({ text, y = 1.15 }: { text: string; y?: number }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={9} zIndexRange={[20, 0]}>
      <div className="pointer-events-none whitespace-nowrap rounded border border-seam bg-cosmos/85 px-2 py-1 font-mono text-[8px] text-starlight">
        {text}
      </div>
    </Html>
  );
}

function PulseRing({ color, radius }: { color: number; radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    const s = 1 + Math.sin(t * 4) * 0.12;
    ref.current.scale.set(s, s, 1);
    (ref.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
      1 + Math.sin(t * 4) * 0.5;
  });
  return (
    <mesh ref={ref} position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.025, 8, 36]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
    </mesh>
  );
}

function Station({
  id,
  owner,
  active,
  label,
  onStation,
  children,
}: {
  id: StationId;
  owner: boolean;
  active: boolean;
  label: string;
  onStation: (s: StationId) => void;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  const [x, z] = STATION_POS[id];
  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => {
        e.stopPropagation();
        if (owner) onStation(id);
      }}
      onPointerOver={(e) => {
        if (!owner) return;
        cursorOn("hand")(e);
        setHover(true);
      }}
      onPointerOut={() => {
        cursorOff();
        setHover(false);
      }}
    >
      {children}
      {owner && (hover || active) && <StationLabel text={label} />}
      {active && <PulseRing color={0xffd45e} radius={0.55} />}
    </group>
  );
}

function FoodBowl({ armed }: { armed: boolean }) {
  const glow = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!glow.current) return;
    (glow.current.material as THREE.MeshStandardMaterial).emissiveIntensity = armed
      ? 1 + Math.sin(clock.elapsedTime * 5) * 0.5
      : 0.35;
  });
  return (
    <group>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.36, 0.28, 0.18, 10]} />
        <meshStandardMaterial color={0x6b4a86} flatShading />
      </mesh>
      <mesh ref={glow} position={[0, 0.19, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.05, 8, 20]} />
        <meshStandardMaterial color={0x8a5fd6} emissive={0xb18cff} emissiveIntensity={0.35} flatShading />
      </mesh>
      {/* kibble */}
      {[[-0.09, 0.04], [0.08, -0.02], [0, 0.09]].map(([kx, kz], i) => (
        <mesh key={i} position={[kx, 0.2, kz]}>
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshStandardMaterial color={0xffb36b} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function ToyChest() {
  const toyIndex = useGarden((s) => s.toyIndex);
  const toy = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!toy.current) return;
    toy.current.rotation.y = clock.elapsedTime * 1.4;
    toy.current.position.y = 0.78 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
  });
  return (
    <group>
      <mesh position={[0, 0.18, 0]}>
        <boxGeometry args={[0.6, 0.36, 0.42]} />
        <meshStandardMaterial color={0x7a5230} flatShading />
      </mesh>
      {/* open lid */}
      <mesh position={[0, 0.42, -0.19]} rotation={[-2.2, 0, 0]}>
        <boxGeometry args={[0.6, 0.3, 0.06]} />
        <meshStandardMaterial color={0x8a6238} flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0.22]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshStandardMaterial color={0xffd45e} emissive={0xffd45e} emissiveIntensity={0.4} />
      </mesh>
      {/* current toy hovers above the chest */}
      <group ref={toy} position={[0, 0.78, 0]}>
        {toyIndex === 0 && (
          <mesh>
            <sphereGeometry args={[0.14, 8, 8]} />
            <meshStandardMaterial color={0xff5470} flatShading />
          </mesh>
        )}
        {toyIndex === 1 && (
          <mesh rotation={[0, 0, -0.7]}>
            <coneGeometry args={[0.06, 0.42, 5]} />
            <meshStandardMaterial color={0x4de1ff} flatShading />
          </mesh>
        )}
        {toyIndex === 2 && (
          <mesh rotation={[0.5, 0.5, 0]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color={0x9bff6a} flatShading />
          </mesh>
        )}
      </group>
    </group>
  );
}

function TrainingPost() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 1, 6]} />
        <meshStandardMaterial color={0x5c4433} flatShading />
      </mesh>
      {/* dummy head + arms */}
      <mesh position={[0, 1.08, 0]}>
        <icosahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color={0xb8a888} flatShading />
      </mesh>
      <mesh position={[0, 0.82, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 6]} />
        <meshStandardMaterial color={0x8a7a5a} flatShading />
      </mesh>
    </group>
  );
}

function NapSpot() {
  return (
    <group>
      {[[0, 0, 0.36], [-0.55, 0.25, 0.26]].map(([mx, mz, s], i) => (
        <group key={i} position={[mx, 0, mz]}>
          <mesh position={[0, 0.14, 0]}>
            <cylinderGeometry args={[s * 0.45, s * 0.55, 0.28, 8]} />
            <meshStandardMaterial color={0xd8d2c0} flatShading />
          </mesh>
          <mesh position={[0, 0.3, 0]}>
            <sphereGeometry args={[s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={0x8a5fd6} emissive={0x8a5fd6} emissiveIntensity={0.15} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ---------- creature actor: wander AI + emotes + hover HUD ---------- */

const EMOTE_ICON: Record<string, string> = {
  hearts: "💖",
  play: "✨",
  train: "💪",
  wake: "⚡",
};

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-7 text-[7px] text-faint">{label}</span>
      <div className="h-1.5 w-16 overflow-hidden rounded-sm bg-cosmos">
        <div
          className="h-full rounded-sm"
          style={{ width: `${Math.round(value)}%`, background: color }}
        />
      </div>
      <span className="w-6 text-right font-mono text-[7px] text-starlight">
        {Math.round(value)}
      </span>
    </div>
  );
}

function CreatureActor({
  def,
  owner,
  held,
  onSelect,
  onTarget,
}: {
  def: AgentDef;
  owner: boolean;
  held: HeldAction;
  onSelect: (id: AgentId) => void;
  onTarget: (id: AgentId) => void;
}) {
  const care = useGarden((s) => s.agents[def.id]);
  const emote = useGarden((s) => s.emote[def.id]);
  const [hover, setHover] = useState(false);
  const [seenEmote, setSeenEmote] = useState(0);

  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const wanderTarget = useRef<[number, number]>(HOME[def.slot]);
  const nextPick = useRef(0);
  const bounce = useRef(0);
  const lastEmote = useRef(0);

  // transient emote bubble: shown while the latest nonce is "unseen";
  // only the hide-timeout callback writes state (render stays derive-only)
  useEffect(() => {
    if (emote.n === 0) return;
    const t = setTimeout(() => setSeenEmote(emote.n), 2200);
    return () => clearTimeout(t);
  }, [emote.n]);
  const bubble =
    emote.n > 0 && emote.n !== seenEmote ? (EMOTE_ICON[emote.kind] ?? "✨") : null;

  const stone = owner && care.status === "dormant";
  const asleep = owner && care.status === "asleep";
  const wandering = owner && care.status === "awake";
  const pace = wandering ? 0.6 + (care.vitals.energy / 100) * 0.7 : 0.8;

  const lowest = Math.min(care.vitals.hunger, care.vitals.happiness, care.vitals.energy);
  const moodBubble =
    owner && care.status === "awake" && lowest < 30
      ? care.vitals.hunger === lowest
        ? "🥺🍖"
        : care.vitals.energy === lowest
          ? "🥱"
          : "😢"
      : null;
  const shownBubble = asleep ? "💤" : (bubble ?? moodBubble);

  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    // reaction bounce on emote nonce change
    if (emote.n !== lastEmote.current) {
      lastEmote.current = emote.n;
      bounce.current = 1;
    }
    if (bounce.current > 0) bounce.current = Math.max(0, bounce.current - dt / 0.6);
    g.scale.setScalar(1 + Math.sin(bounce.current * Math.PI) * 0.18);

    const t = clock.elapsedTime;
    let dest: [number, number];
    if (asleep) {
      const [nx, nz] = STATION_POS.nap;
      dest = [nx + 0.7, nz + 0.4]; // curl beside the mushrooms
    } else if (!wandering) {
      dest = HOME[def.slot]; // statue pedestal / public diorama pose
    } else {
      if (t > nextPick.current) {
        nextPick.current = t + 3 + Math.random() * 5;
        const a = Math.random() * Math.PI * 2;
        const r = FIRE_MIN_R + Math.random() * (WANDER_R - FIRE_MIN_R);
        wanderTarget.current = [Math.cos(a) * r, Math.sin(a) * r];
      }
      dest = wanderTarget.current;
    }

    const dx = dest[0] - g.position.x;
    const dz = dest[1] - g.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 0.05) {
      const speed = wandering ? 0.5 + (care.vitals.energy / 100) * 0.5 : 1.6;
      const step = Math.min(dist, speed * dt);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;
      if (inner.current && !stone) {
        const heading = Math.atan2(dx, dz);
        let d = heading - inner.current.rotation.y;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        inner.current.rotation.y += d * Math.min(1, dt * 6);
      }
    }
    // sleeping squash
    if (inner.current) {
      const targetSquash = asleep ? 0.72 : 1;
      inner.current.scale.y += (targetSquash - inner.current.scale.y) * Math.min(1, dt * 5);
    }
  });

  const Body = CREATURE[def.id];
  const targetable = owner && held !== null && care.status === "awake";

  return (
    <group
      ref={group}
      position={[HOME[def.slot][0], 0, HOME[def.slot][1]]}
      onClick={(e) => {
        e.stopPropagation();
        if (owner && held) onTarget(def.id);
        else onSelect(def.id);
      }}
      onPointerOver={(e) => {
        cursorOn(owner ? "hand" : "magnify")(e);
        setHover(true);
      }}
      onPointerOut={() => {
        cursorOff();
        setHover(false);
      }}
    >
      {/* statue base */}
      {stone && (
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.55, 0.65, 0.12, 8]} />
          <meshStandardMaterial color={0x3b3f5c} flatShading />
        </mesh>
      )}
      <group ref={inner}>
        <Body hue={HUE[def.hue]} stone={stone} pace={pace} />
      </group>

      {/* very happy → ambient sparkles */}
      {owner && care.status === "awake" && care.vitals.happiness >= 85 && (
        <Sparkles count={14} scale={[1.2, 1, 1.2]} position={[0, 0.8, 0]} size={2.2} speed={0.4} color={HUE[def.hue]} />
      )}

      {/* emote / mood bubble */}
      {shownBubble && (
        <Html position={[0.35, 1.25, 0]} center distanceFactor={8} zIndexRange={[30, 0]}>
          <div className="pointer-events-none rounded-full border border-seam bg-cosmos/85 px-1.5 py-0.5 text-sm">
            {shownBubble}
          </div>
        </Html>
      )}

      {/* held-action target ring */}
      {targetable && <PulseRing color={HUE[def.hue]} radius={0.6} />}

      {/* hover HUD (owner only) */}
      {owner && hover && !stone && (
        <Html position={[0, 1.7, 0]} center distanceFactor={9} zIndexRange={[40, 0]}>
          <div className="pointer-events-none w-36 rounded-lg border border-seam bg-cosmos/90 p-2">
            <p className="mb-1 font-mono text-[8px]" style={{ color: HUE_CSS[def.hue] }}>
              {def.name}
            </p>
            <div className="space-y-0.5">
              <StatBar label="HGR" value={care.vitals.hunger} color="var(--ember)" />
              <StatBar label="HAP" value={care.vitals.happiness} color="var(--gilt)" />
              <StatBar label="NRG" value={care.vitals.energy} color="var(--lumen)" />
            </div>
          </div>
        </Html>
      )}
      {owner && hover && stone && (
        <Html position={[0, 1.6, 0]} center distanceFactor={9} zIndexRange={[40, 0]}>
          <div className="pointer-events-none whitespace-nowrap rounded border border-seam bg-cosmos/90 px-2 py-1 font-mono text-[8px] text-faint">
            DORMANT — activate below
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------- public plaque ---------- */

function Plaque() {
  return (
    <group position={[0.2, 0, 3.6]} rotation={[0, 0.05, 0]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 0.6, 6]} />
        <meshStandardMaterial color={0x5c4433} flatShading />
      </mesh>
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[0.9, 0.34, 0.05]} />
        <meshStandardMaterial color={0x7a5230} flatShading />
      </mesh>
      <Html position={[0, 0.62, 0.04]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <div className="pointer-events-none whitespace-nowrap rounded bg-transparent px-1 text-center font-mono text-[7px] leading-relaxed text-gilt">
          AGENT GARDEN
          <br />
          <span className="text-[6px] text-starlight/80">unlock to interact</span>
        </div>
      </Html>
    </group>
  );
}

/* ---------- the scene ---------- */

export function IslandScene({
  owner,
  held,
  onSelect,
  onTarget,
  onStation,
}: {
  owner: boolean;
  held: HeldAction;
  onSelect: (id: AgentId) => void;
  onTarget: (id: AgentId) => void;
  onStation: (s: StationId) => void;
}) {
  return (
    <>
      <color attach="background" args={["#05060f"]} />
      <fog attach="fog" args={["#05060f", 12, 26]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[6, 10, 4]} intensity={0.9} color="#dfe6ff" />
      <pointLight position={[-6, 4, -4]} intensity={16} color="#6a4bd6" distance={22} />

      {/* drifting void motes */}
      <Sparkles count={70} scale={[18, 8, 14]} position={[0, 2, 0]} size={1.4} speed={0.18} color="#8891bd" />

      <Float speed={1} rotationIntensity={0.02} floatIntensity={0.35}>
        <group>
          <Terrain />
          <Campfire neutral={!owner} />

          <Station id="food" owner={owner} active={held === "feed"} label="FOOD BOWL · arm kibble (1⚡)" onStation={onStation}>
            <FoodBowl armed={held === "feed"} />
          </Station>
          <Station id="toys" owner={owner} active={false} label="TOY CHEST · swap toy" onStation={onStation}>
            <ToyChest />
          </Station>
          <Station id="train" owner={owner} active={held === "train"} label="TRAINING POST · pick trainee (2⚡)" onStation={onStation}>
            <TrainingPost />
          </Station>
          <Station id="nap" owner={owner} active={held === "nap"} label="NAP SPOT · pick sleeper" onStation={onStation}>
            <NapSpot />
          </Station>

          {AGENTS.map((def) => (
            <CreatureActor
              key={def.id}
              def={def}
              owner={owner}
              held={held}
              onSelect={onSelect}
              onTarget={onTarget}
            />
          ))}

          {!owner && <Plaque />}
        </group>
      </Float>

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={6}
        maxDistance={15}
        minPolarAngle={0.6}
        maxPolarAngle={1.45}
        enableDamping
      />
    </>
  );
}
