import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

/* The garden's care journal: memory/garden_journal.md. Owner-gated by the
   same httpOnly cookie as the portal, so public visitors can neither write
   nor read it. POST appends one timestamped line under today's date
   heading; GET returns the tail for the in-game journal drawer. Writes
   fail soft on a read-only filesystem (deployed hosts) — the game keeps
   playing, only the durable log is skipped. */

const COOKIE = "archive_owner";
const FILE = path.join(process.cwd(), "memory", "garden_journal.md");
const HEADER =
  "# Agent Garden journal\n\nDaily care log — interactions, stat alerts, and mood shifts, written by the owner portal.\n";

async function isOwner(): Promise<boolean> {
  const jar = await cookies();
  const pw = process.env.OWNER_PASSWORD ?? "";
  return pw !== "" && jar.get(COOKIE)?.value === pw;
}

// Serialize writes: concurrent POSTs (e.g. a tick alert landing alongside a
// care action) would otherwise interleave read-modify-write and mangle lines.
let writeQueue: Promise<void> = Promise.resolve();

async function appendEntry(line: string): Promise<void> {
  const now = new Date();
  // local date, matching the local-time entries (UTC filed evening entries
  // under the next day's heading)
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
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
  await fs.appendFile(FILE, `- ${hm} — ${line}\n`, "utf-8");
}

export async function POST(req: Request) {
  if (!(await isOwner())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { line } = await req.json().catch(() => ({}));
  if (typeof line !== "string" || line.trim() === "" || line.length > 400) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const task = writeQueue.then(() => appendEntry(line.trim()));
  writeQueue = task.catch(() => {});
  try {
    await task;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, note: "read-only filesystem" });
  }
}

export async function GET() {
  if (!(await isOwner())) {
    return NextResponse.json({ lines: [] }, { status: 401 });
  }
  try {
    const content = await fs.readFile(FILE, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim() !== "");
    return NextResponse.json({ lines: lines.slice(-80) });
  } catch {
    return NextResponse.json({ lines: [] });
  }
}
