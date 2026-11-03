# Portfolio lessons — The Archive

Implementation notes and known issues. Update after each tricky fix.

## One scroll listener, realms as bands
`lib/scroll-store.ts` owns the single scroll listener; progress (0..1) maps
to camera depth, the realm id (`realmAt`), the ambient sound profile, and
the cursor mode. The camera rig reads `useArchive.getState()` inside
`useFrame` so scrolling never re-renders React; DOM panels and motes are
absolute-positioned at `top: offset%` inside one 1000vh container.

## Porting the garden: the remap checklist that finally sticks
Token remap must cover: Tailwind color utilities (prefix-aware regex, never
bare substring — "star" lives inside "start"), `var(--token)` refs, glow
classes, the cookie name, the localStorage persist key in
`lib/agent-store.ts` (missed once in a previous port), and the login-modal
copy. After any port: `grep -rn "<old-brand>" src/ scripts/`.

## React 19 purity lint patterns (recur every build)
- Deterministic scatter (motes, title letters, room stars) from index math
  or module-scope seeded LCGs — never `Math.random()` in render.
- Countdown/clock UIs: `useState(() => Date.now())` + an always-running
  interval; derive in render.
- Reset-per-subject state: remount with `key`, not effect resets.
- Never mutate `useThree()` returns; use `<color attach>`/`<fog>` element
  refs and mutate the ref'd objects in `useFrame`.
- Ref cleanup warnings: copy `ref.current` to a local inside the effect.

