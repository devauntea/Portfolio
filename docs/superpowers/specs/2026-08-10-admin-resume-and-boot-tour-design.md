# Admin résumé upload + animated boot tour

**Date:** 2026-08-10
**Status:** approved design, not yet implemented

Three changes to DevauntaeOS:

1. Upload a new résumé from the site itself instead of editing files and redeploying.
2. Replace the abrupt résumé auto-open at boot with a short animated tutorial.
3. Make `devauntea/Portfolio` public.

---

## Context: what exists today

The résumé lives in **two unrelated places**, and neither is uploadable:

| Surface | Source | Problem |
| --- | --- | --- |
| The paper sheet visitors read | Hardcoded `RESUME` object, `src/data/profile.ts:245` | Only updates by editing code |
| The download button | `public/docs/Devauntae_Norman_Resume.docx` | Only updates by committing a file |

Two constraints from `memory/portfolio_lessons.md` shape the whole design:

- **Vercel's filesystem is read-only at runtime.** This already broke `/api/resume-feedback`, which now returns `ok:false` and falls back to a `mailto:`. An upload endpoint therefore cannot write into `public/`.
- **Static assets ship at build time.** Dropping a file into `public/` requires a redeploy to go live.

Owner auth already exists: `POST /api/agent-link` checks a password against `OWNER_PASSWORD` and sets an httpOnly `archive_owner` cookie. Four routes gate on it.

## Goals

- One upload updates *everything* the visitor sees, sheet and download alike.
- The site stays correct with no external service configured.
- The intro teaches the desktop metaphor before showing the résumé.
- No secrets exposed by going public.

## Non-goals

- Editing résumé *text* through the admin panel. The PDF is the source of truth.
- Multi-file/versioned document management. One current résumé, one revert.
- Replacing the password gate with real auth (OAuth, magic link). Out of scope.

---

## 1 · Résumé storage and serving

### Resolution order

1. Vercel Blob object `resume/current.pdf`, when Blob is configured and the object exists
2. Bundled fallback `public/docs/Devauntae_Norman_Resume.pdf`

### Blob credentials (verified against the live project, 2026-08-10)

The store `devauntaenorman-blob` is connected to the project and authenticates by
**OIDC**, not a static token. Per `@vercel/blob@2.7.0` types, `token` defaults to
`BLOB_READ_WRITE_TOKEN` but is *"ignored when Vercel OIDC token is available and
either `BLOB_STORE_ID` or `options.storeId` is set."*

Live state of `devauntae-s-projects/devauntaenorman`:

| Variable | Environments |
| --- | --- |
| `BLOB_STORE_ID` | Production, Preview |
| `BLOB_WEBHOOK_PUBLIC_KEY` | Production, Preview |
| `VERCEL_OIDC_TOKEN` | injected at runtime; pulled locally by `vercel env pull` |
| `OWNER_PASSWORD` | **Production only** |

There is no `BLOB_READ_WRITE_TOKEN`, and none is needed.

Consequences:

- **On Vercel, blob works with no further setup.** OIDC is injected per-request.
- **Local dev has neither `BLOB_STORE_ID` nor `OWNER_PASSWORD`**, since both are
  scoped to Production. Both must be added to the Development environment for the
  admin panel to be exercisable locally.
- OIDC tokens are **short-lived**. A local `.env.local` copy expires and needs
  `vercel env pull` again; this affects local dev only, never deployments.

`resume-store.ts` treats "configured" as *OIDC + `BLOB_STORE_ID` present, or
`BLOB_READ_WRITE_TOKEN` present*, supporting both auth paths so the code keeps
working if the store is ever reconnected with a static token.

The bundled fallback is committed as part of this work using the current résumé PDF, so the site serves the right document before Blob is ever configured. "Blob not configured" is a normal state, not an error state.

### Routes

**`GET /api/resume`**, public metadata.

```json
{ "source": "blob" | "bundled", "updatedAt": "2026-08-10T…" | null, "filename": "Devauntae_Norman_Resume.pdf" }
```

**`GET /api/resume/file`**, public. Streams the resolved PDF through this origin.
`Content-Type: application/pdf`, `Content-Disposition: inline`, or `attachment` when `?download=1`.

Proxying rather than redirecting to the blob URL is deliberate:

- pdf.js fetches a **same-origin** URL, so Blob CORS behaviour can never break the sheet.
- The download URL stays stable and readable regardless of storage backend.
- The raw blob URL is never exposed to the client.

**`POST /api/admin/resume`**, owner-gated. Accepts `multipart/form-data`.

Validation, in order: content-type is `application/pdf` → size ≤ 8 MB → first five bytes are `%PDF-`. Magic-byte checking is what actually matters; the declared content-type is attacker-controlled.

