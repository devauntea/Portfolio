/* Every word of page copy lives here — all real content (résumé, cover
   letter, GitHub). Edit freely; layouts adapt to length. */

export const TITLE = {
  name: "DEVAUNTAE NORMAN",
  subtitle: "Builder of worlds, both digital and real.",
  hint: "scroll to fall into the Archive",
};

export const ABOUT = {
  intro:
    "I'm Devauntae Norman — I build things, climb things, and occasionally burn dinner experimenting. This whole computer is my portfolio: open the folders, poke the apps, find the plant.",
  mission:
    "Fordham CS '26 with AI/ML internships behind me and a return offer in hand — looking for teams exploring the vast possibilities of AI, where ambiguous ideas get turned into shipped, trustworthy systems.",
  personality: ["builder", "belayer", "fail with purpose", "relentlessly positive"],
};

export interface Project {
  id: string;
  hue: string; // orb color token
  art: string; // emoji shown inside the orb + preview banner
  name: string;
  blurb: string;
  tech: string[];
  link?: string;
}

export const PROJECTS: Project[] = [
  {
    id: "aspect-niche",
    hue: "var(--lumen)",
    art: "🕸️",
    name: "Aspect Niche",
    blurb:
      "Obsidian-style interactive graph for hobby discovery — pan/zoom node clusters, an AI \"Rabbit Hole\" that invents personalized niches (Groq), and location-aware \"Find Nearby\" via Google Places.",
    tech: ["React/Next.js", "Groq API", "Google Places"],
    link: "https://aspectniche.com",
  },
  {
    id: "personaforge",
    hue: "var(--ember)",
    art: "🎭",
    name: "Personaforge — Adaptive Security",
    blurb:
      "Co-built an internal AI tool automating product-demo creation (~80% faster builds): Python/Node + FFmpeg pipeline plus a React operator console. The prototype informed a company-level product improvement, reached the CEO, and earned a return offer.",
    tech: ["Python", "Node.js", "FFmpeg", "Next.js"],
  },
  {
    id: "pokespire",
    hue: "var(--gilt)",
    art: "🃏",
    name: "PokeSpire",
    blurb:
      "Pokémon card game × Slay the Spire — a Swift roguelike deckbuilder mashup where gym badges are floor bosses and your deck evolves mid-run.",
    tech: ["Swift"],
    link: "https://github.com/devauntea/PokeSpire",
  },
  {
    id: "garment-prediction",
    hue: "var(--lumen)",
    art: "👕",
    name: "Garment-Prediction",
    blurb:
      "Python ML pipeline for garment attribute prediction, structured for reproducible experiments — manifests in, reports out.",
    tech: ["Python", "ML"],
    link: "https://github.com/devauntea/Garment-Prediction",
  },
  {
    id: "ml-eval",
    hue: "var(--sprout)",
    art: "📊",
    name: "ML Evaluation Harness — Anote",
    blurb:
      "Benchmarked FT-GPT-3.5, SETFIT, and BERT with stratified k-fold, macro-F1/latency tracking, and a dataset QA pipeline (schema checks, leakage detection) for reproducible model selection.",
    tech: ["Python", "Scikit-Learn", "NLP"],
  },
  {
    id: "agent-fleet",
    hue: "var(--gilt)",
    art: "🤖",
    name: "Autonomous Agent Fleet",
    blurb:
      "Four AI agents — job applications, web research, content drafting, paper trading — each with hard human-in-the-loop rails. Nothing submits, publishes, or trades without a person. They live in this computer's garden.",
    tech: ["Python", "LLM orchestration", "risk rails"],
  },
  {
    id: "devauntae-os",
    hue: "var(--rose)",
    art: "🖥️",
    name: "DevauntaeOS (this computer)",
    blurb:
      "A retro-desktop portfolio: draggable windows, a walkable 3D gallery, a tilting manila-folder résumé, five color schemes, and a hidden pet-care game — built with an agentic terminal workflow.",
    tech: ["Next.js", "TypeScript", "R3F", "Framer Motion"],
  },
];

