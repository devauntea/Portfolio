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
