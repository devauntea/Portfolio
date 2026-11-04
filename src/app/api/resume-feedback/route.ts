import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";
import { OWNER_COOKIE, isOwner } from "@/lib/owner-auth";

/* Visitor feedback from the résumé stamps. POST is public (that's the
   point, recruiters stamp and talk); writes append to
   memory/resume_feedback.md when the filesystem allows it. On read-only
   hosts (Vercel) it returns ok:false and the client falls back to a
   prefilled mailto. GET (the collected feedback) is owner-only. */

const FILE = path.join(process.cwd(), "memory", "resume_feedback.md");
const HEADER =
  "# Résumé feedback\n\nStamped verdicts + notes left by visitors in the Résumé space.\n";

let writeQueue: Promise<void> = Promise.resolve();

function localDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

async function appendEntry(verdict: string, note: string): Promise<void> {
  const now = new Date();
  const day = localDay(now);
  const hm = now.toTimeString().slice(0, 5);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  let content: string | null = null;
  try {
    content = await fs.readFile(FILE, "utf-8");
  } catch {
    await fs.writeFile(FILE, HEADER, "utf-8");
  }
  if (!content?.includes(`## ${day}`)) {
    await fs.appendFile(FILE, `\n## ${day}\n\n`, "utf-8");
  }
  await fs.appendFile(
    FILE,
    `- ${hm} | **${verdict.toUpperCase()}** ${note ? `| ${note}` : "(no note)"}\n`,
    "utf-8",
  );
}

export async function POST(req: Request) {
  const { verdict, note } = await req.json().catch(() => ({}));
  if (verdict !== "hired" && verdict !== "rejected") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const clean = typeof note === "string" ? note.trim().slice(0, 1000) : "";
  const task = writeQueue.then(() => appendEntry(verdict, clean));
  writeQueue = task.catch(() => {});
  try {
    await task;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, note: "read-only filesystem" });
  }
}

export async function GET() {
  const jar = await cookies();
  if (!isOwner(jar.get(OWNER_COOKIE)?.value)) {
    return NextResponse.json({ lines: [] }, { status: 401 });
  }
  try {
    const content = await fs.readFile(FILE, "utf-8");
    return NextResponse.json({
      lines: content.split("\n").filter((l) => l.trim() !== "").slice(-80),
    });
  } catch {
    return NextResponse.json({ lines: [] });
  }
}