export interface GameCartridge {
  id: string;
  name: string;
  color: string;
  memory: string;
}

export const GAMES: GameCartridge[] = [
  {
    id: "gungeon",
    name: "Enter the Gungeon",
    color: "#ff6e9a",
    memory:
      "The dodge roll rewired my brain. Still chasing the perfect Lead God run — one day the Bullet That Can Kill The Past gets used on my backlog.",
  },
  {
    id: "ror2",
    name: "Risk of Rain 2",
    color: "#7ee0ff",
    memory:
      "Loop until the framerate begs for mercy. Nothing teaches risk management like deciding whether to stay past the 25-minute mark.",
  },
  {
    id: "csgo",
    name: "CS:GO",
    color: "#ffd45e",
    memory:
      "Clutch-or-kick energy. My crosshair placement is better than my rank suggests, and my flashbangs occasionally blind the correct team.",
  },
  {
    id: "minecraft",
    name: "Minecraft",
    color: "#97e87a",
    memory:
      "The original sandbox. Half my redstone contraptions work; all of them are load-bearing to the base's personality.",
  },
];

export interface HobbyStation {
  id: string;
  icon: string;
  name: string;
  blurb: string;
}

export const HOBBIES: HobbyStation[] = [
  {
    id: "climbing",
    icon: "🧗",
    name: "Rock climbing",
    blurb: "Plastic and real rock — problems are just puzzles you're slightly scared of. The wall over there lights its holds when you look at it.",
  },
  {
    id: "pottery",
    icon: "🏺",
    name: "Pottery",
    blurb: "Wheel-thrown mugs with personalities. The clay on that wheel never stops morphing, which is honestly accurate to the process.",
  },
  {
    id: "upcycling",
    icon: "♻️",
    name: "Sewing & upcycling",
    blurb: "I sew and upcycle clothes and furniture — old parts, new purposes. The kinetic sculpture is made of everything I refused to throw away.",
  },
  {
    id: "photo",
    icon: "📷",
    name: "Photography & video",
    blurb: "I collect vintage digital cameras and actually shoot them — five point-and-shoots deep, capturing friends in that perfect 2007 flash.",
  },
  {
    id: "cooking",
    icon: "🍳",
    name: "Cooking",
    blurb: "Jamaican and Cuban roots, one kitchen. Salmon-shrimp rasta pasta is the house specialty; the recipe cards orbit the campfire for a reason.",
  },
  {
    id: "friends",
    icon: "✨",
    name: "Friends",
    blurb: "The long table with the sparkling chairs — always one seat open. Most of the camera roll is them.",
  },
];

export interface GalleryFrame {
  id: string;
  title: string;
  date: string;
  story: string;
  /** real print: file under public/images/gallery (falls back to the gradient) */
  src?: string;
  /** two color stops for the placeholder print (drei GradientTexture + CSS) */
  colors: [string, string];
}

