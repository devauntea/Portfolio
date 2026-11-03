"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { DESK, CONTACT } from "@/data/profile";
import {
  AboutContent,
  Arrow,
  ContactContent,
  ResumeContent,
  SkillsContent,
  WorkContent,
} from "./PortfolioContent";
import { ComputerScreen, type ComputerSection } from "./ComputerScreen";
import type { DeskFocus } from "./DeskScene";

const DeskScene = dynamic(() => import("./DeskScene"), { ssr: false });
const wideQuery =
  "(min-width: 900px) and (min-height: 560px) and (min-aspect-ratio: 6/5)";
const motionQuery = "(prefers-reduced-motion: reduce)";
function useMedia(query: string) {
  const subscribe = useCallback(
    (callback: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", callback);
      return () => media.removeEventListener("change", callback);
    },
    [query],
  );
  const snapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}

class SceneBoundary extends Component<
  { children: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function DeskExperience() {
  const wide = useMedia(wideQuery);
  const reduced = useMedia(motionQuery);
  const [reading, setReading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [night, setNight] = useState(false);
  const [focus, setFocus] = useState<DeskFocus>("desk");
  const [section, setSection] = useState<ComputerSection>("work");
  const [panel, setPanel] = useState<"resume" | null>(null);
  const [musicRequest, setMusicRequest] = useState(0);
  const [pocketOpen, setPocketOpen] = useState(false);
  const returnFocus = useRef<HTMLElement | null>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const pocketRef = useRef<HTMLDivElement>(null);
  const simple = !wide || reading || failed;
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setFailed(true);
    setFocus("desk");
    setPanel(null);
  }, []);

  useEffect(() => {
    if (focus !== "resume") return;
    const timeout = window.setTimeout(
      () => setPanel("resume"),
      reduced || simple ? 0 : 1100,
    );
    return () => window.clearTimeout(timeout);
  }, [focus, reduced, simple]);

  useEffect(() => {
    if (focus !== "music") return;
    const timeout = window.setTimeout(
      () => setFocus("monitor"),
      reduced ? 0 : 3400,
    );
    return () => window.clearTimeout(timeout);
  }, [focus, musicRequest, reduced]);

  useEffect(() => {
    if (!pocketOpen) return;
    pocketRef.current?.scrollIntoView({
      behavior: reduced ? "instant" : "smooth",
      block: "start",
    });
  }, [pocketOpen, reduced]);

  useEffect(() => {
    if (focus === "desk" || panel) return;
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector("[data-game-memory]")
      ) {
        setFocus("desk");
        window.requestAnimationFrame(() => enterRef.current?.focus());
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [focus, panel]);

  function open(target: "computer" | "resume", next: ComputerSection = "work") {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (target === "resume") {
      if (simple) setPanel("resume");
      else setFocus("resume");
      return;
    }
    setSection(next);
    if (simple) {
      setPocketOpen(true);
      return;
    }
    if (next === "music") {
      setMusicRequest((request) => request + 1);
      setFocus("music");
    } else setFocus("monitor");
  }
  function close() {
    setPanel(null);
    setPocketOpen(false);
    setFocus("desk");
    window.requestAnimationFrame(() => {
      if (returnFocus.current?.isConnected && !returnFocus.current.closest("[inert]"))
        returnFocus.current.focus();
      else enterRef.current?.focus();
    });
  }
  function changeSection(next: ComputerSection) {
    if (next === "music" && section !== "music" && !simple)
      open("computer", "music");
    else setSection(next);
  }
  function toggleReading() {
    close();
    setReading((v) => !v);
  }

  return (
    <main
      className={`working-desk ${simple ? "is-reading" : "is-immersive"} ${night ? "is-evening" : ""} ${!simple && focus !== "desk" ? "is-at-computer" : ""}`}
    >
      <a className="desk-skip" href={simple ? "#work" : "#desk-navigation"}>
        {DESK.enter}
      </a>
      <header className="desk-header" inert={!simple && focus !== "desk"}>
        <Link className="desk-brand" href="/" aria-label={DESK.name}>
          <span className="desk-monogram">{DESK.initials}</span>
          <span>
            {DESK.name}
            <small>{DESK.role}</small>
          </span>
        </Link>
        <div className="desk-header-right">
          <span className="desk-location">
            <i />
            {DESK.location}
          </span>
          {wide && !failed && (
            <button className="view-switch" onClick={toggleReading}>
              {reading ? DESK.immersive : DESK.simple}
              <span aria-hidden="true">{reading ? "↗" : "☷"}</span>
            </button>
          )}
          <a className="header-contact" href={`mailto:${CONTACT.email}`}>
            {DESK.nav[3].label}
            <Arrow diagonal />
          </a>
        </div>
      </header>

      {!simple ? (
        <>
          <div
            className={`desk-stage ${focus !== "desk" ? "is-focusing" : ""}`}
            aria-label={DESK.sceneLabel}
          >
            <SceneBoundary onFail={onFail}>
              <DeskScene
                focus={focus}
                reduced={reduced}
                night={night}
                section={section}
                onSection={changeSection}
                onClose={close}
                musicRequest={musicRequest}
                musicActive={
                  section === "music" &&
                  (focus === "music" || focus === "monitor")
                }
                onMusic={() => open("computer", "music")}
                onGames={() => open("computer", "games")}
                onMonitor={() => open("computer")}
                onResume={() => open("resume")}
                onAbout={() => open("computer", "about")}
                onLamp={() => setNight((v) => !v)}
                onReady={onReady}
                onFail={onFail}
              />
            </SceneBoundary>
            {!ready && (
              <div className="desk-loading" role="status">
                <span className="loading-mark">{DESK.initials}</span>
                <span>{DESK.loading}</span>
              </div>
            )}
          </div>
          <div
            className={`desk-intro ${focus !== "desk" ? "is-away" : ""}`}
            inert={focus !== "desk"}
            aria-hidden={focus !== "desk"}
          >
            <p className="desk-eyebrow">{DESK.eyebrow}</p>
            <h1>
              {DESK.headline[0]}
              <br />
              <em>{DESK.headline[1]}</em>
              <br />
              {DESK.headline[2]}
              <br />
              <em>{DESK.headline[3]}</em>
            </h1>
            <p className="desk-intro-copy">{DESK.intro}</p>
            <button
              ref={enterRef}
              className="desk-button"
              onClick={() => open("computer")}
            >
              {DESK.enter}
              <Arrow diagonal />
            </button>
          </div>
          <footer className="desk-bottom" inert={focus !== "desk"}>
            <p>
              <span className="status-dot" />
              {DESK.status}
            </p>
            <nav id="desk-navigation" tabIndex={-1} aria-label={DESK.shortcuts}>
              {DESK.nav.map((item) => (
                <button key={item.id} onClick={() => open("computer", item.id)}>
                  {item.label}
                </button>
              ))}
              <button onClick={() => open("computer", "games")}>
                {DESK.computer.apps[1].label}
              </button>
              <button onClick={() => open("computer", "music")}>
                {DESK.computer.apps[2].label}
              </button>
              <button onClick={() => open("resume")}>
                {DESK.resumeLabel} <span aria-hidden="true">↗</span>
              </button>
            </nav>
          </footer>
          {focus !== "desk" && !panel && (
            <div className="desk-return-bar">
              <button onClick={close}>
                ← {DESK.close} <kbd>{DESK.escape}</kbd>
              </button>
              {focus === "music" && (
                <span role="status">{DESK.room.musicLoading}</span>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          <section className="reading-hero">
            <p className="desk-eyebrow">
              {failed
                ? DESK.eyebrow
                : wide
                  ? DESK.eyebrow
                  : DESK.mobile.eyebrow}
            </p>
            <h1>
              {DESK.headline[0]}
              <br />
              <em>{DESK.headline[1]}</em>
              <br />
              {DESK.headline[2]}
              <br />
              <em>{DESK.headline[3]}</em>
            </h1>
            <p>{failed ? DESK.fallback : DESK.intro}</p>
            <div className="reading-hero-actions">
              <a className="desk-button" href="#work">
                {DESK.enter}
                <Arrow />
              </a>
              <a
                className="desk-text-link"
                href={CONTACT.resumeHref}
                onClick={(event) => {
                  event.preventDefault();
                  open("resume");
                }}
              >
                {DESK.resumeLabel} <span aria-hidden="true">↗</span>
              </a>
            </div>
            <div className="reading-illustration" aria-hidden="true">
              <div className="mini-monitor">
                <div className="mini-screen">
                  <small>{DESK.miniComputerLabel}</small>
                  <span>
                    {DESK.miniTitle[0]}
                    <br />
                    <em>{DESK.miniTitle[1]}</em>
                  </span>
                  <b>● ● ●</b>
                </div>
                <div className="mini-chin">
                  {DESK.name.split(" ")[1].toUpperCase()}
                  <span>●</span>
                </div>
              </div>
              <div className="mini-stand" />
              <div className="mini-keyboard" />
            </div>
          </section>
          <nav className="reading-nav" aria-label={DESK.sectionsLabel}>
            {DESK.nav.map((item) => (
              <a key={item.id} href={`#${item.id}`}>
                <span>{item.number}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <section className="pocket-launcher">
            <div>
              <p className="desk-eyebrow">{DESK.computer.pocket}</p>
              <p>{DESK.computer.pocketIntro}</p>
            </div>
            <button onClick={() => open("computer", "games")}>
              ✳ {DESK.computer.apps[1].label}
            </button>
            <button onClick={() => open("computer", "music")}>
              ♫ {DESK.computer.apps[2].label}
            </button>
          </section>
          {pocketOpen && (
            <div ref={pocketRef} className="pocket-computer">
              <ComputerScreen
                pocket
                section={section}
                onSection={changeSection}
                onResume={() => open("resume")}
                onClose={close}
                active
                reduced={reduced}
              />
            </div>
          )}
          <div className="reading-content">
            <WorkContent />
            <AboutContent />
            <SkillsContent />
            <ContactContent />
          </div>
          <footer className="reading-footer">
            <span>{DESK.footer.note}</span>
            <a href="/desktop">
              {DESK.footer.legacy}
              <Arrow diagonal />
            </a>
          </footer>
        </>
      )}

      <Dialog.Root
        open={panel !== null}
        onOpenChange={(value) => {
          if (!value) close();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="desk-dialog-overlay" />
          <Dialog.Content
            className="desk-dialog desk-dialog--resume"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const target = returnFocus.current;
              if (target?.isConnected && target !== document.body)
                target.focus();
              else enterRef.current?.focus();
            }}
          >
            <div className="computer-bar">
              <Dialog.Title>
                {panel === "resume" ? DESK.resume.eyebrow : DESK.screen.system}
              </Dialog.Title>
              <Dialog.Close
                className="dialog-close"
                aria-label={panel === "resume" ? DESK.resume.close : DESK.close}
              >
                <span>{DESK.close}</span>
                <kbd>{DESK.escape}</kbd>
                <b aria-hidden="true">×</b>
              </Dialog.Close>
            </div>
            <div className="computer-scroll">
              <ResumeContent />
              <footer className="computer-footer">
                <span>{DESK.footer.note}</span>
                <a href="/desktop">{DESK.footer.admin} ↗</a>
              </footer>
            </div>
            <div className="computer-bottom">
              <span className="power-indicator" />
              <span>{DESK.name}</span>
              <span>{DESK.resume.eyebrow}</span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
