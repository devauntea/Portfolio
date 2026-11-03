# The Working Desk — Devauntae Norman

A first-person 3D workspace for an AI and full-stack engineer. The ivory CRT opens the portfolio, the left file drawer reveals the résumé, the camera opens the personal story, and the lamp switches the lighting. Built on the existing Next.js portfolio and its real content.

## Run locally

```sh
npm ci
npm run dev
```

The app uses Next.js 16, React 19, React Three Fiber, drei, and Three.js. No new runtime dependencies were added for the redesign.

## Experience

- `/` — the working desk on desktop; an editorial, scrollable pocket edition on mobile and short viewports.
- `/desktop` — the preserved original DevauntaeOS, including its owner tools, gallery, game room, and music app.
- `/garden` — the existing agent garden.

Every desk destination has a normal keyboard-accessible control. Dialogs trap and restore focus and close with Escape. Reading view offers direct access to the same content. Reduced motion disables camera easing, parallax, drawer easing, and interface transitions. A WebGL creation failure or context loss falls back to the reading view.

## Implementation

- `src/components/desk/DeskExperience.tsx` — responsive entry point, scene navigation, focus management, and dialogs.
- `src/components/desk/DeskScene.tsx` — custom geometry, procedural walnut grain and screen textures, camera, and drawer animation.
- `src/components/desk/PortfolioContent.tsx` — projects, about, capabilities, contact, and résumé.
- `src/data/profile.ts` — content, sourced from the existing profile and résumé.
- `src/app/globals.css` — material colors and visual system.

The desktop scene renders on demand, caps pixel ratio at 1.5, and loads separately from the content. Mobile does not create a canvas. There are no downloaded 3D models, environment maps, or video backgrounds. Photography uses Next.js image optimization.

The existing résumé upload/authentication pipeline is unchanged. Downloads use `/api/resume/file?download=1`: the latest private Vercel Blob if configured, then the bundled PDF. The readable experience summary uses `RESUME` in `profile.ts`; the downloadable PDF remains the authoritative document.

## Validation

```sh
npm test
npm run build
```

The existing owner-auth and résumé-upload tests use Node's native test runner. Browser verification covers desktop and mobile layouts, computer navigation, drawer access, lamp, personal photos, project expansion, Escape/focus restoration, and PDF responses. A WebGL-capable browser is needed for visual 3D verification; no automated screenshot baselines are required.

Deploy on the existing Vercel project `devauntaenorman`; its current environment variables and private Blob configuration continue to apply.