## Hidden preview tabs (verification environment, not app bugs)
Hidden tabs freeze rAF (3D + pixel canvases black, framer exit animations
never finish → Radix dialogs stack in the DOM), throttle timers to ~1s, and
report 0×0 layout (canvas `getBoundingClientRect` is zero → hit-tests
divide by zero; `window.scrollTo` can't move a 0-height document). Verify
logic with `element.click()` + localStorage/DOM reads; stub
`getBoundingClientRect` to exercise canvas hit-test math; stub
`window.scrollY` + dispatch a scroll event to exercise the scroll pipeline.
Visuals (wander, campfire color, cursor trail, book-fall feel) need a
foreground browser.

## Web Audio instead of Howler
No audio files → no Howler. Ambient beds are gain-node layers (noise
through filtered lowpass, sine pads, timed chip-arps) crossfaded per realm
by `setTargetAtTime`; SFX are short enveloped oscillators. The
AudioContext is created lazily on the first toggle click, so no autoplay
warnings.

## Known issues / deliberate cuts
- Firefox untested here (only a Chromium preview available); stack is
  standard R3F/Framer. Lighthouse not run headlessly — no browser harness
  for it in this environment.
- The Game Room avatar can't "carry" items — walking to a cartridge and
  inspecting it (↑/Space) is the pickup interaction.
- Workshop card drag positions are playful, not persisted; pins are.
- The 3D garden door needs a pointer; the observatory console includes a
  plain link to /garden as the accessible/mobile path.

## Theme switching must wait for hydration
Stamping palette custom properties onto `<html>` from zustand's
`onRehydrateStorage` runs before React finishes hydrating → hydration
mismatch (server HTML has no style attribute). Apply the palette only from
a `useEffect` keyed on the theme id: it covers both the persisted choice on
load and later changes, with a one-frame default flash as the only cost.

## The preview console buffer lies; fresh tabs tell the truth
`read_console_messages` returns the tab's accumulated history — stale
compile errors survive reloads and even dev-server restarts. When an error
looks fixed but keeps appearing: restart the dev server (fresh `preview_logs`
is authoritative for compile state) and open a NEW tab for a clean console.

## v2 additions, structurally
- Gallery camera: the rig has three modes (vertical fall / gallery rail /
  frame zoom) blended by damped lerp toward per-frame recomputed targets;
  `focus` lives in the scroll store and any real scroll (Δp > 0.004)
  releases the zoom.
- Resume tilt: DOM path (sanctioned by the brief) — motion values + springs,
  `onPointerMove` normalized to the sheet's center, clamped ±12°. Pointer
  events cover touch drags for free (`touch-none` on the sheet).

## v3: the OS shell (scroll journey retired)
The scroll experience was replaced by a desktop metaphor on user request:
windows (framer drag via dragControls on the title bar, z-order = an
incrementing counter in os-store) + fullscreen "spaces". Old scroll files
were deleted; the 3D gallery room survived and gained a first-person rig.
- Walkable gallery: no PointerLockControls — drag-to-look (pointer events,
  works for touch) + a shared `pressed` Set fed by both WASD keys and
  on-screen pad buttons; movement clamped to room bounds in useFrame.
  Because the pointer stays a real cursor, R3F hover events keep driving
  the plaques for free.
- Esc-in-space handlers must skip when a dialog is open (the Game Room's
  cartridge modal also closes on Esc).
- Retro chrome is four CSS utilities (bevel-out/bevel-in/titlebar-gradient/
  desktop-pattern) over the same palette tokens, so the theme switcher
  (now the Display app) rethemes the whole OS.
- Verification in hidden tabs: framer exit animations never finish, so
  closed windows/spaces linger in the DOM — assert against store-backed
  UI (taskbar buttons) or successful *next* actions, not element absence.

## v3.1: real content + meme wallpaper
- Chat-pasted images can't be exported to disk from the session; the fix is
  slot-based loading: gallery frames point at public/images/gallery/photo-N.jpg
  via THREE.TextureLoader with an onError no-op → gradient placeholder until
  the user drops the file. No Suspense, no crash on 404.
- Real résumé content extracted from the .docx (unzip → word/document.xml →
  strip runs); originals copied to public/docs/ and linked as folder tabs.
- Cat-meme wallpaper is a canvas: pixel-grid cats (string maps, module scope)
  + Impact-style stroked captions, rotated by interval state; redraws on
  theme change by reading CSS vars at draw time. Toggle lives in Display,
  persisted in ui-store (default: memes).

## v3.2: trail, real everything, shipped
- Mouse trail = fixed canvas z-300: tapered polyline (age-based width/alpha
  + shadowBlur) reading --lumen at draw time, plus pixel sparks; gated on
  pointer:fine and prefers-reduced-motion.
- Deployed to Vercel via device-flow login (`npx vercel login` prints a
  vercel.com/oauth/device code the user confirms — works without TTY).
  Link → `vercel env add OWNER_PASSWORD production` → `vercel --prod --yes`.
  NOTE: `vercel link` rewrites .env.local (pulled remote env over it) —
  keep the password in Vercel env; local dev needs it re-added if lost.
- After dropping gallery photos into public/images/gallery, the LIVE site
  needs `npx vercel --prod` again (static assets ship at build time).
- WorkshopBoard orbs carry names only in aria-label — assert on that, not
  textContent, when verifying headlessly.

## v3.3: the stamp desk
- Résumé space gained HIRED/REJECTED rubber stamps: arm from the tray, click
  the sheet to land a rotated ink mark (position in % so it tilts and
  scales with the paper; marks live INSIDE the tilting div).
- Feedback pipeline: public POST /api/resume-feedback appends to
  memory/resume_feedback.md locally (serialized queue + LOCAL date
  headings); on Vercel the fs is read-only so the route returns ok:false
  and the client opens a prefilled mailto to devauntaenorman@gmail.com —
  feedback is never silently dropped. GET is owner-gated.
- Esc layering: feedback card closes first, space exits on the next press.

## v3.4: physical stamps, arcade, vinyl, the name
- Draggable stamps: framer `drag` + `dragSnapToOrigin`; onDragEnd hit-tests
  `info.point` against pad/sheet rects (inRect). Ink is per-stamp state,
  spent on each mark. whileDrag lift = scale/rotateX/shadow in a
  [perspective] wrapper. Gesture untestable in the 0×0 hidden tab (rects
  are zero-size) — foreground check required.
- Void Patrol: canvas shooter, all state in refs inside one effect; drops
  (gem/rapid/spread/shield/cartridge) roll on kill; cartridges call back
  into React to light the "games i love" shelf.
- Music app: /api/spotify uses the refresh-token flow behind three env
  vars, 30s module cache, { configured:false } fallback so the app ships
  before credentials exist. Vinyl+headphones are a small R3F canvas in a
  window (dynamic ssr:false).
- Free "domain": renaming the Vercel project + swapping the project's
  domains via API (POST /v10/projects/:id/domains with
  devauntaenorman.vercel.app, DELETE the old) is what makes the name serve
  directly. `vercel alias` to another alias → 302; alias to a deployment →
  deployment-protection 302. Project domain = the real fix.

## v3.5: spotify link, note particles, stamp carry, orb art
- Spotify: /api/spotify/login 307s to the authorize screen; /callback
  (server component) exchanges ?code for the refresh token and shows it.
  Redirect URI must EXACTLY match the one registered in the Spotify app
  dashboard — the user set https://devauntaenorman.vercel.app/callback, so
  SPOTIFY_REDIRECT_URI is set to that (localhost was unreachable for them).
  /api/spotify needs all of CLIENT_ID+SECRET+REFRESH_TOKEN → configured:true.
- Headphones bug was a rotated half-torus putting the band on the bottom (U
  not ∩). Fix: torus arc=π rotated [PI/2,0,0] as an arch, ear cups = X-axis
  cylinders at the ±radius band ends. Note particles = geometry (head circle
  + stem + flag box), rising/fading loop, only visible when playing.
- Stamp carry: replaced framer drag with a manual pointer-carry model —
  pointerdown on a tray stamp starts a carry; window pointermove tracks a
  fixed z-400 ghost (stamp face + ✊ hand, cursor-none on the space) and, over
  the open paper, a dashed-ring preview mark; pointerup hit-tests pad vs
  sheet rects. Ink is per-stamp, spent per mark. This fixed "can't see where
  it lands." Lint: no setState in effect body (clear preview at the state
  transitions, inline the preview math in onMove).
