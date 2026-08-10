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
