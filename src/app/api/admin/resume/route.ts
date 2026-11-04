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
        "Blob storage isn't configured for this environment. The bundled résumé is being served.",
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
  } catch (err) {
    /* This route is owner-only, so the real reason is worth showing: the
       useful failures here ("OIDC is enabled for this project, but not for
       the development environment") are configuration problems that a generic
       message would leave you guessing about. */
    const detail = err instanceof Error ? err.message : "";
    return NextResponse.json(
      { ok: false, error: detail || "Storage rejected the upload. Try again in a moment." },
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
