# Admin Résumé Upload + Boot Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Devauntae upload a new résumé from the site itself, render that PDF as the paper sheet visitors read, replace the abrupt résumé auto-open with a short animated tutorial, and publish the repo.

**Architecture:** A single résumé resolves from Vercel Blob (private, OIDC-authenticated) with a bundled PDF fallback, served through the app's own `/api/resume/file` proxy so there is exactly one path to the document. The Résumé space renders that PDF to `<canvas>` via pdf.js, falling back to today's hardcoded text if anything fails. A hidden owner-gated Admin app does the uploading. The boot tour drives a ghost cursor between live element rects before opening the folder.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Framer Motion, `@vercel/blob@2.7.0`, `pdfjs-dist@6.2.108`, `node --test` (Node 24 native TS).

## Global Constraints

- **Components never use raw hex.** Theme tokens in `src/app/globals.css` only, per `AGENTS.md`. Existing hex inside `ResumeSpace.tsx` (the desk/paper palette) is pre-existing and stays.
- **All page copy lives in `src/data/profile.ts`.**
- **Retro chrome = four CSS utilities:** `bevel-out`, `bevel-in`, `titlebar-gradient`, `desktop-pattern`.
- **React 19 purity:** no `Math.random()` in render, no `setState` in an effect body, copy `ref.current` to a local inside effects before cleanup.
- **Blob access is `private`.** Never `public`, the proxy is the only read path.
- **Blob auth is OIDC:** `VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`. There is no `BLOB_READ_WRITE_TOKEN` in this project; code still accepts one as an alternate path.
- **Never read `public/` from a route handler.** Files under `public/` are CDN assets and are not reliably present in the serverless bundle. Fall back by **redirecting** to the static path.
- **Test command:** `npm test` → `node --test tests/`. Node 24 strips TypeScript natively; test imports must use explicit `.ts` extensions.
- Verify visuals in a **foreground** browser tab. Per `memory/portfolio_lessons.md`, hidden tabs freeze rAF, report 0×0 rects, and never finish Framer exit animations, assert on store-backed UI, never element absence.

---

## File Structure

**Create**

| Path | Responsibility |
| --- | --- |
| `src/lib/owner-auth.ts` | Sole definition of a valid owner cookie. Pure, no `next/*` imports, so it is unit-testable. |
| `src/lib/resume-validate.ts` | Pure PDF validation (size + magic bytes). |
| `src/lib/resume-store.ts` | Blob read/write/delete + bundled fallback resolution. Server-only. |
| `src/app/api/resume/route.ts` | Public résumé metadata. |
| `src/app/api/resume/file/route.ts` | Public résumé bytes (proxy or redirect). |
| `src/app/api/admin/resume/route.ts` | Owner-gated upload + revert. |
| `src/components/spaces/ResumePdf.tsx` | Renders a PDF to stacked canvases. |
| `src/components/admin/AdminApp.tsx` | Admin window UI. |
| `src/components/os/BootTour.tsx` | Ghost cursor + coach marks. |
| `tests/owner-auth.test.ts` | Owner-auth unit tests. |
| `tests/resume-validate.test.ts` | Validation unit tests. |
| `public/docs/Devauntae_Norman_Resume.pdf` | Bundled fallback (the new résumé). |

**Modify**

| Path | Change |
| --- | --- |
| `src/app/api/agent-link/route.ts` | Use `owner-auth`; store hash not password. |
| `src/app/api/resume-feedback/route.ts:76-80` | Use `isOwner`. |
| `src/app/api/garden-journal/route.ts` | Use `isOwner`. |
| `src/app/api/agent-activation/route.ts` | Use `isOwner`. |
| `src/lib/os-store.ts:14-21` | Add `"admin"` to `AppId`. |
| `src/lib/ui-store.ts` | Add `tourSeen` + `setTourSeen` + `resetTour`. |
| `src/components/os/apps.tsx` | Register the Admin app; add a "replay intro" button to Display. |
| `src/components/os/Desktop.tsx` | Start-menu Admin entry; `data-tour` anchors. |
| `src/components/os/IconGrid.tsx` | `data-tour` anchor per icon. |
| `src/components/spaces/ResumeSpace.tsx` | PDF sheet + text fallback; `autoOpen` prop; download href. |
| `src/app/page.tsx:76-87` | `BootTour` replaces the auto-open timeout. |
| `src/data/profile.ts:245-302` | Refresh `RESUME`; retarget `resumeHref`; drop the `.docx` link. |
| `package.json` | Deps + `test` script. |
| `README.md`, `memory/portfolio_lessons.md` | Document the new pipeline. |

---

## Task 1: Owner auth as a shared, hashed, tested module

**Files:**
- Create: `src/lib/owner-auth.ts`, `tests/owner-auth.test.ts`
- Modify: `package.json`, `src/app/api/agent-link/route.ts`, `src/app/api/resume-feedback/route.ts`, `src/app/api/garden-journal/route.ts`, `src/app/api/agent-activation/route.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `OWNER_COOKIE: string`, `OWNER_COOKIE_OPTIONS`, `ownerConfigured(): boolean`, `ownerToken(): string`, `passwordMatches(candidate: unknown): boolean`, `isOwner(cookieValue: string | undefined): boolean`.

- [ ] **Step 1: Add the test script**

In `package.json`, add to `"scripts"`:

```json
"test": "node --test tests/"
```

- [ ] **Step 2: Write the failing test**

Create `tests/owner-auth.test.ts`:

```ts
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ownerConfigured,
  ownerToken,
  passwordMatches,
  isOwner,
} from "../src/lib/owner-auth.ts";

beforeEach(() => {
  process.env.OWNER_PASSWORD = "correct-horse";
});

test("a token is a stable 64-char sha256 hex digest", () => {
  assert.match(ownerToken(), /^[a-f0-9]{64}$/);
  assert.equal(ownerToken(), ownerToken());
});

test("the token is not the password itself", () => {
  assert.notEqual(ownerToken(), "correct-horse");
  assert.ok(!ownerToken().includes("correct-horse"));
});

test("changing the password changes the token", () => {
  const before = ownerToken();
  process.env.OWNER_PASSWORD = "battery-staple";
  assert.notEqual(ownerToken(), before);
});

test("a cookie holding the current token is the owner", () => {
  assert.equal(isOwner(ownerToken()), true);
});

test("wrong, empty, and missing cookies are rejected", () => {
  assert.equal(isOwner("nope"), false);
  assert.equal(isOwner(""), false);
  assert.equal(isOwner(undefined), false);
});

test("the raw password is not accepted as a cookie", () => {
  assert.equal(isOwner("correct-horse"), false);
});

test("an unconfigured owner rejects everything, including the empty token", () => {
  const token = ownerToken();
  process.env.OWNER_PASSWORD = "";
  assert.equal(ownerConfigured(), false);
  assert.equal(isOwner(token), false);
  assert.equal(isOwner(ownerToken()), false);
  assert.equal(passwordMatches(""), false);
});

