/* The four agents, as game creatures. These map to REAL agents that live in
   the user's ~/Downloads folder — the activation guide wires this UI to them.
   Care-game state (vitals, AP, naps) lives in lib/agent-store.ts; this file
   is the static registry every view keys off. */

export type AgentId = "paper-wing" | "echo-fox" | "cash-raptor" | "fortress-tortoise";

export interface AgentDef {
  id: AgentId;
  name: string;
  type: string;
  /** real project folder this creature represents */
  project: string;
  lore: string;
  /** creature color token */
  hue: "teleporter" | "ember" | "gold" | "toxic";
  /** home spot index on the island, also the statue pedestal slot */
  slot: number;
  /** favorite kibble — feeding flavor text */
  favoriteFood: string;
  /** the skill the Training Post improves */
  skill: string;
  /** static spec-sheet rows for the lore modal */
  metrics: { label: string; value: string }[];
}

export const AGENTS: AgentDef[] = [
  {
    id: "paper-wing",
    name: "Paper Wing",
    type: "Job Application Agent",
    project: "~/Downloads/job-agent",
    lore: "A bat with folded origami wings. Reads job boards in the dark, tailors a résumé for each catch, and drafts the cover letter — but never presses submit. That part is yours.",
    hue: "teleporter",
    slot: 0,
    favoriteFood: "Ink Berries",
    skill: "Application Accuracy",
    metrics: [
      { label: "Applications prepared", value: "0" },
      { label: "Mode", value: "human-in-loop" },
      { label: "Last sweep", value: "—" },
    ],
  },
  {
    id: "echo-fox",
    name: "Echo Fox",
    type: "Web Search Agent",
    project: "~/Downloads/content-agent (scout) + job-agent scout",
    lore: "A six-tailed fox that phases between feeds. Sweeps headlines, filings, and trends on a loop, then condenses the day's noise into a handful of things that matter.",
    hue: "ember",
    slot: 1,
    favoriteFood: "Data Crumbs",
    skill: "Search Speed",
    metrics: [
      { label: "Feeds watched", value: "6" },
      { label: "Digest size", value: "top 6 of ~40" },
      { label: "Last crawl", value: "—" },
    ],
  },
  {
    id: "cash-raptor",
    name: "Cash Raptor",
    type: "YouTube / Pinterest Agent",
    project: "~/Downloads/content-agent",
    lore: "A cybernetic raptor with camera-lens eyes and pin-quills. Drafts Shorts and pins with the #ad disclosure baked in. Publishes nothing without a human review — its talons stay sheathed.",
    hue: "gold",
    slot: 2,
    favoriteFood: "Pixel Jerky",
    skill: "Render Throughput",
    metrics: [
      { label: "Drafts staged", value: "0" },
      { label: "Publish guard", value: "armed" },
      { label: "Earnings", value: "dashboards only" },
    ],
  },
  {
    id: "fortress-tortoise",
    name: "Fortress Tortoise",
    type: "Investment Agent",
    project: "~/Downloads/trading-agent",
    lore: "A tortoise carrying a castle and a single gold coin. Slow, armored, deterministic. Follows 13F filings and paper-trades behind hard risk rails. It moves capital only in simulation.",
    hue: "toxic",
    slot: 3,
    favoriteFood: "Ledger Greens",
    skill: "Risk Discipline",
    metrics: [
      { label: "Mode", value: "paper only" },
      { label: "Risk / trade", value: "1% cap" },
      { label: "Cash buffer", value: "20% floor" },
    ],
  },
];

export const agentDef = (id: AgentId): AgentDef => AGENTS.find((a) => a.id === id)!;
