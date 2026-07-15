import { NextResponse } from "next/server";

/* Spotify bridge for the Music app. Uses the refresh-token flow with three
   server-only env vars (see README → "Linking Spotify"):
     SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN
   Returns { configured:false } until they exist — the Music app shows its
   "not linked yet" state and keeps the vinyl spinning. Responses cache for
   30s per server instance to stay far inside Spotify's rate limits. */

interface Track {
  name: string;
  artist: string;
  album: string;
  art: string | null;
}
interface Payload {
  configured: boolean;
  now: (Track & { progressMs?: number }) | null;
  top: Track[];
}

let cache: { at: number; data: Payload } | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTrack(item: any): Track {
  return {
    name: item?.name ?? "Unknown",
    artist: (item?.artists ?? []).map((a: { name: string }) => a.name).join(", "),
    album: item?.album?.name ?? "",
    art: item?.album?.images?.[1]?.url ?? item?.album?.images?.[0]?.url ?? null,
  };
}

export async function GET() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN;
  if (!id || !secret || !refresh) {
    return NextResponse.json({ configured: false, now: null, top: [] } satisfies Payload);
  }
  if (cache && Date.now() - cache.at < 30_000) {
    return NextResponse.json(cache.data);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refresh }),
      cache: "no-store",
    });
    const { access_token: token } = await tokenRes.json();
    if (!token) throw new Error("no access token");

    const auth = { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" as const };
    const [nowRes, topRes] = await Promise.all([
      fetch("https://api.spotify.com/v1/me/player/currently-playing", auth),
      fetch("https://api.spotify.com/v1/me/top/tracks?limit=6&time_range=short_term", auth),
    ]);

    let now: Payload["now"] = null;
    if (nowRes.status === 200) {
      const d = await nowRes.json();
      if (d?.item) now = { ...toTrack(d.item), progressMs: d.progress_ms };
    }
    const top: Track[] = topRes.ok
      ? ((await topRes.json())?.items ?? []).map(toTrack)
      : [];

    const data: Payload = { configured: true, now, top };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { configured: true, now: null, top: [], error: "spotify unreachable" },
      { status: 502 },
    );
  }
}
