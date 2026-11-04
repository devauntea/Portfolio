import Link from "next/link";
import { TokenPanel } from "./TokenPanel";

/* Spotify's redirect target. Exchanges the ?code for a refresh token
   server-side (client secret never reaches the browser) and shows the
   token once, with copy-paste instructions. Whoever completes this is the
   owner, they just logged into Spotify, so it's safe to display here.
   Setting SPOTIFY_REFRESH_TOKEN in the env + redeploying makes the Music
   app light up permanently. */

export const dynamic = "force-dynamic";

async function exchange(code: string): Promise<
  { ok: true; refresh: string } | { ok: false; error: string }
> {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirect = process.env.SPOTIFY_REDIRECT_URI;
  if (!id || !secret || !redirect) {
    return { ok: false, error: "Spotify env vars are not fully set on the server." };
  }
  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirect,
      }),
      cache: "no-store",
    });
    const data = await res.json();
    if (data.refresh_token) return { ok: true, refresh: data.refresh_token };
    return { ok: false, error: data.error_description ?? data.error ?? "No refresh token returned." };
  } catch {
    return { ok: false, error: "Could not reach Spotify to exchange the code." };
  }
}

export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string }>;
}) {
  const { code, error } = await searchParams;
  const result = error
    ? ({ ok: false, error: `Spotify said: ${error}` } as const)
    : code
      ? await exchange(code)
      : ({ ok: false, error: "No code in the URL. Start from the Connect button in the Music app." } as const);

  return (
    <main className="desktop-pattern grid min-h-screen place-items-center p-6">
      <div className="bevel-out w-full max-w-lg bg-panel p-1 shadow-[8px_8px_0_rgb(0_0_0/0.4)]">
        <div className="titlebar-gradient flex items-center gap-2 px-2 py-1.5">
          <span aria-hidden>🎧</span>
          <h1 className="font-mono text-[11px] font-bold uppercase tracking-wider text-starlight">
            Spotify link setup
          </h1>
        </div>
        <div className="bevel-in m-1 bg-cosmos/60 p-4">
          {result.ok ? (
            <>
              <p className="text-sm font-semibold text-sprout">✓ Authorized.</p>
              <p className="mt-2 text-xs text-faint">
                This is your <strong className="text-starlight">refresh token</strong>. It goes
                into the server as <code className="text-lumen">SPOTIFY_REFRESH_TOKEN</code>, then
                the turntable spins to your real listening.
              </p>
              <TokenPanel refresh={result.refresh} />
              <ol className="mt-3 list-decimal space-y-1 pl-4 text-[11px] leading-relaxed text-faint">
                <li>Copy the token above.</li>
                <li>
                  Paste it back in chat and Devauntae&apos;s assistant will store it &amp; redeploy,
                  or set <code className="text-lumen">SPOTIFY_REFRESH_TOKEN</code> in Vercel yourself.
                </li>
              </ol>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-rose">Couldn&apos;t finish linking.</p>
              <p className="mt-2 text-xs text-faint">{result.error}</p>
              <a
                href="/api/spotify/login"
                className="bevel-out mt-3 inline-block bg-panel px-3 py-1.5 font-mono text-[11px] text-starlight active:bevel-in"
              >
                ↻ try connecting again
              </a>
            </>
          )}
          <div className="mt-4 border-t border-seam pt-3">
            <Link href="/" className="font-mono text-[11px] text-lumen underline">
              ← back to DevauntaeOS
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
