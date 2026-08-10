/* Who counts as the owner. Every gated route asks this module and nothing
   else, so there is exactly one definition of a valid session.

   The cookie carries sha256(salt + OWNER_PASSWORD), never the password. The
   cookie is a bearer token — anything that leaks it (a log, a screenshot, a
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
