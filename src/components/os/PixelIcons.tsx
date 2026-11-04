"use client";

/* DevauntaeOS icon set, hand-drawn 16×16 pixel art, no emoji.
   Each icon is 16 strings of 16 characters; a character maps to a palette
   token, so every icon re-themes with the Display app's color scheme.
   Horizontal runs are merged into <rect>s at render time, and
   shape-rendering: crispEdges keeps the pixels square at any size. */

const PALETTE: Record<string, string> = {
  k: "var(--cosmos)", // outline / shadow
  s: "var(--seam)", // dark trim
  p: "var(--panel)", // neutral body
  f: "var(--faint)", // muted metal
  w: "var(--starlight)", // paper / highlight
  l: "var(--lumen)", // cyan
  g: "var(--gilt)", // gold
  e: "var(--ember)", // orange
  n: "var(--sprout)", // green
  r: "var(--rose)", // pink
};

/* ---------------------------------------------------------------- the art */

const ART = {
  /** ID badge, a lanyard card with a portrait */
  about: [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kllllllllllllk.",
    ".kllllllllllllk.",
    ".kppppppppppppk.",
    ".kppppwwwwppppk.",
    ".kppppwwwwppppk.",
    ".kppppwwwwppppk.",
    ".kpppppwwpppppk.",
    ".kppwwwwwwwwppk.",
    ".kpwwwwwwwwwwpk.",
    ".kwwwwwwwwwwwwk.",
    ".kwwwwwwwwwwwwk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
  ],

  /** toolbox with a gold latch */
  projects: [
    "................",
    "................",
    "......kkkk......",
    ".....kk..kk.....",
    "..kkkkkkkkkkkk..",
    "..keeeeeeeeeek..",
    "..keeeeeeeeeek..",
    "..kkkkkkkkkkkk..",
    "..keeeeeeeeeek..",
    "..keeeeggeeeek..",
    "..keeeeggeeeek..",
    "..keeeeeeeeeek..",
    "..keeeeeeeeeek..",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
  ],

  /** manila folder with a page inside */
  resume: [
    "................",
    "................",
    ".kkkkkk.........",
    ".keeeekkkkkkkkk.",
    ".keeeeeeeeeeeek.",
    ".kekkkkkkkkkkek.",
    ".kekwwwwwwwwkek.",
    ".kekwffffffwkek.",
    ".kekwwwwwwwwkek.",
    ".kekwffffwwwkek.",
    ".kekwwwwwwwwkek.",
    ".keeeeeeeeeeeek.",
    ".keeeeeeeeeeeek.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
  ],

  /** framed landscape, sun over a green ridge */
  gallery: [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kggggggggggggk.",
    ".kgkkkkkkkkkkgk.",
    ".kgkllllllllkgk.",
    ".kgklllllgglkgk.",
    ".kgklllllgglkgk.",
    ".kgkllllllllkgk.",
    ".kgkllnnllllkgk.",
    ".kgklnnnnlllkgk.",
    ".kgknnnnnnllkgk.",
    ".kgknnnnnnnnkgk.",
    ".kgkkkkkkkkkkgk.",
    ".kggggggggggggk.",
    ".kkkkkkkkkkkkkk.",
    "................",
  ],

  /** arcade joystick, ball top and two buttons */
  games: [
    "................",
    "......rrrr......",
    ".....rrrrrr.....",
    ".....rrrrrr.....",
    "......rrrr......",
    ".......ww.......",
    ".......ww.......",
    ".......ww.......",
    "..kkkkkkkkkkkk..",
    "..kffffffffffk..",
    "..kfllffffggfk..",
    "..kfllffffggfk..",
    "..kffffffffffk..",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
  ],

  /** a single leaf, veined, on a short stem */
  hobbies: [
    "................",
    ".......nn.......",
    "......nnnn......",
    ".....nnsnnn.....",
    "....nnnsnnnn....",
    "...nnnnsnnnnn...",
    "...nnnnsnnnnn...",
    "...nnnnsnnnnn...",
    "....nnnsnnnn....",
    ".....nnsnnn.....",
    "......nsnn......",
    ".......n........",
    ".......n........",
    ".......n........",
    "................",
    "................",
  ],

  /** sealed envelope, the way in */
  contact: [
    "................",
    "................",
    "..kkkkkkkkkkkk..",
    "..kllllllllllk..",
    "..klkllllllklk..",
    "..kllkllllkllk..",
    "..klllkllklllk..",
    "..kllllkkllllk..",
    "..kllllllllllk..",
    "..kllllllllllk..",
    "..kllllllllllk..",
    "..kllllllllllk..",
    "..kkkkkkkkkkkk..",
    "................",
    "................",
    "................",
  ],

  /** CRT monitor showing color bars */
  display: [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kppppppppppppk.",
    ".kpkkkkkkkkkkpk.",
    ".kpkllggeerrkpk.",
    ".kpkllggeerrkpk.",
    ".kpkllggeerrkpk.",
    ".kpkllggeerrkpk.",
    ".kpkllggeerrkpk.",
    ".kpkkkkkkkkkkpk.",
    ".kppppppppppppk.",
    ".kkkkkkkkkkkkkk.",
    "......kffk......",
    "....kkkkkkkk....",
    "................",
    "................",
  ],

  /** vinyl record catching the light, gold label */
  music: [
    "................",
    ".....ffffff.....",
    "...ffkkkkkkff...",
    "..ffkkkkkkkkff..",
    ".ffkkkkkkkkkkff.",
    ".fkkkkkkkkkkkkf.",
    ".fkkkkggggkkkkf.",
    ".fkkkkgwwgkkkkf.",
    ".fkkkkgwwgkkkkf.",
    ".fkkkkggggkkkkf.",
    ".fkkkkkkkkkkkkf.",
    ".ffkkkkkkkkkkff.",
    "..ffkkkkkkkkff..",
    "...ffkkkkkkff...",
    ".....ffffff.....",
    "................",
  ],

  /** a text file with a folded corner */
  readme: [
    "................",
    "...kkkkkkkk.....",
    "...kwwwwwwkk....",
    "...kwwwwwwwkk...",
    "...kwffffwwwk...",
    "...kwwwwwwwwk...",
    "...kwffffffwk...",
    "...kwwwwwwwwk...",
    "...kwffffffwk...",
    "...kwwwwwwwwk...",
    "...kwfffffwwk...",
    "...kwwwwwwwwk...",
    "...kwffffwwwk...",
    "...kkkkkkkkkk...",
    "................",
    "................",
  ],

  /** a potted seedling, the garden's door */
  garden: [
    "................",
    "................",
    "....nn....nn....",
    "...nnnn..nnnn...",
    "..nnnnnnnnnnnn..",
    "...nnnnnnnnnn...",
    ".....nnnnnn.....",
    ".......nn.......",
    ".......nn.......",
    "..kkkkkkkkkkkk..",
    "..keeeeeeeeeek..",
    "...keeeeeeeek...",
    "...keeeeeeeek...",
    "....keeeeeek....",
    "....kkkkkkkk....",
    "................",
  ],

  /** the OS mark, a four-point star */
  start: [
    "................",
    "................",
    ".......gg.......",
    ".......gg.......",
    "......gggg......",
    ".....gggggg.....",
    "...gggggggggg...",
    ".gggggggggggggg.",
    ".gggggggggggggg.",
    "...gggggggggg...",
    ".....gggggg.....",
    "......gggg......",
    ".......gg.......",
    ".......gg.......",
    "................",
    "................",
  ],

  /** speaker, sounding */
  "sound-on": [
    "................",
    "................",
    "................",
    "................",
    ".........w......",
    "........ww.l....",
    "...wwwwwww.l.l..",
    "...wwwwwww..l..l",
    "...wwwwwww..l..l",
    "...wwwwwww.l.l..",
    "........ww.l....",
    ".........w......",
    "................",
    "................",
    "................",
    "................",
  ],

  /** speaker, muted */
  "sound-off": [
    "................",
    "................",
    "................",
    "................",
    ".........w......",
    "........ww......",
    "...wwwwwww.r..r.",
    "...wwwwwww..rr..",
    "...wwwwwww..rr..",
    "...wwwwwww.r..r.",
    "........ww......",
    ".........w......",
    "................",
    "................",
    "................",
    "................",
  ],

  /** cursor-trail on: a live spark */
  "trail-on": [
    "................",
    "................",
    ".......g........",
    "......ggg.......",
    ".....ggggg......",
    "...ggggggggg....",
    "..ggggggggggg...",
    "...ggggggggg....",
    ".....ggggg......",
    "......ggg....l..",
    ".......g....lll.",
    ".............l..",
    "................",
    "................",
    "................",
    "................",
  ],

  /** cursor-trail off: the spark, dimmed and struck through */
  "trail-off": [
    "................",
    "................",
    ".......f........",
    "......fff.......",
    ".....fffff......",
    "...fffffffff....",
    "..fffffffffff...",
    "...fffffffff....",
    ".....fffff......",
    "......fff.......",
    ".......f........",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
} satisfies Record<string, string[]>;

export type PixelIconId = keyof typeof ART;

/* Fail loudly in development if a row drifts off the 16×16 grid. */
if (process.env.NODE_ENV !== "production") {
  for (const [id, rows] of Object.entries(ART)) {
    if (rows.length !== 16 || rows.some((r) => r.length !== 16)) {
      console.error(
        `PixelIcons: "${id}" is not 16×16 (${rows.length} rows: ${rows
          .map((r) => r.length)
          .join(",")})`,
      );
    }
  }
}

/** Merge each row's runs of one color into a single rect. */
function rects(rows: string[]) {
  const out: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w += 1;
      if (ch !== ".") out.push({ x, y, w, fill: PALETTE[ch] ?? PALETTE.w });
      x += w;
    }
  });
  return out;
}

/* Rects are derived once per icon, not on every render. */
const CACHE = new Map<string, ReturnType<typeof rects>>();
function shapes(id: PixelIconId) {
  let s = CACHE.get(id);
  if (!s) {
    s = rects(ART[id]);
    CACHE.set(id, s);
  }
  return s;
}

export function PixelIcon({
  id,
  className = "h-4 w-4",
  title,
}: {
  id: PixelIconId;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {shapes(id).map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.fill} />
      ))}
    </svg>
  );
}
