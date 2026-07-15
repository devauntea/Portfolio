import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/* Simulated owner auth. The password lives in OWNER_PASSWORD (server-only) —
   NOT NEXT_PUBLIC_*, which would ship the secret to every visitor's bundle.
   Success sets an httpOnly cookie; the UI never sees the value. Swap this file
   for real auth (magic link / OAuth) later without touching any component. */

const COOKIE = "archive_owner";

function ownerPassword() {
  return process.env.OWNER_PASSWORD ?? "";
}

export async function GET() {
  const jar = await cookies();
  const pw = ownerPassword();
  const owner = pw !== "" && jar.get(COOKIE)?.value === pw;
  return NextResponse.json({ owner });
}

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const pw = ownerPassword();
  if (pw === "") {
    return NextResponse.json(
      { owner: false, error: "Owner portal not configured (set OWNER_PASSWORD)." },
      { status: 503 },
    );
  }
  if (password !== pw) {
    return NextResponse.json(
      { owner: false, error: "Access denied. The agents don't know you." },
      { status: 401 },
    );
  }
  const jar = await cookies();
  jar.set(COOKIE, pw, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return NextResponse.json({ owner: true });
}

export async function DELETE() {
  const jar = await cookies();
  jar.delete(COOKIE);
  return NextResponse.json({ owner: false });
}