Writes with `put('resume/current.pdf', file, { access: 'private', allowOverwrite: true, addRandomSuffix: false })`. Returns the new metadata. Returns a clear "storage not configured" message, not a 500, when Blob is unconfigured.

**`access: 'private'`, not `'public'`.** Since `/api/resume/file` already proxies
every read, a public blob URL would be a second, uncontrolled way to reach the
document. Private means the only path to the PDF is this app's own route, and
reads go through the authenticated `get(pathname, { access: 'private' })`, which
returns `{ stream, headers }` ready to pipe straight to the response.

**`DELETE /api/admin/resume`**, owner-gated. Deletes the blob, reverting to bundled.

### Module

`src/lib/resume-store.ts`, server-only. Owns resolution, `put`, `del`, and the not-configured branch, so no route handler reaches for `@vercel/blob` directly.

---

## 2 · The paper sheet renders the real PDF

New `src/components/spaces/ResumePdf.tsx`, client-only, dynamically imported with `ssr: false`.

- Lazy-loads `pdfjs-dist@6.2.108`; worker resolved via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`.
- Renders **every** page to its own `<canvas>`, stacked vertically. Scale accounts for `devicePixelRatio` so text is crisp, and for the container width so it reflows.
- Loading state: a paper-toned shimmer inside the sheet, not a spinner over it.
- **Failure falls back to the existing hardcoded `RESUME` text.** Never a blank sheet.

That fallback is why `profile.ts` `RESUME` stays. It is refreshed as part of this work to match the current PDF, today it is missing Garment Prediction, the Jan 2026 Aspect Niche date, and updated skills (SwiftUI, AWS Bedrock, Postman).

### What must not regress

`ResumeSpace.tsx` keeps its stamp desk intact. Only the *inner content* of `PaperSheet` changes:

- Tilt: `useMotionValue`/`useSpring` on the sheet, clamped ±12°.
- Stamp marks: positioned in **% of the sheet**, inside the tilting div, so they tilt and scale with the paper and land correctly on a taller multi-page canvas.
- Carry/ink/slam pointer model and the feedback card: untouched.
- The `📄 download the résumé` link retargets to `/api/resume/file?download=1` and stops advertising `.docx`.

`CONTACT.resumeHref` in `profile.ts` points at the same route.

---

## 3 · Admin app

A hidden OS app, consistent with how the rest of DevauntaeOS works.

- New `"admin"` member of the `AppId` union in `src/lib/os-store.ts`; registered in `src/components/os/apps.tsx`.
- **No desktop icon.** One `🔑 Admin` entry in the Start menu.
- Clicking it: not owner → opens the existing `OwnerGate`; on success the Admin window opens. Already owner → opens directly.

Window contents:

- Current résumé: source (blob/bundled), last updated, view link
- Drag-and-drop zone plus a file picker (`accept="application/pdf"`)
- Upload button with busy/success/error states
- "Revert to bundled"

Styled with the existing `bevel-out` / `bevel-in` / `titlebar-gradient` utilities and theme tokens. Per `AGENTS.md`, components never use raw hex.

---

## 4 · Owner-auth hardening

The `archive_owner` cookie currently stores `OWNER_PASSWORD` **verbatim**, and every gated route compares against the raw value. That was tolerable for a read-only dashboard. This work puts a **file-upload write primitive** behind the same cookie on a repo that is about to become public, so it gets fixed here rather than later.

New `src/lib/owner-auth.ts`:

```
ownerToken()        -> sha256(OWNER_PASSWORD + fixed app salt)
isOwner(jar)        -> timing-safe compare of cookie against ownerToken()
setOwnerCookie(jar)
clearOwnerCookie(jar)
```

Callers updated: `api/agent-link`, `api/resume-feedback` (GET), `api/garden-journal`, `api/agent-activation`, and the new admin route.

The password itself is unchanged and still server-only. **Consequence: existing owner sessions log out once.** Log in again with the same password.

---

## 5 · Boot tour

New `src/components/os/BootTour.tsx`, replacing the bare `enterSpace("resume")` timeout at `src/app/page.tsx:82`.

A ghost cursor glides between the **real** on-screen rects of anchor elements, read via `getBoundingClientRect()` from `data-tour` attributes. Reading live rects rather than hardcoding coordinates is required, because desktop icons are user-draggable and persist their positions.

| Step | Anchor | Copy |
| --- | --- | --- |
| 1 | icon grid | every folder here is a piece of me |
| 2 | taskbar / START | drag windows by their title bar, more apps live under START |
| 3 | desktop | right-click me. and find the plant 🌱 |
| 4 | Résumé icon | cursor glides in, icon highlights, double-click ripple, `enterSpace("resume")` |
| 5 |, | folder auto-unties; the sheet rises on its existing spring |

Teaches the metaphor first, ends on the résumé.

**Exits:** a persistent `skip intro ⏭` button, `Escape`, or any real click. Each cancels every pending timer.

**Frequency:** `tourSeen` added to `ui-store` and persisted, so once per visitor. Display gains a "replay intro" button, which also makes it demoable.

**Respects existing settings:** if `autoResume` is off, the tour does not run and nothing auto-opens, the same contract the startup item has today.

**Reduced motion:** `prefers-reduced-motion` replaces cursor glides with jump-cuts; steps and copy are unchanged.

`data-tour` anchors get added to `IconGrid.tsx` items and the `Desktop.tsx` taskbar/START button.

### Esc layering

`ResumeSpace` already layers `Escape`: carry → doc prompt → feedback → exit space. The tour inserts **above** all of them, while it is running, Esc skips the tour and nothing else.

---

## 6 · Making the repo public

Audit completed 2026-08-10 before this spec was written:

- No `.env*` file appears anywhere in history. `.gitignore` covers `.env*` and `.vercel`.
- History grep for key patterns (`sk-`, `gho_`, `ghp_`, `AKIA…`, private-key headers, literal `client_secret` assignments) returns **only** `process.env.SPOTIFY_CLIENT_SECRET` references, no values.
- `memory/*.md` contains verification and simulated-agent entries only; no third-party personal data.
- The résumé PDF carries a phone number, already public on the live site by design.

`gh repo edit devauntea/Portfolio --visibility public` runs **last**, after implementation lands.

---

## Files

**New**

```
src/lib/owner-auth.ts
src/lib/resume-store.ts
src/app/api/resume/route.ts
src/app/api/resume/file/route.ts
src/app/api/admin/resume/route.ts
src/components/spaces/ResumePdf.tsx
src/components/admin/AdminApp.tsx
src/components/os/BootTour.tsx
public/docs/Devauntae_Norman_Resume.pdf
```

**Modified**

```
src/lib/os-store.ts          admin AppId
src/lib/ui-store.ts          tourSeen + resetTour
src/components/os/apps.tsx   register Admin
src/components/os/Desktop.tsx    Start-menu admin entry, data-tour anchors
src/components/os/IconGrid.tsx   data-tour anchors
src/components/spaces/ResumeSpace.tsx   PDF sheet, autoOpen, download href
src/app/page.tsx             BootTour replaces the auto-open timeout
src/data/profile.ts          RESUME fallback refreshed, resumeHref retargeted
src/app/api/{agent-link,resume-feedback,garden-journal,agent-activation}/route.ts
README.md
memory/portfolio_lessons.md
```

**Dependencies:** `pdfjs-dist@6.2.108`, `@vercel/blob@2.7.0`

---

## Verification

This repo has no test framework, `scripts/simulate-48h.mjs` covers garden math only. Verification is therefore:

1. `npm run lint` and `npm run build` clean.
2. Browser checks in a **foreground** tab.

Two rules from `memory/portfolio_lessons.md` apply directly:

- Hidden preview tabs freeze rAF and report 0×0 layout. The tour depends entirely on `getBoundingClientRect`, and the stamp desk hit-tests rects, both are **untestable** in a hidden tab and need a foreground browser.
- Framer exit animations never finish in hidden tabs, so closed windows linger in the DOM. Assert against store-backed UI (taskbar buttons) or a successful *next* action, never element absence.

Checklist:

- Upload a PDF through the admin panel → sheet re-renders → download serves the new file
- Revert → bundled PDF returns
- Non-owner `POST /api/admin/resume` → 401
- Non-PDF and >8 MB uploads → rejected with a readable message
- Corrupt/unreachable PDF → sheet falls back to `RESUME` text, not blank
- Stamps still ink, preview, and land correctly on the PDF-rendered sheet
- Tour: runs once, skips three ways, replays from Display, silent when `autoResume` is off
- Reduced-motion: tour completes with jump-cuts

## Risks

| Risk | Mitigation |
| --- | --- |
| pdf.js worker bundling under Next 16 / Turbopack is a known sharp edge | `import.meta.url` resolution first; if it fails, copy the worker to `public/` and set `workerSrc` to that path. Text fallback means a worker failure degrades rather than breaks. |
| Blob adds a runtime dependency to a previously static-asset site | Bundled fallback always present; not-configured is a normal state |
| Auth change logs the owner out | Expected, documented, same password |
| Tour anchors drift if icons are dragged | Rects read live at each step, never hardcoded |
