import { NextResponse } from "next/server";

/* Kicks off the one-time Spotify authorization. Sends the owner to
   Spotify's consent screen with exactly the read scopes the Music app
   needs; Spotify redirects back to /callback with a code we exchange for a
   long-lived refresh token. The client id is public by OAuth design. */

const SCOPES = "user-read-currently-playing user-top-read user-read-recently-played";

export async function GET(req: Request) {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const redirect =
    process.env.SPOTIFY_REDIRECT_URI ?? new URL("/callback", req.url).toString();
  if (!id) {
    return NextResponse.json({ error: "SPOTIFY_CLIENT_ID not set" }, { status: 500 });
  }
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", id);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirect);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("show_dialog", "true");
  return NextResponse.redirect(url.toString());
}
