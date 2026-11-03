"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { DESK, GAMES } from "@/data/profile";
import { SectionContent } from "./PortfolioContent";

const SpaceShooter = dynamic(() =>
  import("@/components/sections/SpaceShooter").then((m) => m.SpaceShooter),
);
const GameRoom = dynamic(() =>
  import("@/components/sections/GameRoom").then((m) => m.GameRoom),
);
export type ComputerSection = (typeof DESK.computer.apps)[number]["id"];

type Track = {
  name: string;
  artist: string;
  album: string;
  art: string | null;
  url?: string;
  isPlaying?: boolean;
};
type Listening = {
  configured: boolean;
  now: Track | null;
  top: Track[];
  error?: string;
};

export function MusicContent() {
  const [data, setData] = useState<Listening | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/spotify", {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Music unavailable");
        const next: Listening = await response.json();
        if (next.error) throw new Error("Music unavailable");
        if (!controller.signal.aborted) {
          setData(next);
          setError(false);
        }
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    };
    void load();
    const interval = setInterval(load, 30_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", load);
    };
  }, [attempt]);
  const now = data?.now;
  return (
    <section className="music-room" aria-labelledby="listening-title">
      <header className="app-heading">
        <div>
          <p className="desk-eyebrow">{DESK.music.eyebrow}</p>
          <h2 id="listening-title">{DESK.music.title}</h2>
        </div>
        <span>{DESK.music.visual}</span>
      </header>
      <div className="now-playing">
        <div className="record-sleeve" aria-hidden="true">
          <div className="compact-disc">
            <i />
          </div>
          {now?.art ? (
            <Image src={now.art} alt="" width={320} height={320} unoptimized />
          ) : (
            <div className="record-placeholder">
              <span>dn.</span>
              <small>{DESK.music.visual}</small>
            </div>
          )}
        </div>
        <div className="now-playing-copy" aria-live="polite">
          <p className="desk-eyebrow">
            {DESK.music.now}
            <span
              className={`listening-dot ${now?.isPlaying !== false && now ? "is-playing" : ""}`}
            />
          </p>
          {error ? (
            <>
              <h3>{DESK.music.error}</h3>
              <button
                className="app-text-button"
                onClick={() => setAttempt((n) => n + 1)}
              >
                {DESK.music.retry} ↗
              </button>
            </>
          ) : !data ? (
            <h3>{DESK.music.loading}</h3>
          ) : now ? (
            <>
              <h3>{now.name}</h3>
              <p>{now.artist}</p>
              <small>{now.album}</small>
              <a
                className="app-text-button"
                href={
                  now.url ??
                  `https://open.spotify.com/search/${encodeURIComponent(`${now.name} ${now.artist}`)}`
                }
                target="_blank"
                rel="noreferrer"
              >
                {DESK.music.listen} ↗
              </a>
              <span className="music-live-label">
                {now.isPlaying === false ? DESK.music.paused : DESK.music.live}
              </span>
            </>
          ) : (
            <>
              <h3>
                {data.configured ? DESK.music.quiet : DESK.music.disconnected}
              </h3>
              <p>{DESK.music.quietDetail}</p>
            </>
          )}
        </div>
      </div>
      {!!data?.top.length && (
        <div className="rotation-collection">
          <header>
            <h3>{DESK.music.rotation}</h3>
            <span>{DESK.music.period}</span>
          </header>
          <div className="rotation-grid">
            {data.top.map((track, index) => (
              <a
                key={`${track.name}-${track.artist}`}
                href={
                  track.url ??
                  `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${track.artist}`)}`
                }
                target="_blank"
                rel="noreferrer"
                className="rotation-track"
              >
                <div>
                  {track.art && <Image src={track.art} alt="" width={160} height={160} unoptimized />}
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <strong>{track.name}</strong>
                <small>{track.artist}</small>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function GamesContent() {
  const [game, setGame] = useState<"patrol" | "den" | null>(null);
  const [recovered, setRecovered] = useState(0);
  return (
    <section className="arcade-room" aria-labelledby="arcade-title">
      <header className="app-heading">
        <div>
          <p className="desk-eyebrow">{DESK.games.eyebrow}</p>
          <h2 id="arcade-title">{DESK.games.title}</h2>
        </div>
        {game && (
          <button className="app-text-button" onClick={() => setGame(null)}>
            ← {DESK.games.back}
          </button>
        )}
      </header>
      {!game ? (
        <div className="arcade-cabinets">
          <button
            className="arcade-cabinet cabinet-patrol"
            onClick={() => setGame("patrol")}
          >
            <div className="cabinet-art" aria-hidden="true">
              <i />
              <b>✦</b>
              <span>▲</span>
            </div>
            <div>
              <small>{DESK.games.patrolLabel}</small>
              <h3>{DESK.games.patrol}</h3>
              <p>{DESK.games.patrolDetail}</p>
              <strong>{DESK.games.start} ↗</strong>
            </div>
          </button>
          <button
            className="arcade-cabinet cabinet-den"
            onClick={() => setGame("den")}
          >
            <div className="cabinet-art" aria-hidden="true">
              <i />
              <b>▤</b>
              <span>▥ ▥ ▥</span>
            </div>
            <div>
              <small>{DESK.games.denLabel}</small>
              <h3>{DESK.games.den}</h3>
              <p>{DESK.games.denDetail}</p>
              <strong>{DESK.games.start} ↗</strong>
            </div>
          </button>
        </div>
      ) : (
        <div className="embedded-game">
          {game === "patrol" ? (
            <>
              <SpaceShooter
                embedded
                onCartridge={() => setRecovered((n) => n + 1)}
              />
              <p className="cartridge-count">
                {DESK.games.recovered}: {recovered}
              </p>
            </>
          ) : (
            <GameRoom embedded />
          )}
        </div>
      )}
      {!game && (
        <div className="arcade-collection">
          <p className="desk-eyebrow">{DESK.games.collection}</p>
          {GAMES.map((g) => (
            <details key={g.id}>
              <summary>
                {g.name}
                <span>+</span>
              </summary>
              <p>{g.memory}</p>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}

export function ComputerScreen({
  section,
  onSection,
  onResume,
  onClose,
  active,
  reduced,
  pocket = false,
}: {
  section: ComputerSection;
  onSection: (next: ComputerSection) => void;
  onResume: () => void;
  onClose: () => void;
  active: boolean;
  reduced: boolean;
  pocket?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const previousActive = useRef(false);
  useEffect(() => {
    if (!active) {
      previousActive.current = false;
      return;
    }
    if (previousActive.current) return;
    previousActive.current = true;
    const timeout = setTimeout(
      () =>
        root.current
          ?.querySelector<HTMLButtonElement>('[aria-current="page"]')
          ?.focus({ preventScroll: true }),
      reduced ? 0 : 800,
    );
    return () => clearTimeout(timeout);
  }, [active, reduced]);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [section]);
  return (
    <div
      ref={root}
      className={`monitor-screen ${pocket ? "monitor-screen--pocket" : ""}`}
      aria-label={DESK.screen.system}
      role="region"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
      inert={!active}
      aria-hidden={!active}
    >
      <div className="monitor-system-bar">
        <strong>
          dn<span> / </span>
          {DESK.computer.title}
        </strong>
        <span>{DESK.location}</span>
        <button onClick={onClose} aria-label={DESK.computer.exit}>
          ×
        </button>
      </div>
      <nav className="monitor-apps" aria-label={DESK.folders}>
        {DESK.computer.apps.map((app) => (
          <button
            key={app.id}
            aria-current={section === app.id ? "page" : undefined}
            onClick={() => onSection(app.id)}
          >
            <span aria-hidden="true">{app.symbol}</span>
            {app.label}
          </button>
        ))}
        <button className="monitor-resume" onClick={onResume}>
          {DESK.resumeLabel} ↗
        </button>
      </nav>
      <div className="monitor-scroll" ref={scroll} tabIndex={0}>
        {active &&
          (section === "music" ? (
            <MusicContent />
          ) : section === "games" ? (
            <GamesContent />
          ) : (
            <SectionContent key={section} section={section} />
          ))}
      </div>
      <footer className="monitor-status">
        <span>
          <i />
          {DESK.computer.footer}
        </span>
        <a href="/desktop">{DESK.footer.admin} ↗</a>
      </footer>
    </div>
  );
}
