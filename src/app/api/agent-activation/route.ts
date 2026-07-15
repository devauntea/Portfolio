import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { promises as fs } from "fs";
import path from "path";

/* Appends an activation entry to memory/agent_activation_log.md.
   Owner-gated by the same cookie as the portal — a public visitor can't write
   to the log. This records the *simulated* activation; it does not start any
   real process (see the activation guide in the README). */

const COOKIE = "archive_owner";

export async function POST(req: Request) {
  const jar = await cookies();
  const pw = process.env.OWNER_PASSWORD ?? "";
  if (pw === "" || jar.get(COOKIE)?.value !== pw) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { id, name } = await req.json().catch(() => ({}));
  if (!id || !name) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const dir = path.join(process.cwd(), "memory");
  const file = path.join(dir, "agent_activation_log.md");
  const stamp = new Date().toISOString();
  const line = `- ${stamp} — **${name}** (\`${id}\`) marked ONLINE (simulated activation)\n`;

  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(
      file,
      "# Agent activation log\n\nSimulated activations from the owner portal. Each line is a UI state change, not a started process.\n\n",
      "utf-8",
    );
  }
  await fs.appendFile(file, line, "utf-8");
  return NextResponse.json({ ok: true });
}