- Orb art: each Project got an `art` emoji, shown centered in the orb + big
  in a tinted gradient preview banner on the expanded card.

## v3.5.1: /callback 500 — server component had an event handler
The Spotify /callback page (server component) put onFocus on a <textarea> →
"Event handlers cannot be passed to Client Component props" → hard 500 at
render, which ALSO consumed the one-time auth code. Fix: moved the token
display + copy button into a "use client" child (TokenPanel); the page stays
a server component and only does the code→token exchange. Verified a bogus
code now renders the graceful "couldn't finish" state (200), not 500.

## v3.6: the résumé became data
- Blob auth on this project uses OIDC with `BLOB_STORE_ID`. Deployed functions
  receive the token in request context (`x-vercel-oidc-token`); an environment
  `VERCEL_OIDC_TOKEN` is not required. The Blob SDK resolves it. Only check for
  the connected store ID (or a static read/write token) before calling the SDK.
  Connecting a store sets the store ID on Production+Preview only.
- **OIDC blob auth does not work from localhost**: "OIDC is enabled for this
  project, but not for the development environment." Local uploads need a
  `BLOB_READ_WRITE_TOKEN` from the store's `.env.local` tab; `resume-store.ts`
  accepts either auth path so nothing changes in production.
- Blobs are `access: 'private'` and read through `/api/resume/file`, so there is
  exactly one path to the document. `get(..., { useCache: false })` matters —
  the pathname is overwritten in place, and a cached copy keeps serving the
  previous résumé after an upload. `PutBody` takes Buffer, not bare Uint8Array.
- **Never read `public/` from a route handler.** Those are CDN assets and are
  not reliably in the serverless bundle; the bundled fallback redirects to the
  static path instead of `fs.readFile`.
- Uploads trust the magic number (`%PDF-`), never the browser's content-type.
  A .docx is a ZIP (`PK\x03\x04`) and is caught by exactly this check.
- The owner cookie now holds sha256(salt + password). `timingSafeEqual` throws
  on length mismatch — length-check first. `grep -rn "archive_owner"` found a
  FIFTH gated surface the plan missed (`app/garden/page.tsx` did its own raw
  comparison); after any auth change, grep before trusting the file list.
- Node 24 runs `.ts` under `node --test` with no loader and no dev dependency,
  but: `node --test tests/` resolves the directory as a module (use a glob),
  test imports need explicit `.ts` extensions, which in turn needs
  `allowImportingTsExtensions` in tsconfig, and a `tests/package.json` with
  `{"type":"module"}` silences the ESM warning without touching the root.
- pdf.js v6 `render()` takes `canvas`; `canvasContext` is the legacy path and
  passing both is contradictory. The worker resolves fine through
  `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`.
- BootTour measures anchors from `data-tour` attributes because desktop icons
  are draggable AND persist — hardcoded coordinates point at bare desktop on a
  returning visitor. Measure on a `setTimeout`, not rAF: background tabs freeze
  rAF outright but only throttle timers. Entrance animations that start at
  opacity 0 leave copy invisible when stalled — slide instead of fade.
- OwnerSync flips `owner` false→true on every load, so "open the admin window
  when the owner appears" fires at every boot. Key that off the gate having
  been opened instead.
- React 19 purity lint also rejects a plain function call in an effect body if
  that function sets state (`finish()`); move it into the timeout callback.