test("passwordMatches compares against the configured password", () => {
  assert.equal(passwordMatches("correct-horse"), true);
  assert.equal(passwordMatches("wrong"), false);
  assert.equal(passwordMatches(undefined), false);
  assert.equal(passwordMatches(123), false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/lib/owner-auth.ts'`

- [ ] **Step 4: Write the implementation**

Create `src/lib/owner-auth.ts`:

```ts
/* Who counts as the owner. Every gated route asks this module and nothing
   else, so there is exactly one definition of a valid session.

   The cookie carries sha256(salt + OWNER_PASSWORD), never the password. The
   cookie is a bearer token, anything that leaks it (a log, a screenshot, a
   shared browser) would otherwise leak the password itself. */

import { createHash, timingSafeEqual } from "node:crypto";

export const OWNER_COOKIE = "archive_owner";

/* Domain-separates the digest so the value is meaningless outside this app. */
const SALT = "devauntae-os/owner/v1";

export const OWNER_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
} as const;

export function ownerConfigured(): boolean {
  return (process.env.OWNER_PASSWORD ?? "") !== "";
}

export function ownerToken(): string {
  const pw = process.env.OWNER_PASSWORD ?? "";
  return createHash("sha256").update(SALT + pw).digest("hex");
}

export function passwordMatches(candidate: unknown): boolean {
  return (
    ownerConfigured() &&
    typeof candidate === "string" &&
    candidate === process.env.OWNER_PASSWORD
  );
}

export function isOwner(cookieValue: string | undefined): boolean {
  if (!ownerConfigured() || typeof cookieValue !== "string") return false;
  const seen = Buffer.from(cookieValue);
  const want = Buffer.from(ownerToken());
  /* timingSafeEqual throws on length mismatch, so length-check first. */
  return seen.length === want.length && timingSafeEqual(seen, want);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 8 tests, 0 fail

- [ ] **Step 6: Point `agent-link` at the module**

Replace the body of `src/app/api/agent-link/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  OWNER_COOKIE,
  OWNER_COOKIE_OPTIONS,
  isOwner,
  ownerConfigured,
  ownerToken,
  passwordMatches,
} from "@/lib/owner-auth";

/* Owner auth. The password lives in OWNER_PASSWORD (server-only), NOT
   NEXT_PUBLIC_*, which would ship the secret to every visitor's bundle.
   Success sets an httpOnly cookie holding a hash of the password; the UI
   never sees either value. Swap this file for real auth (magic link /
   OAuth) later without touching any component. */

export async function GET() {
  const jar = await cookies();
  return NextResponse.json({ owner: isOwner(jar.get(OWNER_COOKIE)?.value) });
}

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!ownerConfigured()) {
    return NextResponse.json(
      { owner: false, error: "Owner portal not configured (set OWNER_PASSWORD)." },
      { status: 503 },
    );
  }
  if (!passwordMatches(password)) {
    return NextResponse.json(
      { owner: false, error: "Access denied. The agents don't know you." },
      { status: 401 },
    );
  }
  const jar = await cookies();
  jar.set(OWNER_COOKIE, ownerToken(), OWNER_COOKIE_OPTIONS);
  return NextResponse.json({ owner: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(OWNER_COOKIE);
  return NextResponse.json({ owner: false });
}
```

- [ ] **Step 7: Update the other three gated routes**

In each of `src/app/api/resume-feedback/route.ts`, `src/app/api/garden-journal/route.ts`, and `src/app/api/agent-activation/route.ts`, find the owner check, it looks like this:

```ts
const jar = await cookies();
const pw = process.env.OWNER_PASSWORD ?? "";
if (pw === "" || jar.get("archive_owner")?.value !== pw) {
```

Replace each with:

```ts
const jar = await cookies();
if (!isOwner(jar.get(OWNER_COOKIE)?.value)) {
```

and add to that file's imports:

```ts
import { OWNER_COOKIE, isOwner } from "@/lib/owner-auth";
```

Leave each route's existing response body and status code exactly as they are.

- [ ] **Step 8: Verify no raw checks remain**

Run: `grep -rn "archive_owner\|OWNER_PASSWORD" src/`
Expected: matches **only** in `src/lib/owner-auth.ts`. Any hit in `src/app/api/` means a route was missed.

- [ ] **Step 9: Lint and build**

Run: `npm run lint && npm run build`
Expected: both clean.

- [ ] **Step 10: Commit**

```bash
git add package.json src/lib/owner-auth.ts tests/owner-auth.test.ts src/app/api
git commit -m "refactor: centralize owner auth, store a hash instead of the password"
```

---

## Task 2: Résumé resolution and public routes

**Files:**
- Create: `src/lib/resume-validate.ts`, `tests/resume-validate.test.ts`, `src/lib/resume-store.ts`, `src/app/api/resume/route.ts`, `src/app/api/resume/file/route.ts`, `public/docs/Devauntae_Norman_Resume.pdf`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `MAX_RESUME_BYTES: number`, `validateResumePdf(bytes: Uint8Array): { ok: true } | { ok: false; error: string }`, `RESUME_BLOB_PATH`, `RESUME_FILENAME`, `BUNDLED_RESUME_URL`, `blobConfigured(): boolean`, `resumeMeta(): Promise<ResumeMeta>`, `writeResume(bytes: Uint8Array): Promise<void>`, `deleteResume(): Promise<void>`, and `interface ResumeMeta { source: "blob" | "bundled"; updatedAt: string | null; filename: string }`.

- [ ] **Step 1: Install dependencies**

```bash
npm install @vercel/blob@2.7.0 pdfjs-dist@6.2.108
```

- [ ] **Step 2: Add the bundled résumé**

```bash
cp "/Users/bigbobby/Documents/Professional/Devauntae Norman Resume.pdf" public/docs/Devauntae_Norman_Resume.pdf
```

Verify it is a real PDF:

Run: `head -c 5 public/docs/Devauntae_Norman_Resume.pdf`
Expected: `%PDF-`

- [ ] **Step 3: Write the failing validation test**

Create `tests/resume-validate.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateResumePdf, MAX_RESUME_BYTES } from "../src/lib/resume-validate.ts";

const pdf = (extra = 0) =>
  new Uint8Array([...new TextEncoder().encode("%PDF-1.7\n"), ...new Uint8Array(extra)]);

test("accepts a well-formed PDF", () => {
  assert.deepEqual(validateResumePdf(pdf()), { ok: true });
});

test("rejects an empty file", () => {
  const res = validateResumePdf(new Uint8Array(0));
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /empty/i);
});

test("rejects a .docx, which is a ZIP wearing a different hat", () => {
  const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  const res = validateResumePdf(docx);
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /PDF/i);
});

test("rejects a file too short to hold a magic number", () => {
  assert.equal(validateResumePdf(new Uint8Array([0x25, 0x50])).ok, false);
});

test("rejects a file over the size cap", () => {
  const big = new Uint8Array(MAX_RESUME_BYTES + 1);
  big.set(new TextEncoder().encode("%PDF-"));
  const res = validateResumePdf(big);
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /8 MB/);
});

