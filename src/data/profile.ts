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

/** The résumé sheet's FALLBACK content. The sheet normally renders the real
    PDF from /api/resume/file; this text stands in when pdf.js can't run, so
    keep it roughly in step with the uploaded document. */
export const RESUME = {
  name: "Devauntae Norman",
  tagline: "AI / Fullstack Engineer — builder of worlds, digital and real",
  contact:
    "New York, NY · devauntaenorman@gmail.com · linkedin.com/in/devauntae-norman · github.com/devauntea",
  sections: [
    {
      heading: "Education",
      items: [
        "Fordham University — B.S. in Computer Science, May 2026. Coursework: Data Structures & Algorithms, Database Systems, Operating Systems, Computer Networks, Data Mining.",
      ],
    },
    {
      heading: "Experience",
      items: [
        "Adaptive Security — Artificial Intelligence Product Intern (May 2025–Mar 2026): built a Python and Node.js service automating a four-stage FFmpeg media pipeline, cutting production time roughly 80%; developed an internal React/Next.js console for launching and monitoring long-running jobs, with retry logic and job-state logging.",
        "Anote — Back-End Software Engineering Intern (Aug–Dec 2023): engineered a Python evaluation harness benchmarking fine-tuned GPT-3.5, SetFit, and BERT with stratified k-fold cross-validation; built a dataset quality pipeline (schema validation, leakage detection, class-balance auditing) so results stayed reproducible across engineers.",
        "Cornell Tech, Break Through Tech AI — AI/ML Development Intern (Jun–Aug 2023): built supervised learning pipelines with reproducible splits, metric tracking, and error analysis; presented model tradeoffs to non-technical stakeholders.",
        "Fordham CSTEP — Peer Instructor & Academic Counselor (Sep 2023–May 2025): designed and taught a full Pre-Calculus curriculum and an introductory AI course for high school seniors within a 100+ student STEM program.",
      ],
    },
    {
      heading: "Projects",
      items: [
        "Aspect Niche (aspectniche.com) — full-stack activity discovery app with an interactive graph UI supporting pan, zoom, force-directed clustering, and progressive node expansion; dynamic graph data model with an LLM API behind server-side routes.",
        "Garment Prediction — reproducible image-classification pipeline split into manifest, preprocessing, training, and evaluation stages, rerunnable end to end from a single command.",
        "This computer — DevauntaeOS: a retro-desktop portfolio with a walkable 3D gallery and a hidden agent-care game.",
      ],
    },
    {
      heading: "Technical Skills",
      items: [
        "Languages: Python · Java · JavaScript · TypeScript · C++ · Swift · SQL · HTML · CSS",
        "Web and Backend: React · Next.js · Node.js · REST APIs · Tailwind CSS · SwiftUI",
        "AI and Data: PyTorch · TensorFlow · scikit-learn · AWS Bedrock · model evaluation · data pipelines",
        "Tools and Practices: Git · GitHub · Postman · Jupyter Notebook · VS Code · FFmpeg · Agile · unit testing · SDLC",
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
  resumeHref: "/api/resume/file?download=1",
};