## v4: the working desk
- The physical desk is the home route; the complete original OS is preserved at `/desktop`, including owner access. The global cursor trail was moved to that route.
- The scene uses `frameloop="demand"`; the camera and drawer invalidate only while converging. Native pointer movement wakes the camera for subtle parallax. Reduced motion snaps both camera and drawer to their destination.
- Mobile/short viewports use server-renderable reading content and do not mount WebGL. Canvas errors and context loss switch to reading view. Do not hide the content behind successful scene initialization.
- Dialogs use Radix for focus trapping/restoration. Scene hotspot DOM nodes unmount during a camera move, so focus restoration falls back to the persistent Explore button. Computer section IDs are prefixed to remain unique if a dialog stays open across a resize into reading view.
- All materials read `--desk-*` tokens; generated textures are disposed on scene teardown. No external models or HDRIs are required.
- Superseded in v4.6.2: both visible résumé papers now render the current PDF through the private Blob proxy, replacing the separately maintained profile summary.
- Clamp the frame delta when resuming demand rendering. Otherwise the idle time makes the first camera/drawer interpolation jump straight to its target.

## v4.1: detailed desk materials and construction
- Use Three's `RoundedBoxGeometry` for textured solids. The extruded drei `RoundedBox` UVs stretch or clamp procedural wood on large surfaces; normalized per-face UVs preserve the grain. Clamp rounding to the smallest dimension.
- Keyboard caps and their legend atlas are merged into three meshes. Vent slots are merged per surface; tiny grooves and rings do not need to cast shadows. In local Chromium QA, the detail pass was reduced from ~307k to ~90k rendered triangles; demand rendering's frame counter stayed unchanged at rest. These are scene measurements, not device frame-rate guarantees.
- Environment reflections are generated locally with Lightformers at 128px, once. Surface grain, fabric, pottery, and plaster maps are deterministic and explicitly disposed. Keep micro-bump strengths small to avoid harsh faceting.
- The résumé drawer is hollow, with rails and suspended labeled folders; its longer travel reveals the contents beyond the desktop edge. Directly printed hardware labels use transparency so they do not create floating rectangular patches.
- Evening readability uses a subtle left vignette and light foreground copy. Scope the light brand color to immersive mode so reading/mobile mode retains contrast.

## v4.2: a maker’s desk and a working window
- The main accent is now burnt orange/amber (`accent`/`accentLight`); foliage has its own tokens so changing interface colors does not recolor plants. Blue/red/sky tokens remain centralized in global CSS.
- The window is an actual opening between four plaster wall panels, with an exterior skyline behind it. Blinds gather at the top; pointer drag, click, Enter, and Space share the same target. Pointer cancellation, Escape, and blur restore the starting state and remove temporary listeners.
- Demand-rendered blinds clamp delta, stop invalidating after convergence, and snap for reduced motion. The sewing needle and wheel animate only for a bounded interaction; its timeout is cleared on unmount.
- Manga uses generated page-edge/spine textures and original abstract cover art. Brick geometry is merged by color. RoundedBoxGeometry is non-indexed, so convert cylinder studs with `toNonIndexed()` before merging; mixed indices return null and break rendering.
- Recheck the entire desktop composition after adding props: book stacks can cover the intro copy, and large windows can collide with the header. Check both desktop aspect ratios and mobile reading mode.


## v4.3: the computer becomes the screen
- Computer content is a 960×680 DOM surface inside a transformed drei Html at the CRT glass, distanceFactor 1.1583. It is physically aligned with the 2.78-unit glass width, and the camera zoom retains the bezel. Only the résumé remains a Radix dialog.
- Stop pointer/click propagation at the screen root and gate the 3D monitor click to desk focus. Otherwise a game click can reopen the Work app behind it. Restore focus on the next animation frame, after inert is removed.
- The original shooter and pixel room accept an optional embedded prop. The shooter pauses on blur; cartridge memories use an inline overlay. Default /desktop behavior remains intact. Keep CSS game canvas aspect ratios intact: object-fit letterboxing breaks pointer coordinate mapping.
- Music reuses /api/spotify and shows truthful offline/paused/live states plus the existing top tracks. Opening it plays a bounded disc-tray sequence, then approaches the screen; speaker notes also stop after a bounded period. Reduced motion skips these. No audio autoplays.
- The shelf replaces the desk stack, a merged brick cat replaces the robot, and two generated poster textures replace the plant. No additional external model or art requests. Use independent muted object colors and neutral interface tokens.


