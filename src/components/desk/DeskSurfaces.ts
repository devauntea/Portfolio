import * as THREE from "three";
import type { Palette } from "./DeskMaterials";

/*
 * Procedural surface library for the desk scene. Every map is generated
 * once, deterministically, from the palette tokens: no downloaded images.
 *
 * "Surface" textures pack two linear channels into one image so a material
 * can use the same texture for both maps:
 *   R = height (bumpMap reads .r)
 *   G = roughness (roughnessMap reads .g; use material roughness = 1)
 */

type RGB = [number, number, number];

const scratch = new THREE.Color();
const srgb = { r: 0, g: 0, b: 0 };

export function toRGB(css: string): RGB {
  scratch.setStyle(css);
  scratch.getRGB(srgb, THREE.SRGBColorSpace);
  return [srgb.r * 255, srgb.g * 255, srgb.b * 255];
}

/** Blend two palette tokens; returns a CSS colour derived from the tokens. */
export function mix(a: string, b: string, t: number) {
  const from = new THREE.Color().setStyle(a);
  return `#${from.lerp(new THREE.Color().setStyle(b), t).getHexString()}`;
}

function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function canvas(width: number, height = width) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d", { willReadFrequently: true })!;
  return { element, ctx };
}

function colorTexture(element: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function dataTexture(element: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function repeat<T extends THREE.Texture>(texture: T, x: number, y = x) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(x, y);
  return texture;
}

/** Tileable fractal value noise, normalised to 0..1. */
function fbm(size: number, period: number, octaves: number, seed: number) {
  const out = new Float32Array(size * size);
  const rand = rng(seed);
  let amp = 1;
  for (let o = 0; o < octaves; o++) {
    const p = period << o;
    const lattice = new Float32Array(p * p);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
    const scale = p / size;
    for (let y = 0; y < size; y++) {
      const fy = y * scale,
        y0 = Math.floor(fy),
        ty = fy - y0,
        sy = ty * ty * (3 - 2 * ty);
      const r0 = (y0 % p) * p,
        r1 = ((y0 + 1) % p) * p;
      for (let x = 0; x < size; x++) {
        const fx = x * scale,
          x0 = Math.floor(fx),
          tx = fx - x0,
          sx = tx * tx * (3 - 2 * tx);
        const c0 = x0 % p,
          c1 = (x0 + 1) % p;
        const a = lattice[r0 + c0] + (lattice[r0 + c1] - lattice[r0 + c0]) * sx;
        const b = lattice[r1 + c0] + (lattice[r1 + c1] - lattice[r1 + c0]) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    amp *= 0.5;
  }
  let min = Infinity,
    max = -Infinity;
  for (const v of out) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min || 1;
  for (let i = 0; i < out.length; i++) out[i] = (out[i] - min) / range;
  return out;
}

/** A small greyscale field painted into a canvas so drawImage can upscale it. */
function fieldCanvas(
  field: Float32Array,
  size: number,
  paint: (v: number) => [number, number, number, number],
) {
  const { element, ctx } = canvas(size);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < field.length; i++) {
    const [r, g, b, a] = paint(field[i]);
    image.data[i * 4] = r;
    image.data[i * 4 + 1] = g;
    image.data[i * 4 + 2] = b;
    image.data[i * 4 + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  return element;
}

function noiseTile(size: number, seed: number) {
  const rand = rng(seed);
  const { element, ctx } = canvas(size);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = rand() * 255;
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return element;
}

/** Combine a height canvas and a roughness canvas into one R/G texture. */
function packSurface(
  height: HTMLCanvasElement,
  roughness: HTMLCanvasElement,
  width: number,
  heightPx = width,
) {
  const { element, ctx } = canvas(width, heightPx);
  ctx.drawImage(height, 0, 0, width, heightPx);
  const h = ctx.getImageData(0, 0, width, heightPx);
  ctx.drawImage(roughness, 0, 0, width, heightPx);
  const r = ctx.getImageData(0, 0, width, heightPx);
  for (let i = 0; i < h.data.length; i += 4) {
    h.data[i + 1] = r.data[i + 1];
    h.data[i + 2] = 128;
    h.data[i + 3] = 255;
  }
  ctx.putImageData(h, 0, 0);
  return dataTexture(element);
}

/* ------------------------------------------------------------------ wood */

/**
 * Oiled walnut: glued-up boards of uneven width, cathedral and straight
 * figure, open pores, and — on the desk top only — the wear of actual use:
 * a polished wrist rest, a faded coffee ring, and hairline scratches.
 */
export function woodMaps(
  p: Palette,
  { wear = false, width = 2048, seed = 57 } = {},
) {
  const W = width,
    H = width / 2,
    k = W / 2048;
  const rand = rng(seed);
  const figure = canvas(W, H);
  const f = figure.ctx;
  f.fillStyle = "white";
  f.fillRect(0, 0, W, H);
  const color = canvas(W, H);
  const c = color.ctx;
  c.fillStyle = p.wood;
  c.fillRect(0, 0, W, H);

  let top = 0,
    board = 0;
  while (top < H) {
    const h = Math.min(H - top, (150 + rand() * 95) * k);
    const cathedral = board % 2 === 0;
    // Each board is milled from a different part of the log.
    c.globalAlpha = 0.05 + rand() * 0.13;
    c.fillStyle = rand() < 0.55 ? p.woodDark : p.clay;
    c.fillRect(0, top, W, h);
    if (rand() < 0.35) {
      // A pale sapwood streak along one edge of some boards.
      const band = c.createLinearGradient(0, top, 0, top + h);
      band.addColorStop(0, p.clay);
      band.addColorStop(0.25, "transparent");
      c.globalAlpha = 0.18;
      c.fillStyle = band;
      c.fillRect(0, top, W, h);
    }
    c.globalAlpha = 1;

    f.save();
    f.beginPath();
    f.rect(0, top, W, h);
    f.clip();
    const lines = Math.floor(h / (2.6 * k));
    const cx = (220 + rand() * 1600) * k,
      cy = top + h * (0.35 + rand() * 0.3),
      phase = rand() * 10;
    for (let i = 0; i < lines; i++) {
      const y0 = top - h * 0.25 + (i / lines) * h * 1.5 + (rand() - 0.5) * 2 * k;
      const latewood = i % (5 + (board % 3)) === 0;
      f.strokeStyle = `rgba(0,0,0,${latewood ? 0.16 + rand() * 0.14 : 0.03 + rand() * 0.07})`;
      f.lineWidth = (latewood ? 0.9 + rand() * 1.4 : 0.4 + rand() * 0.8) * k;
      const spread = 0.45 + Math.abs(y0 - cy) / h;
      f.beginPath();
      for (let x = -16 * k; x <= W + 16 * k; x += 14 * k) {
        let yy = y0 + Math.sin(x / (330 * k) + phase + y0 / (90 * k)) * 4.5 * k;
        if (cathedral)
          yy -=
            Math.exp(-(((x - cx) / (300 * k * spread)) ** 2)) *
            Math.max(0, h * 0.5 - Math.abs(y0 - cy) * 0.6);
        if (x < 0) f.moveTo(x, yy);
        else f.lineTo(x, yy);
      }
      f.stroke();
    }
    // Open pores: short dark dashes that follow the grain.
    const pores = Math.floor(h * W * 0.0024);
    for (let i = 0; i < pores; i++) {
      const x = rand() * W,
        y = top + rand() * h;
      f.fillStyle = `rgba(0,0,0,${0.12 + rand() * 0.22})`;
      f.fillRect(x, y + Math.sin(x / (330 * k) + phase) * 4.5 * k, (2 + rand() * 6) * k, 0.8 * k);
    }
    f.restore();
    if (board) {
      // Glue line between boards.
      c.globalAlpha = 0.28;
      c.fillStyle = p.woodDark;
      c.fillRect(0, top - 0.5 * k, W, 1.2 * k);
      c.globalAlpha = 1;
    }
    top += h;
    board++;
  }

  c.globalCompositeOperation = "multiply";
  c.drawImage(figure.element, 0, 0);
  // Low-frequency colour drift so no two areas of the top are identical.
  const drift = fieldCanvas(fbm(128, 3, 4, seed + 9), 128, (v) => {
    const shade = 255 - v * 70;
    return [shade, shade * 0.97, shade * 0.93, 255];
  });
  c.globalAlpha = 0.55;
  c.drawImage(drift, 0, 0, W, H);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";

  // Roughness: an oiled finish, slightly rougher in the pores.
  const rough = canvas(W / 2, H / 2);
  const r = rough.ctx;
  r.fillStyle = "rgb(0,172,0)";
  r.fillRect(0, 0, W / 2, H / 2);
  r.globalCompositeOperation = "lighter";
  r.globalAlpha = 0.18;
  r.drawImage(invert(figure.element), 0, 0, W / 2, H / 2);
  r.globalAlpha = 1;
  r.globalCompositeOperation = "source-over";

  const height = canvas(W / 2, H / 2);
  height.ctx.drawImage(figure.element, 0, 0, W / 2, H / 2);

  if (wear) {
    const sx = W / 11.2,
      sz = H / 5.65;
    const at = (x: number, z: number): [number, number] => [
      (x + 5.6) * sx,
      (z + 2.825) * sz,
    ];
    // Wrists rest in front of the keyboard: finish rubbed pale and smooth.
    const [wx, wz] = at(0.3, 2.45);
    const rest = c.createRadialGradient(wx, wz, 0, wx, wz, 520 * k);
    rest.addColorStop(0, p.clay);
    rest.addColorStop(1, "transparent");
    c.save();
    c.translate(wx, wz);
    c.scale(1, 0.22);
    c.translate(-wx, -wz);
    c.globalAlpha = 0.32;
    c.fillStyle = rest;
    c.fillRect(wx - 560 * k, wz - 560 * k, 1120 * k, 1120 * k);
    c.restore();
    r.save();
    r.translate(wx / 2, wz / 2);
    r.scale(1, 0.22);
    const polish = r.createRadialGradient(0, 0, 0, 0, 0, 260 * k);
    polish.addColorStop(0, "rgba(0,0,0,0.42)");
    polish.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = polish;
    r.fillRect(-280 * k, -280 * k, 560 * k, 560 * k);
    r.restore();

    // The front edge loses its finish first.
    const edge = c.createLinearGradient(0, H - 70 * k, 0, H);
    edge.addColorStop(0, "transparent");
    edge.addColorStop(1, p.clay);
    c.globalAlpha = 0.28;
    c.fillStyle = edge;
    c.fillRect(0, H - 70 * k, W, 70 * k);
    c.globalAlpha = 1;

    // An old coffee ring that never quite sanded out, and its fainter twin:
    // a dried edge with a soft inner bloom, never a drawn circle.
    [
      { x: -3.3, z: 2.18, radius: 0.215, alpha: 0.2 },
      { x: -3.1, z: 2.32, radius: 0.208, alpha: 0.08 },
    ].forEach(({ x, z, radius, alpha }, ring) => {
      const [rx, rz] = at(x, z);
      const rr = radius * sx;
      const bloom = c.createRadialGradient(rx, rz, rr * 0.55, rx, rz, rr * 1.02);
      bloom.addColorStop(0, "transparent");
      bloom.addColorStop(0.8, p.woodDark);
      bloom.addColorStop(1, "transparent");
      c.globalAlpha = alpha * 0.35;
      c.fillStyle = bloom;
      c.fillRect(rx - rr * 1.1, rz - rr * 1.1, rr * 2.2, rr * 2.2);
      c.strokeStyle = p.woodDark;
      for (let pass = 0; pass < 14; pass++) {
        const start = rand() * Math.PI * 2,
          sweep = 0.6 + rand() * (ring ? 2.2 : 3.6);
        c.globalAlpha = alpha * (0.15 + rand() * 0.25);
        c.lineWidth = (0.8 + rand() * 2.2) * k;
        c.beginPath();
        c.ellipse(
          rx + (rand() - 0.5) * 1.5 * k,
          rz + (rand() - 0.5) * 1.5 * k,
          rr * (0.97 + rand() * 0.06),
          rr * (sz / sx) * (0.97 + rand() * 0.06),
          0,
          start,
          start + sweep,
        );
        c.stroke();
      }
      r.globalCompositeOperation = "lighter";
      r.strokeStyle = `rgba(0,${alpha * 140},0,1)`;
      r.lineWidth = 2.5 * k;
      r.beginPath();
      r.ellipse(rx / 2, rz / 2, rr / 2, (rr / 2) * (sz / sx), 0, 0, Math.PI * 2);
      r.stroke();
      r.globalCompositeOperation = "source-over";
    });
    c.globalAlpha = 1;

    // Hairline scratches, mostly where hands and objects actually move.
    for (let i = 0; i < 260; i++) {
      const x = (rand() < 0.7 ? -2.4 + rand() * 6.2 : -5.4 + rand() * 10.8),
        z = -1.8 + rand() * 4.5;
      const [px, pz] = at(x, z);
      const angle = (rand() - 0.5) * 1.1 + (rand() < 0.3 ? Math.PI / 2 : 0);
      const len = (10 + rand() * 70) * k;
      const dx = Math.cos(angle) * len,
        dz = Math.sin(angle) * len;
      c.strokeStyle = p.clay;
      c.globalAlpha = 0.07 + rand() * 0.1;
      c.lineWidth = 0.6 * k;
      c.beginPath();
      c.moveTo(px, pz);
      c.lineTo(px + dx, pz + dz);
      c.stroke();
      height.ctx.strokeStyle = "rgba(0,0,0,0.35)";
      height.ctx.lineWidth = 0.6 * k;
      height.ctx.beginPath();
      height.ctx.moveTo(px / 2, pz / 2);
      height.ctx.lineTo((px + dx) / 2, (pz + dz) / 2);
      height.ctx.stroke();
    }
    c.globalAlpha = 1;
    // A few dents from dropped tools.
    for (let i = 0; i < 26; i++) {
      const [px, pz] = at(-5 + rand() * 10, -2 + rand() * 4.6);
      const dent = height.ctx.createRadialGradient(px / 2, pz / 2, 0, px / 2, pz / 2, 4 * k);
      dent.addColorStop(0, "rgba(0,0,0,0.5)");
      dent.addColorStop(1, "rgba(0,0,0,0)");
      height.ctx.fillStyle = dent;
      height.ctx.fillRect(px / 2 - 5 * k, pz / 2 - 5 * k, 10 * k, 10 * k);
    }
  }

  // Fine tooth that keeps flat colour from reading as plastic.
  c.globalCompositeOperation = "overlay";
  c.globalAlpha = 0.07;
  c.fillStyle = c.createPattern(noiseTile(128, seed + 3), "repeat")!;
  c.fillRect(0, 0, W, H);
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";

  return {
    map: colorTexture(color.element),
    surface: packSurface(height.element, rough.element, W / 2, H / 2),
  };
}

function invert(source: HTMLCanvasElement) {
  const { element, ctx } = canvas(source.width, source.height);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, source.width, source.height);
  ctx.globalCompositeOperation = "difference";
  ctx.drawImage(source, 0, 0);
  return element;
}

/* --------------------------------------------------------------- plastic */

/**
 * Aged ABS: uneven yellowing, handled grime and a fine moulded (VDI) tooth.
 * `tint` is near-white and multiplies the material colour, so one map ages
 * every beige plastic part in the scene.
 */
export function plasticMaps(seed = 11) {
  const size = 256;
  const yellow = fbm(size, 4, 4, seed);
  const grime = fbm(size, 12, 3, seed + 1);
  const rand = rng(seed + 2);
  const { element: tint, ctx: t } = canvas(size);
  const image = t.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    // A base of even age, plus gentle sun-yellowing and handled grime.
    const y = 0.35 + THREE.MathUtils.smoothstep(yellow[i], 0.3, 0.9) * 0.4;
    const g = THREE.MathUtils.smoothstep(grime[i], 0.7, 0.98) * 0.3;
    const speck = (rand() - 0.5) * 4;
    image.data[i * 4] = 255 - y * 3 - g * 14 + speck;
    image.data[i * 4 + 1] = 255 - y * 12 - g * 16 + speck;
    image.data[i * 4 + 2] = 255 - y * 40 - g * 20 + speck;
    image.data[i * 4 + 3] = 255;
  }
  t.putImageData(image, 0, 0);

  const tooth = fieldCanvas(fbm(size, 64, 2, seed + 3), size, (v) => {
    const n = 128 + (v - 0.5) * 150 + (rand() - 0.5) * 40;
    return [n, n, n, 255];
  });
  const handled = fieldCanvas(fbm(size, 4, 3, seed + 4), size, (v) => {
    // Matte moulded finish, buffed a little smoother where it is touched.
    const r = 178 - THREE.MathUtils.smoothstep(v, 0.55, 0.95) * 42;
    return [0, r + (rand() - 0.5) * 10, 0, 255];
  });
  return {
    tint: colorTexture(tint),
    surface: repeat(packSurface(tooth, handled, size), 3),
  };
}

/* ------------------------------------------------------------------ wall */

export const BRICK = { width: 1.3, course: 0.433, tile: 5.2 };

/**
 * Limewashed brick. The wash is thick enough to keep the wall light behind
 * the headline, thin enough in places for the warm brick to show; it fills
 * the pits, softens the arrises and runs over the mortar in brush strokes.
 * Tile = 4 bricks × 12 courses, mapped in world units (BRICK.tile).
 */
export function brickMaps(p: Palette, seed = 23) {
  const S = 1024,
    bw = S / 4,
    ch = S / 12,
    m = 10;
  const rand = rng(seed);
  const lime = toRGB(p.limewash),
    fired = toRGB(p.brick),
    joint = toRGB(mix(p.limewash, p.shadow, 0.22));
  // Per-brick character: tone, how thin the wash went on, how worn.
  const bricks = Array.from({ length: 12 * 4 }, () => ({
    tone: (rand() - 0.5) * 0.08,
    warm: rand() * 0.035,
    wash: rand() < 0.3 ? 0.06 + rand() * 0.15 : rand() * 0.04,
  }));
  const low = fbm(256, 5, 4, seed + 1);
  const mid = fbm(256, 40, 3, seed + 2);
  const edge = fbm(256, 36, 2, seed + 3);
  const colour = canvas(S),
    surface = canvas(S);
  const c = colour.ctx.createImageData(S, S),
    h = surface.ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    const row = Math.floor(y / ch),
      ly = y - row * ch,
      off = row % 2 ? bw / 2 : 0;
    for (let x = 0; x < S; x++) {
      const cx = x - off,
        cell = Math.floor(cx / bw),
        lx = cx - cell * bw,
        col = ((cell % 4) + 4) % 4;
      const L = low[(y >> 2) * 256 + (x >> 2)],
        M = mid[(y >> 2) * 256 + (x >> 2)],
        E = edge[(y >> 2) * 256 + (x >> 2)];
      const white = rand();
      // Distance into the brick face, with wobbly, chipped arrises.
      const d = Math.min(lx, bw - lx, ly, ch - ly) - m / 2 + (E - 0.5) * 9;
      const i = (y * S + x) * 4;
      let r: number, g: number, b: number, height: number, rough: number;
      if (d > 0) {
        const brick = bricks[row * 4 + col];
        const pit = white < 0.014 ? 0.35 : 0;
        // Wash thins at random and on the arrises, showing fired brick.
        const show = Math.min(
          0.55,
          brick.wash * (0.4 + M * 1.2) + Math.max(0, 1 - d / 4) * 0.08,
        );
        const shade = 1 + brick.tone - (L - 0.5) * 0.1 - pit * 0.35 + (white - 0.5) * 0.05;
        r = (lime[0] + (fired[0] - lime[0]) * show) * shade * (1 + brick.warm);
        g = (lime[1] + (fired[1] - lime[1]) * show) * shade;
        b = (lime[2] + (fired[2] - lime[2]) * show) * shade * (1 - brick.warm);
        height = 0.62 + Math.min(1, d / 3) * 0.16 + (M - 0.5) * 0.3 + (white - 0.5) * 0.1 - pit;
        rough = 0.88 + (white - 0.5) * 0.08;
      } else {
        const sand = 0.93 + white * 0.1 + (M - 0.5) * 0.08;
        r = joint[0] * sand;
        g = joint[1] * sand;
        b = joint[2] * sand;
        height = 0.16 + white * 0.14 + M * 0.12;
        rough = 0.97;
      }
      c.data[i] = r;
      c.data[i + 1] = g;
      c.data[i + 2] = b;
      c.data[i + 3] = 255;
      h.data[i] = height * 255;
      h.data[i + 1] = rough * 255;
      h.data[i + 2] = 128;
      h.data[i + 3] = 255;
    }
  }
  colour.ctx.putImageData(c, 0, 0);
  surface.ctx.putImageData(h, 0, 0);
  // Soft passes of fresh wash run across bricks and joints alike.
  const ctx = colour.ctx;
  const wash = mix(p.limewash, p.paper, 0.4);
  for (let i = 0; i < 40; i++) {
    const x = rand() * S,
      y = rand() * S,
      len = 90 + rand() * 200,
      tall = 10 + rand() * 18,
      alpha = 0.08 + rand() * 0.12,
      tilt = (rand() - 0.5) * 0.18;
    const reach = len / 2 + tall;
    for (const dx of [-S, 0, S])
      for (const dy of [-S, 0, S]) {
        // Repeat across a tile edge so the tile stays seamless.
        if (x + dx < -reach || x + dx > S + reach) continue;
        if (y + dy < -reach || y + dy > S + reach) continue;
        ctx.save();
        ctx.translate(x + dx, y + dy);
        ctx.rotate(tilt);
        ctx.scale(len / tall, 1);
        const stroke = ctx.createRadialGradient(0, 0, 0, 0, 0, tall);
        stroke.addColorStop(0, wash);
        stroke.addColorStop(1, "transparent");
        ctx.globalAlpha = alpha;
        ctx.fillStyle = stroke;
        ctx.fillRect(-tall, -tall, tall * 2, tall * 2);
        ctx.restore();
      }
  }
  ctx.globalAlpha = 1;
  return {
    map: colorTexture(colour.element),
    surface: dataTexture(surface.element),
  };
}

/* ----------------------------------------------------------------- floor */

/** Sealed concrete with trowel marks, aggregate and a sawn control joint. */
export function concreteMaps(p: Palette, seed = 41) {
  const S = 1024;
  const rand = rng(seed);
  const { element, ctx } = canvas(S);
  const base = mix(p.shadow, p.muted, 0.45);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  const mottle = fbm(256, 4, 5, seed);
  const light = toRGB(mix(p.shadow, p.paper, 0.2)),
    dark = toRGB(mix(p.muted, p.woodDark, 0.4));
  ctx.globalAlpha = 0.6;
  ctx.drawImage(
    fieldCanvas(mottle, 256, (v) => {
      const [r, g, b] = v > 0.5 ? light : dark;
      return [r, g, b, Math.abs(v - 0.5) * 2 * 90];
    }),
    0,
    0,
    S,
    S,
  );
  ctx.globalAlpha = 1;
  // Trowel arcs.
  for (let i = 0; i < 70; i++) {
    const x = rand() * S,
      y = rand() * S,
      radius = 80 + rand() * 260;
    ctx.strokeStyle = rand() < 0.5 ? p.ivory : p.ink;
    ctx.globalAlpha = 0.025 + rand() * 0.03;
    ctx.lineWidth = 6 + rand() * 22;
    ctx.beginPath();
    ctx.arc(x, y, radius, rand() * 6, rand() * 6 + 0.6 + rand());
    ctx.stroke();
  }
  // Aggregate.
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = rand() < 0.5 ? p.ivory : p.ink;
    ctx.globalAlpha = 0.08 + rand() * 0.2;
    const sz = 0.8 + rand() * 2.4;
    ctx.fillRect(rand() * S, rand() * S, sz, sz);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = ctx.createPattern(noiseTile(256, seed + 2), "repeat")!;
  ctx.fillRect(0, 0, S, S);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  const height = canvas(S);
  const h = height.ctx;
  h.fillStyle = "rgb(150,150,150)";
  h.fillRect(0, 0, S, S);
  // Hairline cracks, drawn into colour and height together.
  const cracks: [number, number][][] = [];
  for (let i = 0; i < 3; i++) {
    let x = rand() * S,
      y = rand() * S,
      angle = rand() * Math.PI * 2;
    const path: [number, number][] = [[x, y]];
    for (let j = 0; j < 22; j++) {
      angle += (rand() - 0.5) * 0.9;
      x += Math.cos(angle) * 14;
      y += Math.sin(angle) * 14;
      path.push([x, y]);
    }
    cracks.push(path);
  }
  for (const target of [ctx, h]) {
    target.strokeStyle = target === ctx ? p.ink : "rgba(0,0,0,0.8)";
    target.globalAlpha = target === ctx ? 0.35 : 1;
    target.lineWidth = 1.2;
    cracks.forEach((path) => {
      target.beginPath();
      path.forEach(([x, y], i) => (i ? target.lineTo(x, y) : target.moveTo(x, y)));
      target.stroke();
    });
    // Saw-cut control joints at the tile edge.
    target.globalAlpha = target === ctx ? 0.5 : 1;
    target.fillStyle = target === ctx ? p.ink : "rgb(20,20,20)";
    target.fillRect(0, 0, S, 4);
    target.fillRect(0, 0, 4, S);
    target.globalAlpha = 1;
  }
  h.globalCompositeOperation = "overlay";
  h.globalAlpha = 0.5;
  h.fillStyle = h.createPattern(noiseTile(256, seed + 4), "repeat")!;
  h.fillRect(0, 0, S, S);
  const rough = fieldCanvas(fbm(256, 3, 4, seed + 5), 256, (v) => [
    0,
    110 + v * 110,
    0,
    255,
  ]);
  return {
    map: colorTexture(element),
    surface: packSurface(height.element, rough, 512),
  };
}

/* --------------------------------------------------------- light & shadow */

/**
 * A light cookie for the low sun: a steel factory sash beyond the left edge
 * of frame, with a few leaves from a tree outside. Drawn small so linear
 * filtering softens every edge into a believable penumbra.
 */
export function goboTexture() {
  const big = canvas(512);
  const g = big.ctx;
  g.fillStyle = "black";
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = "white";
  // The sash stays inside the spotlight's inscribed circle.
  const cols = 4,
    rows = 3,
    left = 100,
    top = 92,
    width = 312,
    height = 328,
    bar = 11;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const pw = (width - bar * (cols - 1)) / cols,
        ph = (height - bar * (rows - 1) - (r === 0 ? bar : 0)) / rows;
      g.fillRect(
        left + c * (pw + bar),
        top + r * (ph + bar) + (r > 0 ? bar : 0),
        pw,
        ph,
      );
    }
  // Foliage from outside breaks the grid's regularity.
  const rand = rng(5);
  g.fillStyle = "black";
  for (let i = 0; i < 30; i++) {
    const a = rand() * 1.4 + 0.3;
    const x = 420 + Math.cos(a) * (40 + rand() * 110) - 60,
      y = 60 + Math.sin(a) * (40 + rand() * 110);
    g.save();
    g.translate(x, y);
    g.rotate(rand() * Math.PI);
    g.beginPath();
    g.ellipse(0, 0, 9 + rand() * 13, 4 + rand() * 6, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
  g.strokeStyle = "black";
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(430, 40);
  g.quadraticCurveTo(400, 90, 330, 170);
  g.stroke();
  const small = canvas(160);
  small.ctx.imageSmoothingQuality = "high";
  small.ctx.drawImage(big.element, 0, 0, 160, 160);
  const texture = colorTexture(small.element);
  texture.anisotropy = 1;
  return texture;
}

/** Soft rounded-rectangle falloff for grounding objects on surfaces. */
export function contactTexture(roundness = 0.6) {
  const S = 128;
  const { element, ctx } = canvas(S);
  const image = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const u = Math.abs((x + 0.5) / S - 0.5) * 2,
        v = Math.abs((y + 0.5) / S - 0.5) * 2;
      // Signed distance to a rounded box occupying the inner 55%.
      const inner = 0.55,
        r = roundness * inner;
      const qx = Math.max(u - inner + r, 0),
        qy = Math.max(v - inner + r, 0);
      const d =
        Math.hypot(qx, qy) + Math.min(Math.max(u - inner + r, v - inner + r), 0) - r;
      const a = 1 - THREE.MathUtils.smoothstep(d, -0.35, 0.45);
      const i = (y * S + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
      image.data[i + 3] = a * a * 255;
    }
  ctx.putImageData(image, 0, 0);
  return colorTexture(element);
}

/* ----------------------------------------------------------------- print */

/**
 * Turn a photograph into a print: warm paper base, slightly lifted blacks,
 * soft edge falloff from the lab enlarger and a little paper tooth.
 */
export function printTexture(image: HTMLImageElement | ImageBitmap, p: Palette) {
  const scale = Math.min(1, 1024 / Math.max(image.width, image.height));
  const W = Math.round(image.width * scale),
    H = Math.round(image.height * scale);
  const { element, ctx } = canvas(W, H);
  ctx.drawImage(image, 0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = p.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = p.muted;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 0.5;
  const falloff = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  falloff.addColorStop(0, "transparent");
  falloff.addColorStop(1, p.clay);
  ctx.fillStyle = falloff;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = ctx.createPattern(noiseTile(128, 77), "repeat")!;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  return colorTexture(element);
}

/** Fine, uniform tooth for paint, powder coat, paper and glass grime. */
export function toothSurface(seed = 3, roughness = 0.6) {
  const tooth = fieldCanvas(fbm(128, 32, 2, seed), 128, (v) => {
    const n = 128 + (v - 0.5) * 120;
    return [n, n, n, 255];
  });
  const rough = fieldCanvas(fbm(128, 4, 3, seed + 1), 128, (v) => [
    0,
    255 * roughness + (v - 0.5) * 40,
    0,
    255,
  ]);
  return repeat(packSurface(tooth, rough, 128), 4);
}

/** Uneven film of dust and fingerprints on glass, as an alpha map (G). */
export function grimeTexture(seed = 61) {
  const field = fbm(256, 4, 5, seed);
  const S = 256;
  const { element, ctx } = canvas(S);
  const image = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      // Heavier toward the lower corners, where rain and hands leave marks.
      const corner = Math.max(0, (y / S - 0.55) * 2) * (0.6 + Math.abs(x / S - 0.5));
      const v = 70 + field[i] * 120 + corner * 70;
      image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v;
      image.data[i * 4 + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  return dataTexture(element);
}

/** Land a mortar joint exactly on a given height (the window head). */
function courseAligned(texture: THREE.Texture, height: number) {
  const courses = (height / BRICK.tile) * 12;
  texture.offset.y = (Math.ceil(courses) - courses) / 12;
  return texture;
}

export type Surfaces = {
  wood: THREE.Texture;
  woodSurface: THREE.Texture;
  deskTop: THREE.Texture;
  deskTopSurface: THREE.Texture;
  plasticTint: THREE.Texture;
  plasticSurface: THREE.Texture;
  wall: THREE.Texture;
  wallSurface: THREE.Texture;
  floor: THREE.Texture;
  floorSurface: THREE.Texture;
  tooth: THREE.Texture;
  grime: THREE.Texture;
  gobo: THREE.Texture;
  contact: THREE.Texture;
  contactRound: THREE.Texture;
  dispose: () => void;
};

export function createSurfaces(
  p: Palette,
  { wallHead = 0 }: { wallHead?: number } = {},
): Surfaces {
  const desk = woodMaps(p, { wear: true, width: 2048, seed: 57 });
  const wood = woodMaps(p, { width: 1024, seed: 83 });
  const plastic = plasticMaps();
  const wall = brickMaps(p);
  const floor = concreteMaps(p);
  repeat(floor.map, 5);
  repeat(floor.surface, 5);
  const textures = {
    wood: wood.map,
    woodSurface: wood.surface,
    deskTop: desk.map,
    deskTopSurface: desk.surface,
    plasticTint: plastic.tint,
    plasticSurface: plastic.surface,
    wall: courseAligned(repeat(wall.map, 1 / BRICK.tile), wallHead),
    wallSurface: courseAligned(repeat(wall.surface, 1 / BRICK.tile), wallHead),
    floor: floor.map,
    floorSurface: floor.surface,
    tooth: toothSurface(),
    grime: grimeTexture(),
    gobo: goboTexture(),
    contact: contactTexture(0.35),
    contactRound: contactTexture(1),
  };
  return {
    ...textures,
    dispose: () => Object.values(textures).forEach((t) => t.dispose()),
  };
}
