import type { Metadata } from "next";
import { cookies } from "next/headers";
import { OWNER_COOKIE, isOwner } from "@/lib/owner-auth";
import { ResumeAdmin } from "@/components/admin/ResumeAdmin";
import "./admin.css";

export const metadata: Metadata = {
  title: "Studio admin | Devauntae Norman",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const jar = await cookies();
  return <ResumeAdmin initialOwner={isOwner(jar.get(OWNER_COOKIE)?.value)} />;
}
