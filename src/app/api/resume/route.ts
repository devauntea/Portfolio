import { NextResponse } from "next/server";
import { resumeMeta } from "@/lib/resume-store";

/* Public. Tells the client which résumé is current and when it landed. */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await resumeMeta(), {
    headers: { "Cache-Control": "no-store" },
  });
}
