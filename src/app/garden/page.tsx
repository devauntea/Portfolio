import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Garden } from "@/components/garden/Garden";
import { OWNER_COOKIE, isOwner } from "@/lib/owner-auth";

export const metadata: Metadata = {
  title: "Agent Garden | Devauntae Norman",
  description:
    "Behind the observatory's green door: a floating island where four AI agents live. Visitors watch; the keeper cares for them.",
  robots: { index: false, follow: false },
};

// Owner state comes from the httpOnly cookie, checked server-side, so the
// public payload contains zero owner markup.
export const dynamic = "force-dynamic";

export default async function GardenPage() {
  const jar = await cookies();
  return <Garden initialOwner={isOwner(jar.get(OWNER_COOKIE)?.value)} />;
}