test("accepts a file exactly at the cap", () => {
  const edge = new Uint8Array(MAX_RESUME_BYTES);
  edge.set(new TextEncoder().encode("%PDF-"));
  assert.deepEqual(validateResumePdf(edge), { ok: true });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test`
Expected: FAIL, `Cannot find module '../src/lib/resume-validate.ts'`

- [ ] **Step 5: Write the validator**

Create `src/lib/resume-validate.ts`:

```ts
/* What counts as an acceptable résumé upload. Pure and dependency-free so it
   can be unit-tested and reused by any caller.

   The browser-declared content type is NOT consulted: it is attacker-supplied
   and trivially spoofed. The magic number is the only claim worth believing. */

export const MAX_RESUME_BYTES = 8 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

export type ResumeValidation = { ok: true } | { ok: false; error: string };

export function validateResumePdf(bytes: Uint8Array): ResumeValidation {
  if (bytes.length === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1);
    return { ok: false, error: `That file is ${mb} MB, the limit is 8 MB.` };
  }
  if (bytes.length < PDF_MAGIC.length) {
    return { ok: false, error: "That doesn't look like a PDF." };
  }
  const magic = new TextDecoder("latin1").decode(bytes.subarray(0, PDF_MAGIC.length));
  if (magic !== PDF_MAGIC) {
    return { ok: false, error: "That doesn't look like a PDF." };
  }
  return { ok: true };
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test`
Expected: PASS, 14 tests total across both files, 0 fail

- [ ] **Step 7: Write the storage module**

Create `src/lib/resume-store.ts`:

```ts
/* Where the current résumé lives. Blob first, bundled PDF second.

   Auth is OIDC (VERCEL_OIDC_TOKEN + BLOB_STORE_ID) on this project, the SDK
   ignores BLOB_READ_WRITE_TOKEN whenever OIDC and a store id are both present.
   Both paths are accepted so reconnecting the store with a static token later
   changes nothing here.

   Blobs are private on purpose: /api/resume/file is the only read path, so a
   public URL would just be a second, uncontrolled way to reach the document. */

import { del, get, head, put } from "@vercel/blob";

export const RESUME_BLOB_PATH = "resume/current.pdf";
export const RESUME_FILENAME = "Devauntae_Norman_Resume.pdf";
export const BUNDLED_RESUME_URL = `/docs/${RESUME_FILENAME}`;

export interface ResumeMeta {
  source: "blob" | "bundled";
  updatedAt: string | null;
  filename: string;
}

export function blobConfigured(): boolean {
  const viaOidc = Boolean(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID);
  return viaOidc || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const bundled = (): ResumeMeta => ({
  source: "bundled",
  updatedAt: null,
  filename: RESUME_FILENAME,
});

export async function resumeMeta(): Promise<ResumeMeta> {
  if (!blobConfigured()) return bundled();
  try {
    const info = await head(RESUME_BLOB_PATH);
    return {
      source: "blob",
      updatedAt: info.uploadedAt.toISOString(),
      filename: RESUME_FILENAME,
    };
  } catch {
    /* not uploaded yet, or storage is unreachable, the bundled copy stands in */
    return bundled();
  }
}

/** The uploaded PDF as a stream, or null to mean "use the bundled copy". */
export async function readResumeStream(): Promise<ReadableStream<Uint8Array> | null> {
  if (!blobConfigured()) return null;
  try {
    /* useCache:false, the pathname is overwritten in place, so a cached copy
       would keep serving the previous résumé after an upload. */
    const res = await get(RESUME_BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return res.stream;
  } catch {
    return null;
  }
}

export async function writeResume(bytes: Uint8Array): Promise<void> {
  await put(RESUME_BLOB_PATH, bytes, {
    access: "private",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/pdf",
  });
}

export async function deleteResume(): Promise<void> {
  await del(RESUME_BLOB_PATH);
}
```

- [ ] **Step 8: Write the metadata route**

Create `src/app/api/resume/route.ts`:

```ts
import { NextResponse } from "next/server";
import { resumeMeta } from "@/lib/resume-store";

/* Public. Tells the client which résumé is current and when it landed. */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await resumeMeta());
}
```

- [ ] **Step 9: Write the file route**

Create `src/app/api/resume/file/route.ts`:

```ts
import { NextResponse } from "next/server";
import {
  BUNDLED_RESUME_URL,
  RESUME_FILENAME,
  readResumeStream,
} from "@/lib/resume-store";

/* Public. The one and only way to read the résumé bytes.

   Proxying rather than redirecting to the blob keeps pdf.js on a same-origin
   URL (so Blob CORS can never break the sheet) and keeps the download link
   stable no matter where the file actually lives.

   The bundled fallback REDIRECTS instead of reading from disk: files under
   public/ are CDN assets and are not reliably present in the serverless
   function's filesystem. */

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const download = new URL(req.url).searchParams.has("download");
  const stream = await readResumeStream();

  if (!stream) {
    return NextResponse.redirect(new URL(BUNDLED_RESUME_URL, req.url));
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${RESUME_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
```

- [ ] **Step 10: Verify both routes against the running dev server**

Run: `npm run dev` in one shell, then in another:

```bash
curl -s localhost:3000/api/resume
curl -sL -o /tmp/r.pdf -w '%{http_code} %{content_type}\n' localhost:3000/api/resume/file
head -c 5 /tmp/r.pdf
```

Expected: `{"source":"bundled","updatedAt":null,"filename":"Devauntae_Norman_Resume.pdf"}`, then `200 application/pdf`, then `%PDF-`.

(`source` is `bundled` because nothing has been uploaded yet, that is the correct state.)

- [ ] **Step 11: Lint, build, commit**

Run: `npm run lint && npm run build`

```bash
git add package.json package-lock.json public/docs src/lib/resume-validate.ts src/lib/resume-store.ts src/app/api/resume tests/resume-validate.test.ts
git commit -m "feat: resolve the resume from blob with a bundled fallback"
```

---

## Task 3: Owner-gated upload route

**Files:**
- Create: `src/app/api/admin/resume/route.ts`

**Interfaces:**
- Consumes: `OWNER_COOKIE`, `isOwner` (Task 1); `validateResumePdf` (Task 2); `blobConfigured`, `writeResume`, `deleteResume`, `resumeMeta` (Task 2).
- Produces: `POST /api/admin/resume` (multipart field `file`) and `DELETE /api/admin/resume`, both returning `{ ok: boolean; error?: string } & Partial<ResumeMeta>`.

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/resume/route.ts`:

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OWNER_COOKIE, isOwner } from "@/lib/owner-auth";
import { validateResumePdf } from "@/lib/resume-validate";
import {
  blobConfigured,
  deleteResume,
  resumeMeta,
  writeResume,
} from "@/lib/resume-store";

/* Owner-only. POST replaces the current résumé; DELETE reverts to the copy
   bundled with the deploy. Every failure mode answers with a sentence the
   admin panel can show verbatim, an upload that silently no-ops is worse
   than one that explains itself. */

export const dynamic = "force-dynamic";

async function isOwnerRequest(): Promise<boolean> {
  const jar = await cookies();
  return isOwner(jar.get(OWNER_COOKIE)?.value);
}

const denied = () =>
  NextResponse.json({ ok: false, error: "Not authorized." }, { status: 401 });

const unconfigured = () =>
  NextResponse.json(
    {
      ok: false,
      error:
        "Blob storage isn't configured for this environment, the bundled résumé is being served.",
    },
    { status: 503 },
  );

export async function POST(req: Request) {
  if (!(await isOwnerRequest())) return denied();
  if (!blobConfigured()) return unconfigured();

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file received." }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateResumePdf(bytes);
  if (!check.ok) {
    return NextResponse.json({ ok: false, error: check.error }, { status: 400 });
  }

  try {
    await writeResume(bytes);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Storage rejected the upload. Try again in a moment." },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true, ...(await resumeMeta()) });
}

export async function DELETE() {
  if (!(await isOwnerRequest())) return denied();
  if (!blobConfigured()) return unconfigured();
  try {
    await deleteResume();
  } catch {
    /* already gone is the desired end state, not an error */
  }
  return NextResponse.json({ ok: true, ...(await resumeMeta()) });
}
```

- [ ] **Step 2: Verify the gate rejects anonymous callers**

With the dev server running:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/admin/resume
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE localhost:3000/api/admin/resume
```

Expected: `401` for both. **If either returns 503, the gate is being skipped**, the auth check must run before the storage check.

- [ ] **Step 3: Verify a valid upload as the owner**

```bash
PW="$(grep '^OWNER_PASSWORD=' .env.local | cut -d= -f2- | tr -d '\"')"
curl -s -c /tmp/jar -X POST localhost:3000/api/agent-link \
  -H 'Content-Type: application/json' -d "{\"password\":\"$PW\"}"
curl -s -b /tmp/jar -X POST localhost:3000/api/admin/resume \
  -F "file=@public/docs/Devauntae_Norman_Resume.pdf"
curl -s localhost:3000/api/resume
```

Expected: `{"owner":true}`, then `{"ok":true,"source":"blob",...}`, then `source` is `"blob"` with a non-null `updatedAt`.

If `OWNER_PASSWORD` is absent from `.env.local`, the first call returns 503, add it to the Development environment and re-run `npx vercel env pull .env.local`.

- [ ] **Step 4: Verify a non-PDF is rejected**

```bash
curl -s -b /tmp/jar -X POST localhost:3000/api/admin/resume \
  -F "file=@public/docs/Devauntae_Norman_Cover_Letter.pdf" -o /dev/null -w '%{http_code}\n'
printf 'PK\x03\x04not a pdf' > /tmp/fake.docx
curl -s -b /tmp/jar -X POST localhost:3000/api/admin/resume -F "file=@/tmp/fake.docx"
```

Expected: `200` for the real PDF (any valid PDF is allowed), then `{"ok":false,"error":"That doesn't look like a PDF."}` for the fake.

- [ ] **Step 5: Verify revert, then restore the real résumé**

```bash
curl -s -b /tmp/jar -X DELETE localhost:3000/api/admin/resume
curl -s -b /tmp/jar -X POST localhost:3000/api/admin/resume \
  -F "file=@public/docs/Devauntae_Norman_Resume.pdf"
```

Expected: `"source":"bundled"` then `"source":"blob"`.

- [ ] **Step 6: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/app/api/admin
git commit -m "feat: owner-gated resume upload and revert"
```

---

## Task 4: The paper sheet renders the real PDF

**Files:**
- Create: `src/components/spaces/ResumePdf.tsx`
- Modify: `src/components/spaces/ResumeSpace.tsx`, `src/data/profile.ts`

**Interfaces:**
- Consumes: `GET /api/resume/file` (Task 2).
- Produces: `<ResumePdf src={string} onFail={() => void} />`; `ResumeSpace` gains an optional `autoOpen?: boolean` prop consumed by Task 6.

- [ ] **Step 1: Write the PDF renderer**

Create `src/components/spaces/ResumePdf.tsx`:

```tsx
"use client";

/* Renders the current résumé PDF into the paper sheet, one canvas per page.

   pdf.js is imported lazily so its ~300KB never touches the desktop bundle.
   Canvases are sized to the container width and scaled by devicePixelRatio,
   because a résumé rendered at CSS pixels looks soft on retina displays.

   Any failure calls onFail() once, and the parent falls back to the text
   résumé, a blank sheet would be worse than a slightly stale one. */

import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  /** must be referentially stable, memoize it in the parent */
  onFail: () => void;
}

const MAX_DPR = 2;

export function ResumePdf({ src, onFail }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        const doc = await pdfjs.getDocument({ url: src }).promise;
        if (cancelled) return;

        host.replaceChildren();
        const width = host.clientWidth || 640;
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          if (cancelled) return;

          const unscaled = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: (width / unscaled.width) * dpr });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = n < doc.numPages ? "1rem" : "0";
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `Résumé page ${n} of ${doc.numPages}`);

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no 2d context");

          host.appendChild(canvas);
          await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) onFail();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [src, onFail]);

  return (
    <div>
      <div ref={hostRef} />
      {!ready && (
        <div aria-hidden className="space-y-3 py-4">
          {[92, 78, 85, 64, 88, 71].map((w) => (
            <div
              key={w}
              className="h-3 animate-pulse rounded-sm bg-[#241f1a]/10"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Extract the text résumé into a fallback component**

In `src/components/spaces/ResumeSpace.tsx`, add above `PaperSheet`:

```tsx
/* The fallback sheet: the same content as the PDF, kept in profile.ts, shown
   whenever pdf.js can't render (old browser, corrupt upload, worker blocked).
   Never leave the paper blank. */
function TextResume() {
  return (
    <>
      <header className="border-b-2 border-[#241f1a]/70 pb-3">
        <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">{RESUME.name}</h3>
        <p className="mt-1 text-sm italic text-[#241f1a]/70">{RESUME.tagline}</p>
        <p className="mt-1.5 font-mono text-[11px] text-[#241f1a]/60">{RESUME.contact}</p>
      </header>
      {RESUME.sections.map((s) => (
        <section key={s.heading} className="mt-5">
          <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-[#241f1a]/60">
            {s.heading}
          </h4>
          <ul className="mt-1.5 space-y-1.5">
            {s.items.map((it) => (
              <li key={it} className="text-sm leading-relaxed">
                {it}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Swap the sheet's inner content**

In `PaperSheet`, add to the imports at the top of the file:

```tsx
import { useCallback } from "react";
import { ResumePdf } from "./ResumePdf";
```

(merge `useCallback` into the existing `react` import rather than adding a second one)

Inside `PaperSheet`, add above the `return`:

```tsx
const [pdfFailed, setPdfFailed] = useState(false);
const handlePdfFail = useCallback(() => setPdfFailed(true), []);
```

Then replace the `<header>` element and the `{RESUME.sections.map(...)}` block with:

```tsx
{pdfFailed ? (
  <TextResume />
) : (
  <ResumePdf src="/api/resume/file" onFail={handlePdfFail} />
)}
```

Leave everything else in `PaperSheet` untouched, the tilt springs, the corner fold, the marks overlay, and the download link all still work.

- [ ] **Step 4: Retarget the download link**

Still in `PaperSheet`, change the download anchor's `href` and label:

```tsx
<a
  href="/api/resume/file?download=1"
  download
  data-cursor="hand"
  className="mt-6 inline-block rounded border border-[#241f1a]/40 px-3 py-1.5 font-mono text-xs text-[#241f1a]/80 transition-colors hover:bg-[#241f1a]/5"
>
  📄 download the résumé (PDF)
</a>
```

- [ ] **Step 5: Add the `autoOpen` prop for Task 6**

Change the `ResumeSpace` signature and its `open` state:

```tsx
export function ResumeSpace({ autoOpen = false }: { autoOpen?: boolean } = {}) {
  const exitSpace = useOs((s) => s.exitSpace);
  const [open, setOpen] = useState(autoOpen);
```

- [ ] **Step 6: Update `profile.ts`**

Replace the `RESUME` object at `src/data/profile.ts:245` so the fallback matches the new PDF:

```ts
export const RESUME = {
  name: "Devauntae Norman",
  tagline: "AI / Fullstack Engineer, builder of worlds, digital and real",
  contact:
    "New York, NY · devauntaenorman@gmail.com · linkedin.com/in/devauntae-norman · github.com/devauntea",
  sections: [
    {
      heading: "Education",
      items: [
        "Fordham University, B.S. Computer Science, May 2026. Coursework: Data Structures & Algorithms, Database Systems, Operating Systems, Computer Networks, Data Mining.",
      ],
    },
    {
      heading: "Experience",
      items: [
        "Adaptive Security, Artificial Intelligence Product Intern (May 2025–Mar 2026): built a Python/Node service automating a four-stage FFmpeg media pipeline, cutting production time roughly 80%; built an internal React/Next.js console for launching and monitoring long-running jobs.",
        "Anote, Back-End Software Engineering Intern (Aug–Dec 2023): engineered a Python evaluation harness benchmarking fine-tuned GPT-3.5, SetFit, and BERT with stratified k-fold cross-validation; built a dataset quality pipeline for reproducibility across engineers.",
        "Cornell Tech, Break Through Tech AI, AI/ML Development Intern (Jun–Aug 2023): built supervised learning pipelines with reproducible splits, metric tracking, and error analysis; presented model tradeoffs to non-technical stakeholders.",
        "Fordham CSTEP, Peer Instructor & Academic Counselor (Sep 2023–May 2025): designed and taught a full Pre-Calculus curriculum and an introductory AI course within a 100+ student STEM program.",
      ],
    },
    {
      heading: "Projects",
      items: [
        "Aspect Niche (aspectniche.com), full-stack activity discovery app with an interactive graph UI: pan, zoom, force-directed clustering, progressive node expansion, and an LLM API behind server-side routes.",
        "Garment Prediction, reproducible image-classification pipeline split into manifest, preprocessing, training, and evaluation stages, rerunnable end to end from a single command.",
        "This computer, DevauntaeOS: a retro-desktop portfolio with a walkable 3D gallery and a hidden agent-care game.",
      ],
    },
    {
      heading: "Technical Skills",
      items: [
        "Languages: Python · Java · JavaScript · TypeScript · C++ · Swift · SQL · HTML · CSS",
        "Web and Backend: React · Next.js · Node.js · REST APIs · Tailwind CSS · SwiftUI",
        "AI and Data: PyTorch · TensorFlow · scikit-learn · AWS Bedrock · model evaluation · data pipelines",
        "Tools: Git · GitHub · Postman · Jupyter · VS Code · FFmpeg · Agile · unit testing",
      ],
    },
  ],
};
```

Then update `DOCS` and `CONTACT` further down the same file:

```ts
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
```

- [ ] **Step 7: Verify in a foreground browser**

Start the dev server and open `http://localhost:3000` in a **foreground** tab. Open the Résumé space and untie the folder.

Expected: the sheet shows the rendered PDF, your actual résumé layout, not the styled text version. Check the console for pdf.js worker errors.

**If the worker fails to load**, copy it into `public/` and use a plain path instead:

```bash
cp node_modules/pdfjs-dist/build/pdf.worker.min.mjs public/pdf.worker.min.mjs
```

then in `ResumePdf.tsx` replace the `workerSrc` assignment with:

```tsx
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
```

- [ ] **Step 8: Verify the stamps still land correctly**

Still in the foreground tab: pick up the HIRED stamp, drop it on the ink pad, then carry it over the rendered PDF and release.

Expected: the dashed preview ring tracks the pointer over the sheet, and the mark lands where released, tilting with the paper. This must be checked in a foreground tab, rects are 0×0 in hidden tabs.

- [ ] **Step 9: Verify the text fallback**

Temporarily change `src` to `"/api/resume/does-not-exist"` in `ResumeSpace.tsx`, reload, and confirm the sheet shows the styled text résumé rather than blank paper. Revert the change.

- [ ] **Step 10: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/components/spaces src/data/profile.ts
git commit -m "feat: render the uploaded resume PDF on the paper sheet"
```

---

## Task 5: The Admin app

**Files:**
- Create: `src/components/admin/AdminApp.tsx`
- Modify: `src/lib/os-store.ts`, `src/components/os/apps.tsx`, `src/components/os/Desktop.tsx`

**Interfaces:**
- Consumes: `GET /api/resume`, `POST|DELETE /api/admin/resume` (Tasks 2–3); `useUi().owner`; `OwnerGate` from `@/components/owner/Owner`.
- Produces: `<AdminApp />`; `AppId` gains `"admin"`.

- [ ] **Step 1: Register the app id**

In `src/lib/os-store.ts`, add `"admin"` to the `AppId` union:

```ts
export type AppId =
  | "about"
  | "projects"
  | "hobbies"
  | "contact"
  | "display"
  | "music"
  | "readme"
  | "admin";
```

- [ ] **Step 2: Write the Admin app**

Create `src/components/admin/AdminApp.tsx`:

```tsx
"use client";

/* The owner's control panel: swap the résumé without touching the repo.

   The window itself is only reachable behind the password gate, but the
   server re-checks the cookie on every call, this UI is a convenience, not
   the security boundary. */

import { useCallback, useEffect, useRef, useState } from "react";
import { chime, thunk } from "@/lib/sound";

interface Meta {
  source: "blob" | "bundled";
  updatedAt: string | null;
  filename: string;
}

export function AdminApp() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/resume", { cache: "no-store" });
      setMeta(await r.json());
    } catch {
      setMeta(null);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const upload = useCallback(
    async (file: File) => {
      setBusy(true);
      setMsg(null);
      const body = new FormData();
      body.append("file", file);
      try {
        const r = await fetch("/api/admin/resume", { method: "POST", body });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.ok) {
          setMeta({ source: d.source, updatedAt: d.updatedAt, filename: d.filename });
          setMsg({ tone: "ok", text: "✓ Résumé replaced, reopen the Résumé folder to see it." });
          chime();
        } else {
          setMsg({ tone: "bad", text: d.error ?? "Upload failed." });
          thunk();
        }
      } catch {
        setMsg({ tone: "bad", text: "Network error, the upload didn't land." });
        thunk();
      }
      setBusy(false);
    },
    [],
  );

  async function revert() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/resume", { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setMeta({ source: d.source, updatedAt: d.updatedAt, filename: d.filename });
        setMsg({ tone: "ok", text: "↩ Reverted to the résumé bundled with the deploy." });
      } else {
        setMsg({ tone: "bad", text: d.error ?? "Revert failed." });
      }
    } catch {
      setMsg({ tone: "bad", text: "Network error." });
    }
    setBusy(false);
  }

  const when = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : null;

  return (
    <div className="space-y-3 p-1 font-mono text-[11px] text-starlight">
      <section className="bevel-in bg-cosmos/60 p-2.5">
        <p className="text-[10px] uppercase tracking-widest text-faint">current résumé</p>
        <p className="mt-1 text-sm text-starlight">{meta?.filename ?? "…"}</p>
        <p className="mt-0.5 text-[10px] text-faint">
          {meta === null
            ? "checking…"
            : meta.source === "blob"
              ? `uploaded ${when}`
              : "bundled with the deploy (nothing uploaded yet)"}
        </p>
        <a
          href="/api/resume/file"
          target="_blank"
          rel="noreferrer"
          data-cursor="hand"
          className="mt-1.5 inline-block text-[10px] text-lumen underline"
        >
          view it ↗
        </a>
      </section>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        data-cursor="hand"
        className={`bevel-in cursor-pointer bg-cosmos/40 p-5 text-center transition-colors ${
          dragging ? "bg-lumen/10" : ""
        }`}
      >
        <p className="text-2xl" aria-hidden>
          📄
        </p>
        <p className="mt-1.5 text-[11px] text-starlight">
          {dragging ? "drop it" : "drop a PDF here, or click to choose"}
        </p>
        <p className="mt-0.5 text-[10px] text-faint">PDF only · 8 MB max</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      {busy && <p className="text-center text-[10px] text-gilt">working…</p>}

      {msg && (
        <p
          role="status"
          className="bevel-in bg-cosmos/60 p-2 text-[10px] leading-relaxed"
          style={{ color: msg.tone === "ok" ? "var(--sprout)" : "var(--rose)" }}
        >
          {msg.text}
        </p>
      )}

      <button
        onClick={revert}
        disabled={busy || meta?.source !== "blob"}
        data-cursor="hand"
        className="bevel-out w-full bg-panel py-1.5 text-[11px] text-faint active:bevel-in disabled:opacity-40"
      >
        ↩ revert to the bundled résumé
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Register the app**

In `src/components/os/apps.tsx`, add the import and the `APPS` entry, matching the shape the other entries already use (`title`, `icon`, `width`, `node`):

```tsx
import { AdminApp } from "@/components/admin/AdminApp";
```

```tsx
admin: {
  title: "Admin",
  icon: "readme",
  width: 340,
  node: <AdminApp />,
},
```

- [ ] **Step 4: Add the Start-menu entry**

In `src/components/os/Desktop.tsx`, inside `StartMenu`, add these hooks at the top of the component:

```tsx
const owner = useUi((s) => s.owner);
```

and add this button immediately before the `<div className="my-1 border-t border-seam" />` divider:

```tsx
<button
  onClick={() => {
    if (owner) openWindow("admin");
    else onOpenGate();
    chime();
    onClose();
  }}
  data-cursor="hand"
  className="flex w-full items-center gap-2 px-2 py-1.5 text-left font-mono text-[11px] text-gilt hover:bg-seam/50"
>
  🔑 Admin
  <span className="ml-auto text-[9px] text-faint">{owner ? "unlocked" : "locked"}</span>
</button>
```

Change `StartMenu`'s signature to accept the gate opener:

```tsx
function StartMenu({ onClose, onOpenGate }: { onClose: () => void; onOpenGate: () => void }) {
```

- [ ] **Step 5: Wire the gate into `Desktop`**

In the `Desktop` component, add state and render the gate:

```tsx
const [gateOpen, setGateOpen] = useState(false);
const owner = useUi((s) => s.owner);
```

Add the import:

```tsx
import { OwnerGate } from "@/components/owner/Owner";
```

Pass the opener through:

```tsx
<AnimatePresence>
  {startOpen && (
    <StartMenu onClose={() => setStartOpen(false)} onOpenGate={() => setGateOpen(true)} />
  )}
</AnimatePresence>
```

And render the gate near the taskbar's closing tag, inside the root `<div>`:

```tsx
<OwnerGate open={gateOpen} onClose={() => setGateOpen(false)} />
```

- [ ] **Step 6: Open the Admin window right after unlocking**

So a fresh login lands somewhere useful, add this effect to `Desktop`:

```tsx
/* Unlocking from the Start menu should land in the panel you were after. */
const wasOwner = useRef(owner);
useEffect(() => {
  if (owner && !wasOwner.current) openWindow("admin");
  wasOwner.current = owner;
}, [owner, openWindow]);
```

Add `useRef` to the existing `react` import.

- [ ] **Step 7: Verify in a foreground browser**

1. Open Start → confirm `🔑 Admin` reads `locked`.
2. Click it → the password modal appears. Enter the password → the Admin window opens.
3. Drop a PDF on the zone → the card flips to `uploaded <timestamp>`.
4. Open the Résumé space → the sheet shows the newly uploaded PDF.
5. Click revert → the card returns to `bundled with the deploy`.

- [ ] **Step 8: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/components/admin src/components/os src/lib/os-store.ts
git commit -m "feat: hidden admin app for swapping the resume"
```

---

## Task 6: The boot tour

**Files:**
- Create: `src/components/os/BootTour.tsx`
- Modify: `src/lib/ui-store.ts`, `src/components/os/IconGrid.tsx`, `src/components/os/Desktop.tsx`, `src/app/page.tsx`, `src/components/os/apps.tsx`

**Interfaces:**
- Consumes: `useOs().enterSpace`, `useUi().autoResume`, `ResumeSpace`'s `autoOpen` prop (Task 4).
- Produces: `<BootTour />`; `useUi` gains `tourSeen: boolean`, `setTourSeen(v: boolean): void`.

- [ ] **Step 1: Add tour state**

In `src/lib/ui-store.ts`, add to the `UiState` interface:

```ts
  /** the intro tour has played (once per visitor) */
  tourSeen: boolean;
  setTourSeen: (v: boolean) => void;
```

Add to the store body:

```ts
      tourSeen: false,
      setTourSeen: (tourSeen) => set({ tourSeen }),
```

Add `tourSeen: s.tourSeen,` to the `partialize` object so it persists.

- [ ] **Step 2: Add tour anchors**

In `src/components/os/IconGrid.tsx`, add `data-tour={`icon-${item.id}`}` to the element rendered per desktop item (the button or wrapper that carries the icon and label).

In `src/components/os/Desktop.tsx`, add `data-tour="taskbar"` to the taskbar `<div>` (the one with `className` starting `bevel-out absolute inset-x-0 bottom-0`), and `data-tour="start"` to the START `<button>`.

- [ ] **Step 3: Write the tour**

Create `src/components/os/BootTour.tsx`:

```tsx
"use client";

/* The intro. A ghost cursor drifts between real on-screen elements, drops a
   coach mark at each, then "double-clicks" the Résumé icon to open the folder.

   Anchor rects are measured live from data-tour attributes rather than
   hardcoded, because desktop icons are draggable and their positions persist
   across visits, a fixed coordinate would point at empty desktop.

   Plays once per visitor (tourSeen), obeys the same autoResume switch the
   startup item uses, and exits on Esc, the skip button, or any real click. */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useOs } from "@/lib/os-store";
import { useUi } from "@/lib/ui-store";
import { chime } from "@/lib/sound";

interface Beat {
  anchor: string;
  text: string;
  hold: number;
}

const BEATS: Beat[] = [
  { anchor: "icon-about", text: "this is my desktop, every folder here is a piece of me", hold: 2600 },
  { anchor: "taskbar", text: "drag windows by their title bar. more apps live under START", hold: 2800 },
  { anchor: "icon-games", text: "right-click the desktop for more. and look for the plant 🌱", hold: 2600 },
  { anchor: "icon-resume", text: "let's start with the résumé…", hold: 1500 },
];

type Rect = { x: number; y: number; w: number; h: number };

function rectOf(anchor: string): Rect | null {
  const el = document.querySelector(`[data-tour="${anchor}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
}

export function BootTour() {
  const enterSpace = useOs((s) => s.enterSpace);
  const setTourSeen = useUi((s) => s.setTourSeen);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const finish = useCallback(
    (openResume: boolean) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setDone(true);
      setTourSeen(true);
      if (openResume) enterSpace("resume");
    },
    [enterSpace, setTourSeen],
  );

  /* advance through the beats */
  useEffect(() => {
    if (done) return;
    const beat = BEATS[step];
    if (!beat) {
      finish(true);
      return;
    }
    setRect(rectOf(beat.anchor));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(
      () => setStep((n) => n + 1),
      reduced ? Math.min(beat.hold, 1200) : beat.hold,
    );
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [step, done, finish]);

  /* any escape hatch ends it */
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish(false);
    };
    const onClick = () => finish(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onClick);
    };
  }, [done, finish]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const beat = BEATS[step];
  if (done || !beat || !rect) return null;

  const isLast = step === BEATS.length - 1;
  const tipTop = rect.y + rect.h / 2 + 14;
  const tipLeft = Math.min(Math.max(rect.x, 130), (globalThis.innerWidth ?? 1024) - 130);

  return (
    <div className="pointer-events-none fixed inset-0 z-[78]" aria-live="polite">
      {/* the halo on whatever we're pointing at */}
      <motion.div
        aria-hidden
        animate={{ left: rect.x, top: rect.y, width: rect.w + 16, height: rect.h + 16 }}
        transition={{ type: "spring", stiffness: 140, damping: 20 }}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-md border-2 border-gilt/80"
        style={{ boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.35)" }}
      />

      {/* the ghost cursor */}
      <motion.div
        aria-hidden
        animate={{ left: rect.x + 10, top: rect.y + 10 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="absolute text-xl drop-shadow-[0_2px_3px_rgb(0_0_0/0.7)]"
      >
        {isLast ? "✊" : "➤"}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.p
          key={step}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="bevel-out absolute max-w-[16rem] -translate-x-1/2 bg-panel px-3 py-2 text-center font-mono text-[11px] leading-relaxed text-starlight"
          style={{ left: tipLeft, top: tipTop }}
        >
          {beat.text}
        </motion.p>
      </AnimatePresence>

      <button
        onClick={() => finish(false)}
        data-cursor="hand"
        className="bevel-out pointer-events-auto absolute right-3 top-3 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-faint active:bevel-in"
      >
        skip intro ⏭
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Replace the auto-open in `page.tsx`**

Replace the startup effect at `src/app/page.tsx:76-87` with:

```tsx
  /* startup item: the intro tour runs once, teaches the desktop, then opens
     the Résumé folder the way a login item would. Turn it off in Display →
     Startup items, the setting is read at boot only. */
  const [tourRunning, setTourRunning] = useState(false);
  useEffect(() => {
    if (!booted) return;
    const t = setTimeout(() => {
      const { autoResume, tourSeen } = useUi.getState();
      if (!autoResume || !claimStartup()) return;
      if (tourSeen) enterSpace("resume");
      else setTourRunning(true);
    }, 500);
    return () => clearTimeout(t);
  }, [booted, claimStartup, enterSpace]);
```

Add the import:

```tsx
import { BootTour } from "@/components/os/BootTour";
```

Render it just above `{!booted && <BootScreen … />}`:

```tsx
{tourRunning && <BootTour />}
```

Change the résumé space render so the folder opens itself when the tour led there:

```tsx
{space === "resume" && (
  <motion.div key="resume" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <ResumeSpace autoOpen />
  </motion.div>
)}
```

- [ ] **Step 5: Add the replay button**

In `src/components/os/apps.tsx`, inside the Display app's markup (next to the existing startup-items toggle), add:

```tsx
<button
  onClick={() => {
    useUi.getState().setTourSeen(false);
    location.reload();
  }}
  data-cursor="hand"
  className="bevel-out w-full bg-panel py-1.5 font-mono text-[11px] text-starlight active:bevel-in"
>
  ▶ replay the intro tour
</button>
```

- [ ] **Step 6: Verify in a foreground browser**

Clear the persisted state so the tour is eligible:

```js
localStorage.removeItem("archive-ui-v1");
```

Reload in a **foreground** tab.

Expected: after boot, a halo and tooltip land on a desktop icon, move to the taskbar, then to another icon, then the Résumé space opens with the folder already untied and the PDF rendered. The whole thing takes about 10 seconds.

Then verify each exit path separately, reloading and clearing `archive-ui-v1` between runs:
- press `Escape` mid-tour → tour disappears, desktop stays, résumé does **not** open
- click anywhere mid-tour → same
- click `skip intro` → same
- reload again without clearing storage → no tour (already seen)
- Display → toggle Startup items off, clear storage, reload → no tour, no résumé

- [ ] **Step 7: Verify reduced motion**

In Chrome DevTools: ⋮ → More tools → Rendering → Emulate CSS `prefers-reduced-motion: reduce`. Clear storage, reload.

Expected: the tour still completes and still opens the résumé, with shorter holds.

- [ ] **Step 8: Lint, build, commit**

```bash
npm run lint && npm run build
git add src/components/os src/lib/ui-store.ts src/app/page.tsx
git commit -m "feat: animated intro tour replaces the abrupt resume auto-open"
```

---

## Task 7: Document and publish

**Files:**
- Modify: `README.md`, `memory/portfolio_lessons.md`

- [ ] **Step 1: Update the README**

Replace the last paragraph of `README.md` with:

```markdown
Built with Next.js (App Router) + TypeScript, Tailwind v4, Framer Motion,
React Three Fiber + drei. Sound is synthesized Web Audio (off by default).
No database, owner auth is a server-side password check via an httpOnly
cookie carrying a hash of the password.

The résumé is swappable from the site itself: unlock `🔑 Admin` in the Start
menu and drop in a PDF. It lands in a private Vercel Blob and is served through
`/api/resume/file`; the Résumé space renders that PDF with pdf.js, falling back
to the copy bundled in `public/docs` and then to the text in `src/data/profile.ts`.

Unit tests cover the pure logic (`npm test`, Node's built-in runner, no framework).
```

- [ ] **Step 2: Append the lessons**

Add to the end of `memory/portfolio_lessons.md`:

```markdown
## v3.6: the résumé became data
- Blob auth on this project is OIDC (`VERCEL_OIDC_TOKEN` + `BLOB_STORE_ID`),
  NOT `BLOB_READ_WRITE_TOKEN`, the SDK ignores the static token whenever OIDC
  and a store id are both present. Connecting a store in the dashboard sets the
  store id on Production+Preview only, so Development needs it added by hand or
  local uploads silently fall back to the bundled PDF.
- OIDC tokens are short-lived; a stale `.env.local` breaks local blob calls and
  nothing else. Re-run `vercel env pull`.
- Blobs are `access: 'private'` and read through `/api/resume/file`, so there is
  exactly one path to the document. `get(..., { useCache: false })` matters,
  the pathname is overwritten in place, and a cached copy keeps serving the
  previous résumé after an upload.
- **Never read `public/` from a route handler.** Those are CDN assets and are
  not reliably in the serverless bundle; the bundled fallback redirects to the
  static path instead of `fs.readFile`.
- Uploads trust the magic number (`%PDF-`), never the browser's content-type.
  A .docx is a ZIP (`PK\x03\x04`) and is caught by exactly this check.
- The owner cookie now holds sha256(salt + password) instead of the password.
  `timingSafeEqual` throws on length mismatch, length-check first.
- Node 24 runs `.ts` under `node --test` with no loader and no dev dependency;
  test imports need explicit `.ts` extensions. Pure logic (auth, validation)
  is unit-tested; anything touching rects or rAF still needs a foreground tab.
- BootTour measures anchors live from `data-tour` attributes because desktop
  icons are draggable AND their positions persist, hardcoded coordinates would
  point at bare desktop on a returning visitor.
```

- [ ] **Step 3: Full verification sweep**

```bash
npm test && npm run lint && npm run build
```

Expected: 14 tests pass, lint clean, build succeeds.

- [ ] **Step 4: Commit and push**

```bash
git add README.md memory/portfolio_lessons.md docs/superpowers
git commit -m "docs: record the resume pipeline, blob auth, and tour"
git push origin main
```

- [ ] **Step 5: Deploy and verify production**

```bash
npx vercel --prod --yes
```

Then against the live site:

```bash
curl -s https://devauntaenorman.vercel.app/api/resume
curl -sL -o /tmp/live.pdf -w '%{http_code}\n' https://devauntaenorman.vercel.app/api/resume/file
head -c 5 /tmp/live.pdf
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://devauntaenorman.vercel.app/api/admin/resume
```

Expected: valid JSON, `200`, `%PDF-`, and `401` for the unauthenticated upload attempt.

Then log into `🔑 Admin` on the live site and upload a PDF to confirm blob writes work in production.

- [ ] **Step 6: Make the repo public**

Only after the deploy is verified:

```bash
gh repo edit devauntea/Portfolio --visibility public --accept-visibility-change-consequences
gh repo view devauntea/Portfolio --json visibility
```

Expected: `{"visibility":"PUBLIC"}`

- [ ] **Step 7: Confirm no secret shipped**

```bash
git grep -nE "OWNER_PASSWORD *= *[\"'][^\"']|SPOTIFY_CLIENT_SECRET *= *[\"'][^\"']|store_[A-Za-z0-9]{12}" $(git rev-list --all) -- | head
```

Expected: no output. Any hit means a literal value was committed and must be rotated in the Vercel dashboard.

---

## Self-Review

**Spec coverage.** §1 storage/routes → Task 2. §2 PDF sheet → Task 4. §3 admin app → Tasks 3+5. §4 auth hardening → Task 1. §5 boot tour → Task 6. §6 public repo → Task 7. Bundled fallback PDF → Task 2 Step 2. `RESUME` text refresh → Task 4 Step 6. Dependencies → Task 2 Step 1.

**Type consistency.** `ResumeMeta` is produced by Task 2 and consumed unchanged by Tasks 3 and 5 (as `Meta`, same three fields). `validateResumePdf` returns the discriminated union defined once in Task 2 and narrowed via `check.ok` in Task 3. `isOwner`/`OWNER_COOKIE` are defined in Task 1 and used identically in Tasks 1 and 3. `autoOpen` is added in Task 4 Step 5 and consumed in Task 6 Step 4.

**Known deviation from the spec.** The spec described validating the declared content-type before the magic bytes. The plan drops the content-type check entirely: it is attacker-supplied and adds nothing once the magic number is checked. The size cap and magic number are the real gates.

**Deviation from strict TDD.** Tasks 1–2 are test-first. Tasks 3–7 are UI, routing, and animation, where the repo has no harness and the meaningful assertions are visual; those carry explicit curl and foreground-browser verification steps instead. This matches how the codebase has always been verified.
