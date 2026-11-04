"use client";

/* Synthesized soundscape, Web Audio only, zero asset files (the brief
   allows procedural generation; Howler is unnecessary without files).
   Each realm gets an ambient profile, crossfaded as you scroll:
     title/gallery → soft celestial wind
     workshop      → low machine hum + occasional clank
     game          → a gentle chiptune arpeggio loop
     lounge        → nature noise + bird chirps
     observatory   → a warm celestial pad chord
   Everything is gated on the toggle (off by default), and the AudioContext
   is only created after a user gesture. */

import type { RealmId } from "./scroll-store";
import { useUi } from "./ui-store";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const layers = new Map<string, GainNode>();
let timers: number[] = [];
let currentProfile: string | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const on = () => useUi.getState().soundOn;

function layer(name: string, build: (c: AudioContext, out: GainNode) => void): GainNode {
  const c = ensureCtx()!;
  let g = layers.get(name);
  if (!g) {
    g = c.createGain();
    g.gain.value = 0;
    g.connect(master!);
    build(c, g);
    layers.set(name, g);
  }
  return g;
}

function noiseLayer(name: string, cutoff: number) {
  return layer(name, (c, out) => {
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = cutoff;
    src.connect(f).connect(out);
    src.start();
  });
}

function padLayer(name: string, freqs: number[]) {
  return layer(name, (c, out) => {
    for (const fq of freqs) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = fq;
      const g = c.createGain();
      g.gain.value = 0.25 / freqs.length;
      o.connect(g).connect(out);
      o.start();
    }
  });
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, when = 0) {
  const c = ensureCtx();
  if (!c || !master) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + when);
  g.gain.linearRampToValueAtTime(vol, c.currentTime + when + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + when);
  o.stop(c.currentTime + when + dur + 0.05);
}

function clearTimers() {
  for (const t of timers) window.clearInterval(t);
  timers = [];
}

/** Crossfade the ambient bed toward the given realm's profile. */
export function setAmbient(realm: RealmId | null) {
  const c = ensureCtx();
  if (!c || !master) return;
  const enabled = on() && realm !== null;
  master.gain.setTargetAtTime(enabled ? 0.14 : 0, c.currentTime, 0.4);
  if (!enabled) {
    clearTimers();
    currentProfile = null;
    return;
  }

  const profile =
    realm === "workshop" ? "workshop"
    : realm === "game" ? "game"
    : realm === "lounge" ? "lounge"
    : realm === "observatory" || realm === "gallery" ? "observatory" // hushed pad suits the exhibit
    : "space"; // title, office, transit

  if (profile === currentProfile) return;
  currentProfile = profile;
  clearTimers();

  // build all beds lazily, then fade the active one in and the rest out
  const beds: Record<string, GainNode> = {
    space: noiseLayer("space", 320),
    workshop: (() => {
      const g = padLayer("workshop", [55, 110, 164.8]);
      timers.push(
        window.setInterval(() => {
          if (on() && currentProfile === "workshop" && Math.random() < 0.4) {
            tone(320 + Math.random() * 180, 0.06, "square", 0.02); // clank
            tone(180, 0.1, "triangle", 0.018, 0.03);
          }
        }, 3400),
      );
      return g;
    })(),
    game: (() => {
      const g = layer("game", () => {});
      const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99, 880, 659.25];
      let i = 0;
      timers.push(
        window.setInterval(() => {
          if (on() && currentProfile === "game") {
            tone(notes[i % notes.length], 0.14, "square", 0.02);
            i++;
          }
        }, 280),
      );
      return g;
    })(),
    lounge: (() => {
      const g = noiseLayer("lounge", 900);
      timers.push(
        window.setInterval(() => {
          if (on() && currentProfile === "lounge" && Math.random() < 0.5) {
            const base = 2300 + Math.random() * 900;
            tone(base, 0.08, "sine", 0.025);
            tone(base * 1.3, 0.06, "sine", 0.02, 0.11);
          }
        }, 4200),
      );
      return g;
    })(),
    observatory: padLayer("observatory", [130.8, 196, 261.6, 329.6]),
  };

  for (const [name, g] of Object.entries(beds)) {
    g.gain.setTargetAtTime(name === profile ? 1 : 0, c.currentTime, 0.8);
  }
}

/** A rubber stamp slamming the desk. */
export function stampSlam() {
  if (!on()) return;
  tone(1400, 0.03, "square", 0.02);
  tone(90, 0.16, "sine", 0.09, 0.005);
  tone(46, 0.24, "sine", 0.07, 0.02);
}

/** Small UI sounds. */
export function chime() {
  if (!on()) return;
  tone(1046.5, 0.12, "triangle", 0.045);
  tone(1568, 0.16, "sine", 0.03, 0.05);
}
export function thunk() {
  if (!on()) return;
  tone(196, 0.09, "sine", 0.05);
}
export function fanfare() {
  if (!on()) return;
  [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) =>
    tone(f, 0.24, "triangle", 0.055, i * 0.13),
  );
}