export const GALLERY: GalleryFrame[] = [
  {
    id: "g1",
    title: "Cap, gown, Class of 2026",
    date: "May 2026",
    story: "Fordham quad after the walk — CSTEP stole on, family louder than the bells.",
    src: "/images/gallery/photo-1.jpg",
    colors: ["#7ee0ff", "#12172b"],
  },
  {
    id: "g2",
    title: "The point-and-shoot family",
    date: "ongoing",
    story: "Five rescued digicams, one tripod, zero regrets. The photography habit, fully out of hand.",
    src: "/images/gallery/photo-2.jpg",
    colors: ["#ffd45e", "#12172b"],
  },
  {
    id: "g3",
    title: "CSTEP send-off",
    date: "2026",
    story: "The program that had my back through Fordham — one last photoshoot with the cohort.",
    src: "/images/gallery/photo-3.jpg",
    colors: ["#ff6e9a", "#12172b"],
  },
  {
    id: "g4",
    title: "Blue hour, indoors",
    date: "2025",
    story: "When the lighting is this good, you stop apologizing for posing.",
    src: "/images/gallery/photo-4.jpg",
    colors: ["#97e87a", "#12172b"],
  },
  {
    id: "g5",
    title: "Sawdust Saturday",
    date: "2025",
    story: "Fresh pine legs on the deck, speed square standing by — upcycling build in progress.",
    src: "/images/gallery/photo-5.jpg",
    colors: ["#ff8a4d", "#12172b"],
  },
  {
    id: "g6",
    title: "Salmon-shrimp rasta pasta",
    date: "house specialty",
    story: "Jamaican and Cuban roots on one plate — scotch-bonnet cream, bell-pepper confetti, zero leftovers on record.",
    src: "/images/gallery/photo-6.jpg",
    colors: ["#ff6e4a", "#97e87a"],
  },
];

/** The resume sheet inside the manila folder — real content from
    Devauntae_Norman_Resume.docx (public/docs has the originals). */
export const RESUME = {
  name: "Devauntae Norman",
  tagline: "AI / Fullstack Engineer — builder of worlds, digital and real",
  contact:
    "devauntaenorman@gmail.com · linkedin.com/in/devauntae-norman · github.com/devauntea",
  sections: [
    {
      heading: "Education",
      items: [
        "Fordham University, New York, NY — B.S. in Computer Science, May 2026. Coursework: Data Structures & Algorithms, Networks, Databases, OS, Data Mining, OOP.",
      ],
    },
    {
      heading: "Experience",
      items: [
        "Adaptive Security — AI Product Intern (May 2025–Mar 2026): shipped an AI deepfake-detection pipeline end-to-end; Python/Node + FFmpeg automation cut production time ~80%; built the React/Next.js operator console.",
        "Anote — Back-End SWE Intern (2023): built ML evaluation infrastructure — benchmarked FT-GPT-3.5 / SETFIT / BERT with a stratified k-fold harness; dataset QA pipeline for reproducibility.",
        "Fordham CSTEP — Peer Instructor & Academic Counselor (2023–2025): wrote and taught a full Pre-Calculus curriculum; TA'd an intro AI course for high-school seniors.",
        "Cornell Tech, Break Through Tech AI — AI/ML Intern (2023): production-style supervised learning pipelines with metric-driven iteration.",
      ],
    },
    {
      heading: "Projects",
      items: [
        "Aspect Niche (aspectniche.com) — Obsidian-style hobby-discovery graph with AI \"Rabbit Hole\" recommendations (Groq) and location-aware search (Google Places).",
        "This computer — DevauntaeOS: a retro-desktop portfolio with a walkable 3D gallery and a hidden agent-care game.",
      ],
    },
    {
      heading: "Skills",
      items: [
        "Python · Java · C++ · JavaScript/TypeScript · Swift · PyTorch · TensorFlow · Scikit-Learn · React/Next.js · Tailwind · Git · AWS Bedrock",
      ],
    },
  ],
};

/** Documents filed in the résumé folder. `href` = downloadable; `gated` =
    shown as a tab but not stored on the server — clicking asks the visitor
    to reach out (the transcript is available on request only). */
export interface DocItem {
  label: string;
  icon: string;
  href?: string;
  gated?: boolean;
}
export const DOCS: DocItem[] = [
  { label: "Cover Letter", icon: "📎", href: "/docs/Devauntae_Norman_Cover_Letter.pdf" },
  { label: "Academic Transcript", icon: "🎓", gated: true },
];

export const CONTACT = {
  email: "devauntaenorman@gmail.com",
  links: [
    { label: "GitHub", href: "https://github.com/devauntea" },
    { label: "LinkedIn", href: "https://linkedin.com/in/devauntae-norman" },
  ],
  resumeHref: "/docs/Devauntae_Norman_Resume.docx",
};
