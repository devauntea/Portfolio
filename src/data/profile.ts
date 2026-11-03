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
  personality: [
    "builder",
    "belayer",
    "fail with purpose",
    "relentlessly positive",
  ],
};

export interface Project {
  id: string;
  hue: string; // orb color token
  art: string; // emoji shown inside the orb + preview banner
  name: string;
  blurb: string;
  tech: string[];
  link?: string;
  image?: { src: string; alt: string };
}

export const PROJECTS: Project[] = [
  {
    id: "aspect-niche",
    hue: "var(--lumen)",
    art: "🕸️",
    name: "Aspect Niche",
    blurb:
      'Obsidian-style interactive graph for hobby discovery — pan/zoom node clusters, an AI "Rabbit Hole" that invents personalized niches (Groq), and location-aware "Find Nearby" via Google Places.',
    tech: ["React/Next.js", "Groq API", "Google Places"],
    link: "https://aspectniche.com",
  },
  {
    id: "swale",
    hue: "var(--lumen)",
    art: "🌧️",
    name: "Swale",
    blurb:
      "A Brooklyn flood-readiness prototype connecting NYC catch basins, 311 reports, weather, and transit data on a 3D map. Storm scenarios, drain-priority rankings, and multilingual voice briefings help make the evidence easier to explore.",
    tech: [
      "React / TypeScript",
      "MapLibre / deck.gl",
      "Python / FastAPI",
      "SurrealDB",
      "Amazon Bedrock",
    ],
    link: "https://github.com/devauntea/Swale",
    image: {
      src: "/images/projects/swale.webp",
      alt: "Swale project tour showing its Brooklyn 3D flood-readiness map",
    },
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
    blurb:
      "Plastic and real rock — problems are just puzzles you're slightly scared of. The wall over there lights its holds when you look at it.",
  },
  {
    id: "pottery",
    icon: "🏺",
    name: "Pottery",
    blurb:
      "Wheel-thrown mugs with personalities. The clay on that wheel never stops morphing, which is honestly accurate to the process.",
  },
  {
    id: "upcycling",
    icon: "♻️",
    name: "Sewing & upcycling",
    blurb:
      "I sew and upcycle clothes and furniture — old parts, new purposes. The kinetic sculpture is made of everything I refused to throw away.",
  },
  {
    id: "photo",
    icon: "📷",
    name: "Photography & video",
    blurb:
      "I collect vintage digital cameras and actually shoot them — five point-and-shoots deep, capturing friends in that perfect 2007 flash.",
  },
  {
    id: "cooking",
    icon: "🍳",
    name: "Cooking",
    blurb:
      "Jamaican and Cuban roots, one kitchen. Salmon-shrimp rasta pasta is the house specialty; the recipe cards orbit the campfire for a reason.",
  },
  {
    id: "friends",
    icon: "✨",
    name: "Friends",
    blurb:
      "The long table with the sparkling chairs — always one seat open. Most of the camera roll is them.",
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
    story:
      "Fordham quad after the walk — CSTEP stole on, family louder than the bells.",
    src: "/images/gallery/photo-1.jpg",
    colors: ["#7ee0ff", "#12172b"],
  },
  {
    id: "g2",
    title: "The point-and-shoot family",
    date: "ongoing",
    story:
      "Five rescued digicams, one tripod, zero regrets. The photography habit, fully out of hand.",
    src: "/images/gallery/photo-2.jpg",
    colors: ["#ffd45e", "#12172b"],
  },
  {
    id: "g3",
    title: "CSTEP send-off",
    date: "2026",
    story:
      "The program that had my back through Fordham — one last photoshoot with the cohort.",
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
    story:
      "Fresh pine legs on the deck, speed square standing by — upcycling build in progress.",
    src: "/images/gallery/photo-5.jpg",
    colors: ["#ff8a4d", "#12172b"],
  },
  {
    id: "g6",
    title: "Salmon-shrimp rasta pasta",
    date: "house specialty",
    story:
      "Jamaican and Cuban roots on one plate — scotch-bonnet cream, bell-pepper confetti, zero leftovers on record.",
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
  {
    label: "Cover Letter",
    icon: "📎",
    href: "/docs/Devauntae_Norman_Cover_Letter.pdf",
  },
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

/** The working desk: presentation copy, with the original résumé as source. */
export const DESK = {
  name: "Devauntae Norman",
  initials: "dn.",
  role: "AI & full-stack engineer",
  location: "Based in New York",
  eyebrow: "A SPACE FOR WORK & WONDER",
  headline: ["Serious about", "building.", "Curious about", "everything."],
  intro:
    "A few things I’ve made. A little of who I am. Pull up a chair and make yourself at home.",
  enter: "Explore my work",
  monitor: "Enter the computer",
  files: "Open the résumé drawer",
  lamp: "Change the lighting",
  photo: "Pick up the camera",
  tip: "The objects have stories. Go ahead, click around.",
  status: "Built with curiosity. Best explored slowly.",
  loading: "Setting the desk…",
  sceneLabel:
    "Interactive studio with a working computer screen, bookshelf, posters, brick cat, résumé drawer, blinds, sewing machine, and stereo speakers",
  shortcuts: "Portfolio shortcuts",
  folders: "Computer folders",
  sectionsLabel: "Portfolio sections",
  resumeLabel: "Résumé",
  edition: "NEW YORK, NY / PERSONAL WORKSPACE",
  computerLabel: "NORMAN / PERSONAL COMPUTER",
  fileLabel: "001 — RÉSUMÉ",
  notebookLabel: "STAY CURIOUS.",
  ideasLabel: "IDEAS / IN PROGRESS",
  details: {
    keyboard: "NORMAN  /  TYPE 01",
    tower: "DN / 01",
    mat: "MADE TO MAKE.",
    sketch: "01 / EXPLORING THE POSSIBILITIES",
    note: "a little better, every day.",
    monitor: "COLOR DISPLAY / MODEL 026",
    folders: [
      "EXPERIENCE",
      "PROJECTS",
      "EDUCATION",
      "NOTES",
      "REFERENCES",
      "ARCHIVE",
      "RÉSUMÉ",
    ],
    camera: "N / 35",
    manga: [
      { title: "BERSERK", volume: "01" },
      { title: "BERSERK", volume: "02" },
      { title: "VINLAND SAGA", volume: "01" },
      { title: "VINLAND SAGA", volume: "02" },
      { title: "CHAINSAW MAN", volume: "01" },
    ],
    bookNote: "ONE MORE CHAPTER.",
    bricks: "THE OFFLINE COMPANION",
    sewing: "NORMAN / STUDIO 01",
    sewingAction: "Try the sewing machine",
    sewingBusy: "Stitching…",
    sewingNote: "MAKE. MEND. REPEAT.",
    blindsOpen: "Pull to see outside",
    blindsClose: "Pull to close the blinds",
    blindsHint: "Drag down, or press Enter",
    outside: "A little New York outside the window.",
  },
  room: {
    shelf: "THE GOOD STUFF / VOL. 01—05",
    posters: [
      { src: "/images/posters/portrait-warm.webp", ratio: 1024 / 983 },
      { src: "/images/posters/portrait-mono.webp", ratio: 1024 / 1007 },
    ],
    speakers: "STEREO / 02",
    disc: "DEVAUNTAE / ON REPEAT",
    musicAction: "See what I’m listening to",
    musicLoading: "Loading the listening room…",
  },
  camera: {
    title: "The camera roll",
    label: "A few favorite frames",
    counter: "PLAYBACK",
    previous: "Previous photo",
    next: "Next photo",
    close: "Put the camera down",
    hint: "Scroll to browse · ← → to change frames",
    pocketHint:
      "A few moments worth keeping. Swipe the strip or choose a frame.",
    loading: "Picking up the camera…",
    model: "NORMAN / DIGITAL 06",
    set: "SET",
  },
  computer: {
    title: "NORMAN OS",
    subtitle: "A personal collection of things made & things loved.",
    apps: [
      { id: "work", label: "Work", symbol: "↗" },
      { id: "games", label: "Arcade", symbol: "✳" },
      { id: "music", label: "Music", symbol: "♫" },
      { id: "about", label: "About", symbol: "◎" },
      { id: "skills", label: "Toolkit", symbol: "⌘" },
      { id: "contact", label: "Contact", symbol: "@" },
    ] as const,
    exit: "Leave computer",
    standby: ["PULL UP", "A CHAIR."],
    edition: "PERSONAL EDITION / 026",
    idleLinks: "WORK / PLAY / LISTEN",
    idleNote: "Click the screen. Stay a while.",
    pocket: "The after-hours computer",
    pocketIntro: "A game break. A glimpse of what’s on repeat.",
    footer: "BUILT BY DEVAUNTAE / EXPLORE FREELY",
  },
  music: {
    eyebrow: "THE LISTENING ROOM",
    title: "On repeat.",
    intro: "A small window into my headphones.",
    now: "RIGHT NOW",
    loading: "Checking the record collection…",
    quiet: "The room is quiet right now.",
    quietDetail:
      "When I press play, the track appears here. Until then, explore what’s been in rotation.",
    disconnected: "The listening connection is taking a break.",
    error: "Couldn’t reach the music collection. Give it another spin.",
    retry: "Try again",
    rotation: "HEAVY ROTATION",
    period: "A few favorites from the last month",
    live: "LIVE FROM SPOTIFY",
    paused: "ON PAUSE",
    listen: "Open in Spotify",
    visual: "SOUNDTRACK TO THE STUDIO",
  },
  games: {
    patrolLabel: "01 / ARCADE",
    denLabel: "02 / EXPLORE",
    eyebrow: "THE AFTER-HOURS ARCADE",
    title: "One more round.",
    intro: "A tiny arcade, right where it belongs.",
    patrol: "Void Patrol",
    patrolDetail: "Fly, dodge, collect. A pocket-sized space shooter.",
    den: "The Den",
    denDetail: "Walk through the pixel room and discover the games I love.",
    start: "Insert coin / play",
    back: "Back to the arcade",
    collection: "THE CARTRIDGE COLLECTION",
    closeMemory: "Back to the room",
    memories: "Pick a cartridge to read its story.",
    recovered: "Cartridges recovered",
    paused: "Click the game to play",
    controls: "Arrow keys / A D to move · Space to fire · R to restart",
  },
  miniComputerLabel: "DN / PERSONAL COMPUTER",
  miniTitle: ["Ideas", "made real."],
  art: {
    niche: "ASPECT NICHE",
    nicheCaption: "FOLLOW A NEW THREAD",
    forge: "PERSONAFORGE",
    forgeCaption: "IDEA → PIPELINE → POSSIBILITY",
    cards: "POKESPIRE",
    cardsCaption: "ONE MORE RUN",
  },
  personalPhotos: [
    {
      number: 2,
      alt: "Devauntae’s collection of vintage digital cameras",
      caption: "A few old cameras. A new perspective.",
    },
    {
      number: 5,
      alt: "An upcycling project in progress",
      caption: "Old parts. New purposes.",
    },
    {
      number: 6,
      alt: "Homemade salmon and shrimp rasta pasta",
      caption: "Jamaican & Cuban roots, one kitchen.",
    },
  ],
  fallback: "A different view, the same curiosity. Explore my work below.",
  simple: "Reading view",
  immersive: "Back to the desk",
  close: "Back to desk",
  escape: "ESC",
  nav: [
    { id: "work", label: "Selected work", number: "01" },
    { id: "about", label: "About me", number: "02" },
    { id: "skills", label: "Capabilities", number: "03" },
    { id: "contact", label: "Say hello", number: "04" },
  ] as const,
  screen: {
    system: "DEVAUNTAE / PERSONAL COMPUTER",
    heading: "Ideas made real.",
    subheading: "Engineering, imagination & everything in between.",
    footer: "SELECT A FOLDER TO EXPLORE",
    greeting: "WELCOME TO MY CORNER OF THE INTERNET",
  },
  work: {
    index: "PROJECT INDEX",
    selected: "Selected experiments.",
    select: "Explore project",
    overview: "THE IDEA",
    collection: "A FEW THINGS I’VE PUT INTO THE WORLD",
    count: `PROJECTS / 01—${String(PROJECTS.length).padStart(2, "0")}`,
    deskTitle: "The Working Desk",
    eyebrow: `SELECTED WORK / 01—${String(PROJECTS.length).padStart(2, "0")}`,
    title: "From what if, to what’s next.",
    intro:
      "AI systems, useful tools, and the occasional world to get lost in. A selection of things I’ve built and helped bring to life.",
    open: "Explore project",
    private: "Internal project",
    more: "Project notes",
    close: "Close project notes",
  },
  about: {
    eyebrow: "THE PERSON AT THE DESK",
    title: "Always making something.",
    intro:
      "I’m Devauntae — an AI and full-stack engineer, Fordham CS ’26, and a firm believer that curiosity is a pretty good compass.",
    body: "My work connects thoughtful interfaces with reliable systems. I’ve built AI-powered tools at Adaptive Security, evaluated language models at Anote, and explored machine learning through Cornell Tech’s Break Through Tech AI program.",
    personal:
      "Away from the keyboard, I’m climbing, throwing pottery, rescuing vintage cameras, or giving old furniture a second life. My Jamaican and Cuban roots tend to show up in the kitchen.",
    caption: "OFFLINE, BUT STILL BUILDING.",
    photoAlt: "Devauntae’s Fordham graduation, Class of 2026",
    philosophy: "Fail with purpose. Make something better. Stay curious.",
  },
  skills: {
    eyebrow: "WHAT I BRING TO THE TABLE",
    title: "A builder’s toolkit.",
    intro:
      "From the first experiment to the interface someone uses every day. I like working across the whole problem.",
  },
  contact: {
    eyebrow: "GOOD THINGS START WITH A CONVERSATION",
    title: "Have a what if?",
    line: "Let’s make something of it.",
    intro:
      "Have an interesting problem, a project in mind, or just a good climbing recommendation? My inbox is open.",
    email: "Write me an email",
    copied: "Email copied",
    copy: "Copy email address",
    copyFailed: "Couldn’t copy. You can select the email above.",
    social: "ELSEWHERE ON THE INTERNET",
  },
  resume: {
    eyebrow: "FILE NO. 001 / THE PAPERWORK",
    title: "A little more on paper.",
    intro:
      "Experience, education, and the tools I work with. The full story is in the résumé.",
    download: "Download résumé",
    view: "View PDF",
    cover: "Cover letter",
    note: "A quick overview. Download the PDF for my current résumé.",
    close: "Close résumé drawer",
  },
  mobile: {
    eyebrow: "THE POCKET EDITION",
    title: "Big curiosity. Smaller screen.",
    intro:
      "The same work and stories, with a little more room to read. Visit on a larger screen to take a seat at the 3D desk.",
  },
  footer: {
    note: "Made with care, in New York.",
    legacy: "Visit the original DevauntaeOS",
    admin: "Admin",
  },
};

export const CAPABILITIES = [
  {
    number: "01",
    name: "Intelligent systems",
    description:
      "Useful AI, backed by careful evaluation. From language models to reproducible learning pipelines.",
    tools: [
      "Python",
      "PyTorch",
      "TensorFlow",
      "scikit-learn",
      "AWS Bedrock",
      "Model evaluation",
    ],
  },
  {
    number: "02",
    name: "End-to-end products",
    description:
      "Interfaces that feel considered, connected to services that do the work. Built to be used.",
    tools: ["React", "Next.js", "TypeScript", "Node.js", "REST APIs", "SQL"],
  },
  {
    number: "03",
    name: "Creative engineering",
    description:
      "A place for play in the process. Interactive worlds, native apps, and media workflows.",
    tools: [
      "Three.js",
      "React Three Fiber",
      "Swift",
      "SwiftUI",
      "FFmpeg",
      "Framer Motion",
    ],
  },
];

export const PROJECT_NOTES: Record<
  string,
  { category: string; summary: string; detail: string }
> = {
  swale: {
    category: "CIVIC TECH / GEOSPATIAL AI",
    summary: "Before the next downpour.",
    detail:
      "A project I worked on to bring Brooklyn’s flood evidence into one place: a 3D map combining catch basins, 311 complaints, FloodNet, weather, and transit data. It explores storm scenarios, ranks drains for inspection, and generates cited briefings with multilingual audio. Observations, reports, predictions, and inferences stay distinct; the storm simulation is an uncalibrated prototype.",
  },
  "aspect-niche": {
    category: "PRODUCT / DISCOVERY",
    summary: "Follow your curiosity.",
    detail:
      "An interactive graph turns hobby discovery into exploration. Pan and zoom through connected interests, expand a personalized AI rabbit hole, then find somewhere nearby to try something new.",
  },
  personaforge: {
    category: "AI / PRODUCT ENGINEERING",
    summary: "Less production. More possibility.",
    detail:
      "At Adaptive Security, I co-built a four-stage media pipeline with Python, Node.js, and FFmpeg, plus a React console for launching and monitoring jobs. Retry logic and job-state logging made long-running workflows easier to operate. The work reduced demo build time by roughly 80%.",
  },
  pokespire: {
    category: "NATIVE / GAME DEVELOPMENT",
    summary: "One more run.",
    detail:
      "A Swift roguelike deckbuilder that combines Pokémon cards with a branching, Slay the Spire-style run. Decks evolve as players progress toward gym-badge bosses.",
  },
  "garment-prediction": {
    category: "MACHINE LEARNING / VISION",
    summary: "From pixels to predictions.",
    detail:
      "A reproducible garment classification pipeline, organized into manifest generation, preprocessing, training, and evaluation. Each stage can be rerun and inspected, with reports at the end.",
  },
  "ml-eval": {
    category: "NLP / EVALUATION",
    summary: "Better questions. Better models.",
    detail:
      "At Anote, I benchmarked fine-tuned GPT-3.5, SetFit, and BERT using stratified k-fold cross-validation. Macro-F1 and latency tracking were paired with schema validation, leakage detection, and class-balance auditing.",
  },
  "agent-fleet": {
    category: "AI / EXPLORATION",
    summary: "A garden of possibilities.",
    detail:
      "A personal exploration of agent orchestration across research, drafting, applications, and paper trading. Human review sits between each agent and any submission, publication, or trade. Explore the original computer’s garden for the interactive presentation.",
  },
  "devauntae-os": {
    category: "CREATIVE WEB / THIS PORTFOLIO",
    summary: "A space worth exploring.",
    detail:
      "A physical desk becomes the entrance to my portfolio. A custom Three.js scene, smooth camera transitions, a working file drawer, and a responsive reading view bring the work into a more personal setting. The original retro desktop remains available in the archive.",
  },
};

export const ADMIN = {
  title: "Studio admin",
  eyebrow: "BEHIND THE DESK",
  intro: "Keep your résumé up to date, right here.",
  back: "Back to the desk",
  loginTitle: "Your side of the desk.",
  loginDetail:
    "Use your existing owner password to manage the résumé visitors download.",
  password: "Owner password",
  login: "Sign in",
  signingIn: "Signing in…",
  denied: "That password didn’t match. Try again.",
  unavailable: "Sign-in is unavailable right now. Please try again shortly.",
  logout: "Sign out",
  current: "CURRENT RÉSUMÉ",
  currentDetail: "This is the PDF linked everywhere on your portfolio.",
  original: "Original portfolio PDF",
  uploaded: "Uploaded replacement",
  checking: "Checking the current document…",
  metadataError: "Couldn’t check the current document. Reload to try again.",
  view: "View current PDF",
  updated: "Last replaced",
  replace: "Replace your résumé",
  choose: "Choose a PDF",
  drop: "Drop your PDF here",
  limit: "PDF only · up to 4 MB",
  instruction:
    "Choose a file, check the preview, then publish it. The new PDF becomes available immediately.",
  selected: "READY TO REPLACE",
  publish: "Replace résumé",
  publishing: "Uploading…",
  cancel: "Choose a different file",
  success:
    "Your résumé has been replaced. Every résumé download now uses the new PDF.",
  failure:
    "The upload didn’t finish. Your current résumé is still available. Try again.",
  expired: "Your session expired. Sign in again to replace the résumé.",
  preview: "Selected résumé preview",
  previewEmpty: "Your next chapter, on paper.",
  previewHint: "Select a PDF to preview it here before publishing.",
  previewLink: "Open selected PDF",
  previewFallback:
    "If the preview isn’t available in your browser, open the selected PDF above.",
  note: "Replacing the PDF updates the downloadable document. The written experience summary on the portfolio is maintained separately.",
};
