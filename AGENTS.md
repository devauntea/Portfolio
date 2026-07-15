<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project notes
- Read `memory/portfolio_lessons.md` before extending this repo.
- All page copy lives in `src/data/profile.ts` (TODO-marked placeholders); theme tokens in `src/app/globals.css` — components never use raw hex.
- The Agent Garden (`src/components/garden`, `src/lib/garden-sim.ts`) is ported shared logic; the pure game math is tested by `scripts/simulate-48h.mjs`.