## v4.4: camera roll, window detail, and résumé administration
- `/admin` uses the existing owner login and server-validated cookie, not a separate auth system. File selection only creates a local object URL; **Replace résumé** sends the PDF through the existing private Blob API. Downloads across the desk still share that proxy.
- Vercel functions cap request bodies at 4.5 MB. Limit PDF files to 4 MB to leave multipart headroom; share the validation constant between client and server. Do not change production credentials to test this locally.
- Native PDF iframe previews can be blank in embedded browsers. Reuse the lazy pdf.js renderer and keep an Open selected PDF fallback; cancel render tasks and destroy workers on selection change/unmount.
- The desk camera itself translates, turns, and scales toward the visitor; its rear LCD hosts a 640×420 DOM photo surface at distanceFactor 0.4. It reuses the existing gallery, with wheel throttling, keyboard navigation, thumbnails, and a non-WebGL mobile alternative. Reduced motion snaps the movement; Escape cancels pickup and restores persistent focus.
- User-supplied wall photos are locally optimized WebP assets (~131 KB combined), framed without stretching or cropping. Dispose the Three textures when the scene unmounts.
- Exterior detail combines deterministic skyline/facade canvas textures with real buildings, roof tanks, and merged fire escapes. No continuous animation is needed. Move the open-blind control beside the cord to avoid covering the view.


## v4.5: final material pass and Swale
- Retina rendering now uses up to 2× DPR, constrained by a five-million-pixel framebuffer budget. Resize updates the Canvas dpr prop; the scene still renders on demand. Do not imperatively setDpr while leaving a different Canvas dpr prop: R3F re-applies that prop on navigation renders. Keep the cap when tuning visual sharpness.
- Walnut uses a 2048×1024 deterministic map with broad board variation beneath fine grain; texture filtering uses 8× anisotropy. Bevelled poster rails, plastic microstructure, and merged camera dial ridges provide close-up detail.
- Swale’s description and stack come from its public repository README. The tour-poster asset is locally optimized (~45 KB). The README’s CloudFront address did not resolve during verification, so the portfolio links to the repository. No deployment or impact claims were invented.
- Work counters derive from PROJECTS.length. Project images remain uncropped; the monitor uses a wider letterboxed image area so the project title stays visible on smaller desktop screens.


## v4.6: résumé storage repair and grounded lighting
- Never gate Blob calls on an environment OIDC token. That rejected real production uploads before SDK authentication. Configuration checks are covered by a regression test for a store ID without an env token; owner authentication remains mandatory for writes.
- Aspect Niche uses the user's website screenshot as an optimized 1600px WebP (~49 KB), with the same uncropped project-preview treatment as Swale.
- Removed one-frame ContactShadows: those captured moving objects at their initial locations and even projected objects that do not cast shadows. Real light shadow maps now update only when the demand-rendered scene changes. The window's shadow-casting spotlight sits behind the blinds; thin slats explicitly cast shadows. At night the lamp's spotlight follows its tilted shade, with a bounded shadow camera.
- The cup is a closed lathe profile with a rounded lip, inner wall, and foot. Its curved handle meets the body at both ends. The coffee meniscus winds from outside to center so its normals face up. The foot sits on the coaster's actual top face, rather than floating above it.
- Three r185 uses sampler2DShadow for PCF and already has Vogel filtering. Do not use this installed drei SoftShadows shader patch: it expects the old RGBA-depth shader layout and would inject invalid GLSL.

## v4.6.1: image loading inside 3D screens
- Local gallery files and optimized image endpoints were available, but viewport-based lazy loading left the transformed monitor's About photos blank while deferred. `SectionContent` now explicitly requests eager images for the active monitor section; reading-page Work/About retain lazy loading. Sections only mount when opened, so this does not preload the entire portfolio on arrival.
- The 3D camera's filmstrip and monitor music artwork also load when their app opens. The main camera photo was already eager. Keep responsive `sizes` and optimization; the fix concerns request timing inside CSS perspective/clipped scrolling containers, not missing assets.

## v4.6.2: one current résumé and an explorable original desktop
- `CurrentResume` is shared by the new drawer and original stamp desk. It reads uncached metadata on opening and window focus/visibility, keys the renderer by upload revision, and fetches the current PDF without cache. Text for screen readers is extracted from the same PDF. Failed previews offer retry / View PDF, never the outdated profile summary.
- The original desktop's fixed link to the 3D desk had a higher z-index than the résumé's exit and covered it. Show that link only when no fullscreen space is active. The résumé has a visible, focused Back to desktop control; background desktop controls are inert while a space is open, with focus restored to the originating icon on return.
- New visitors and migrated version-0 preferences start on the desktop. The introductory tour ends there unless the résumé startup item is explicitly enabled. User navigation consumes the startup slot, and opening/focusing an app exits a fullscreen space. Preserve other persisted preferences and all Agent Garden behavior.
- The favicon is a local SVG dn monogram drawn with paths, so its rendering does not depend on a loaded font. Next's file metadata convention versions its URL when the asset changes.
