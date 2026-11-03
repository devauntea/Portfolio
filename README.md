# The Working Desk — Devauntae Norman

A first-person 3D workspace for an AI and full-stack engineer. The ivory CRT hosts the portfolio directly on its glass, the left file drawer reveals the résumé, the camera lifts into your hands to browse the photo roll, and the lamp switches the lighting. Pull the window cord to lift the blinds onto a layered city view with brick façades, fire escapes, and rooftop water tanks; press Enter or Space for the same action. The maker’s desk adds a wall shelf of manga, the owner’s framed photo posters, a studded brick cat, stereo speakers, and a sewing machine with a brief needle and handwheel animation. Opening Music loads a disc into the tower and sends musical notes up from the speakers. Work, Arcade, Music, About, Toolkit, and Contact share the computer screen. Built on the existing Next.js portfolio and its real content.

## Run locally

```sh
npm ci
npm run dev
```

The app uses Next.js 16, React 19, React Three Fiber, drei, and Three.js. No new runtime dependencies were added for the redesign.

## Experience

- `/` — the working desk on desktop; an editorial, scrollable pocket edition on mobile and short viewports.
- `/admin` — owner sign-in, PDF selection and preview, and résumé replacement without editing code.
- `/desktop` — the preserved original DevauntaeOS, including its owner tools, gallery, game room, and music app.
- `/garden` — the existing agent garden.

Every desk destination has a normal keyboard-accessible control. The résumé dialog traps/restores focus; Escape leaves the computer or puts the camera down. The camera roll supports the mouse wheel, arrow keys, thumbnails, and a mobile photo viewer. Game memories stay within the monitor and close before leaving it. Reading view offers direct access to the same content. Reduced motion disables camera easing, parallax, drawer/blind easing, the camera pickup, sewing/disc/note animations, and interface transitions. A WebGL creation failure or context loss falls back to the reading view.

## Implementation

- `src/components/desk/DeskExperience.tsx` — responsive entry point, scene navigation, focus management, and dialogs.
- `src/components/desk/DeskScene.tsx` — curved CRT, lighting, procedural walnut and screen textures, camera, and working file drawer.
- `src/components/desk/DeskObjects.tsx` — batched keyboard and legends, vented tower, stitched mat, glazed pottery, and tower hardware.
- `src/components/desk/DeskWindow.tsx` — draggable blinds, cancellation/keyboard controls, and the window frame.
- `src/components/desk/DeskOutside.tsx` — procedural day/evening skyline, textured buildings, and merged fire-escape geometry.
- `src/components/desk/DeskCamera.tsx` / `CameraRoll.tsx` — animated physical camera with a rear LCD photo browser.
- `src/components/desk/DeskMakerObjects.tsx` — manga with original cover graphics, merged brick geometry, and the detailed sewing machine.
- `src/components/desk/ComputerScreen.tsx` — monitor applications, live Spotify states, and lazy-loaded original games.
- `src/components/desk/DeskMedia.tsx` — retractable disc drive, reflective disc, speakers, and bounded note animation.
- `src/components/desk/DeskRoomDecor.tsx` — wall shelf and optimized, aspect-correct framed photos.
- `src/components/desk/DeskMaterials.tsx` — rounded geometry with normalized texture coordinates, shared surface maps, hardware, and merged ventilation slots.
- `src/components/desk/PortfolioContent.tsx` — projects, about, capabilities, contact, and résumé.
- `src/components/admin/ResumeAdmin.tsx` — owner dashboard using the existing authenticated upload API.
- `src/data/profile.ts` — content, sourced from the existing profile and résumé.
- `src/app/globals.css` — material colors and visual system.

The desktop scene renders on demand, uses up to 2× pixel ratio with a five-million-pixel framebuffer budget, and loads separately from the content. Mobile does not create a WebGL scene; opening Arcade mounts only the chosen 2D game canvas. There are no downloaded 3D models, environment maps, or video backgrounds. Photography uses Next.js image optimization. Aspect Niche’s preview uses the supplied website screenshot; Swale’s project preview is an optimized copy of its own repository tour poster; its entry links to the repository because the documented CloudFront demo was unavailable during verification. Softbox reflections are generated locally once at 128px. Directional and spotlight shadow maps update with scene interactions; the blinds occlude window light and the night lamp casts downward from its shade. No baked shadow layer is left behind by moving objects. Keycaps and legends use three batched meshes, and tiny recessed details do not cast expensive shadows. Brick bodies and studs are merged by color. Higher-resolution walnut grain, subtle plastic and leather texture, recessed frame rails, and a knurled camera dial add detail without external models. Materials use walnut, off-white plastic, metal, and charcoal with independent muted colors for collected objects. Syne headlines pair with Space Grotesk.

The admin dashboard reuses the existing owner password, HttpOnly session, and private Blob upload pipeline. A connected `BLOB_STORE_ID` lets the SDK authenticate through Vercel’s request-scoped OIDC token; a static `BLOB_READ_WRITE_TOKEN` connection also works. Choose a PDF (up to 4 MB), inspect the local preview, then select **Replace résumé**. Both client and server validate the PDF signature; the server checks owner authorization on every write. The 4 MB file limit leaves room for multipart data under Vercel’s request limit. Previewing a file does not upload it. Downloads use `/api/resume/file?download=1`: the latest private Vercel Blob if configured, then the bundled PDF. The readable experience summary uses `RESUME` in `profile.ts`; the downloadable PDF remains the authoritative document.

## Validation

```sh
npm test
npm run build
```

The existing owner-auth and résumé-upload tests use Node's native test runner. Browser verification covers desktop and mobile layouts, computer navigation, drawer access, lamp, blind dragging and keyboard controls, sewing reset, personal photos, project selection, monitor scrolling, embedded games, music loading, Escape/focus restoration, PDF responses, and admin login/file validation/preview. Local OIDC cannot write to the production Blob store; storage failures are shown without replacing the current résumé. A WebGL-capable browser is needed for visual 3D verification; no automated screenshot baselines are required.

Deploy on the existing Vercel project `devauntaenorman`; its current environment variables and private Blob configuration continue to apply.
