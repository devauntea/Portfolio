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
  SectionContent,
  SkillsContent,
  WorkContent,
  type Section,
} from "./PortfolioContent";
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
  const [section, setSection] = useState<Section>("work");
  const [panel, setPanel] = useState<"computer" | "resume" | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const enterRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const simple = !wide || reading || failed;
  const onReady = useCallback(() => setReady(true), []);
  const onFail = useCallback(() => {
    setFailed(true);
    setFocus("desk");
    setPanel(null);
  }, []);

  useEffect(() => {
    if (focus === "desk") return;
    const timeout = window.setTimeout(
      () => setPanel(focus === "resume" ? "resume" : "computer"),
      reduced || simple ? 0 : focus === "resume" ? 1100 : 850,
    );
    return () => window.clearTimeout(timeout);
  }, [focus, reduced, simple]);

  useEffect(() => {
    if (focus === "desk" || panel) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFocus("desk");
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [focus, panel]);

  function open(target: "computer" | "resume", next: Section = "work") {
    returnFocus.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setSection(next);
    if (simple) setPanel(target);
    else setFocus(target === "resume" ? "resume" : "monitor");
  }
  function close() {
    setPanel(null);
    setFocus("desk");
  }
  function changeSection(next: Section) {
    setSection(next);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  }
  function toggleReading() {
    close();
    setReading((v) => !v);
  }

  return (
    <main
      className={`working-desk ${simple ? "is-reading" : "is-immersive"} ${night ? "is-evening" : ""}`}
    >
      <a className="desk-skip" href={simple ? "#work" : "#desk-navigation"}>
        {DESK.enter}
      </a>
      <header className="desk-header">
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
          <div className={`desk-intro ${focus !== "desk" ? "is-away" : ""}`}>
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
          <footer className="desk-bottom">
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
              <button onClick={() => open("resume")}>
                {DESK.resumeLabel} <span aria-hidden="true">↗</span>
              </button>
            </nav>
          </footer>
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
            className={`desk-dialog ${panel === "resume" ? "desk-dialog--resume" : "desk-dialog--computer"}`}
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
            {panel === "computer" && (
              <nav className="computer-nav" aria-label={DESK.folders}>
                {DESK.nav.map((item) => (
                  <button
                    key={item.id}
                    aria-current={section === item.id ? "page" : undefined}
                    onClick={() => changeSection(item.id)}
                  >
                    <span>{item.number}</span>
                    {item.label}
                  </button>
                ))}
                <button
                  className="computer-resume"
                  onClick={() => {
                    setFocus("resume");
                    setPanel("resume");
                  }}
                >
                  {DESK.resumeLabel} ↗
                </button>
              </nav>
            )}
            <div className="computer-scroll" ref={scrollRef}>
              {panel === "resume" ? (
                <ResumeContent />
              ) : (
                <SectionContent key={section} section={section} />
              )}
              <footer className="computer-footer">
                <span>{DESK.footer.note}</span>
                <a href="/desktop">{DESK.footer.admin} ↗</a>
              </footer>
            </div>
            <div className="computer-bottom">
              <span className="power-indicator" />
              <span>{DESK.name}</span>
              <span>
                {panel === "resume"
                  ? "001 / RÉSUMÉ"
                  : `${DESK.nav.find((n) => n.id === section)?.number} / ${DESK.nav.find((n) => n.id === section)?.label.toUpperCase()}`}
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
