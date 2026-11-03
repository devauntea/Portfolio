"use client";

/* Fullscreen Résumé space — a physical stamp desk.

   The ritual: press a rubber stamp to pick it up — a grabbing hand replaces
   the cursor and the stamp rides along as a floating ghost. Carry it to the
   ink tray and release on the matching pad to ink it (the face comes back
   wet). Then carry it over the résumé: a live preview shows exactly where
   the mark will land; release to SLAM it. Ink is spent per stamp. Dropping
   a dry stamp on the paper earns a reminder. Every landed stamp opens the
   feedback card (POST /api/resume-feedback; mailto fallback on read-only
   hosts). */

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { CONTACT, DOCS, LEGACY_NAV } from "@/data/profile";
import { useOs } from "@/lib/os-store";
import { setAmbient, chime, thunk, stampSlam } from "@/lib/sound";
import { PixelIcon } from "@/components/os/PixelIcons";
import { CurrentResume } from "@/components/resume/CurrentResume";

const MAX_TILT = 12;

type Verdict = "hired" | "rejected";
interface Mark {
  id: number;
  verdict: Verdict;
  x: number; // % across the sheet
  y: number;
  rot: number;
}
interface Preview {
  verdict: Verdict;
  x: number;
  y: number;
}

const STAMPS: Record<
  Verdict,
  { ink: string; small: string; big: string; prompt: string; placeholder: string }
> = {
  hired: {
    ink: "#1e7d32",
    small: "APPROVED",
    big: "HIRED",
    prompt: "Stamped HIRED ✓ — what sealed the deal?",
    placeholder: "the projects? the cat memes? tell Devauntae…",
  },
  rejected: {
    ink: "#c62828",
    small: "DENIED",
    big: "REJECTED",
    prompt: "Stamped REJECTED ✗ — ouch. What would change your mind?",
    placeholder: "be honest — what's missing?",
  },
};

const inRect = (r: DOMRect | undefined | null, x: number, y: number) =>
  !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

function StringTie({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 60 24" className="h-6 w-14" aria-hidden>
      <circle cx="14" cy="12" r="5" fill="#a8895a" stroke="#7a5f38" strokeWidth="1.5" />
      <circle cx="46" cy="12" r="5" fill="#a8895a" stroke="#7a5f38" strokeWidth="1.5" />
      {open ? (
        <path d="M14 12 q 10 14 24 4" stroke="#6b5230" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M14 12 C 26 2, 34 22, 46 12" stroke="#6b5230" strokeWidth="1.6" fill="none" />
          <path d="M14 12 C 26 22, 34 2, 46 12" stroke="#6b5230" strokeWidth="1.6" fill="none" />
        </>
      )}
    </svg>
  );
}

function StampFace({ verdict, wet }: { verdict: Verdict; wet: boolean }) {
  const s = STAMPS[verdict];
  return (
    <span
      className="relative block border-[3px] px-3 py-1 text-center"
      style={{
        borderColor: s.ink,
        color: s.ink,
        boxShadow: `inset 0 0 0 1.5px ${s.ink}`,
        opacity: wet ? 1 : 0.45,
      }}
    >
      <span className="block font-mono text-[9px] font-bold tracking-[0.3em]">{s.small}</span>
      <span className="block font-mono text-lg font-black leading-tight tracking-[0.14em]">
        {s.big}
      </span>
      {wet && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(circle at 30% 25%, ${s.ink}33, transparent 60%)` }}
        />
      )}
    </span>
  );
}

function StampMark({ m, preview }: { m: Mark; preview?: boolean }) {
  return (
    <motion.div
      initial={preview ? false : { scale: 2, opacity: 0 }}
      animate={preview ? { scale: 1, opacity: 0.4 } : { scale: 1, opacity: 0.82 }}
      transition={{ type: "spring", stiffness: 600, damping: 24 }}
      className="pointer-events-none absolute select-none mix-blend-multiply"
      style={{ left: `${m.x}%`, top: `${m.y}%` }}
      aria-label={preview ? undefined : `${STAMPS[m.verdict].big} stamp mark`}
    >
      <div style={{ transform: `translate(-50%, -50%) rotate(${m.rot}deg)` }}>
        <StampFace verdict={m.verdict} wet />
      </div>
      {preview && (
        <div
          aria-hidden
          className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed"
          style={{ borderColor: STAMPS[m.verdict].ink }}
        />
      )}
    </motion.div>
  );
}

/* a stamp sitting on the tray; pressing it starts a carry */
function TrayStamp({
  verdict,
  inked,
  carried,
  onPickUp,
}: {
  verdict: Verdict;
  inked: boolean;
  carried: boolean;
  onPickUp: (v: Verdict, e: React.PointerEvent) => void;
}) {
  const s = STAMPS[verdict];
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        onPickUp(verdict, e);
      }}
      data-cursor="hand"
      aria-label={`${s.big} stamp — press and drag it to the ink pad, then onto the résumé${inked ? " (inked)" : " (dry)"}`}
      className={`flex cursor-grab touch-none select-none flex-col items-center gap-1.5 transition-opacity active:cursor-grabbing ${
        carried ? "opacity-25" : "hover:-translate-y-0.5"
      }`}
    >
      <span aria-hidden className="h-7 w-3.5 rounded-t-full rounded-b-sm bg-gradient-to-b from-[#a8794e] to-[#6b4a2e] shadow" />
      <span aria-hidden className="h-1.5 w-14 rounded-sm bg-[#4a3520]" />
      <span
        className="rounded-sm bg-[#f5f1e6] p-1 shadow-[0_8px_18px_rgb(0_0_0/0.45)]"
        style={inked ? { boxShadow: `0 8px 18px rgb(0 0 0 / 0.45), 0 0 0 2px ${s.ink}` } : undefined}
      >
        <StampFace verdict={verdict} wet={inked} />
      </span>
      <span className="font-mono text-[9px] uppercase tracking-widest text-starlight/80">
        {inked ? "inked · ready" : `${s.big.toLowerCase()} · dry`}
      </span>
    </button>
  );
}

function InkTray({
  padRef,
  carrying,
  ink,
}: {
  padRef: React.RefObject<HTMLDivElement | null>;
  carrying: Verdict | null;
  ink: Record<Verdict, boolean>;
}) {
  const wants = carrying !== null && !ink[carrying];
  return (
    <div
      ref={padRef}
      aria-label="Ink tray"
      className={`rounded-lg bg-[#3a2c1c] p-2 shadow-[0_14px_30px_rgb(0_0_0/0.5)] transition-transform ${
        wants ? "scale-105 ring-2 ring-gilt/70" : ""
      }`}
    >
      <p className="mb-1.5 text-center font-mono text-[9px] uppercase tracking-widest text-[#c9a869]">
        ink tray {wants && "· drop here"}
      </p>
      <div className="flex gap-2">
        {(Object.keys(STAMPS) as Verdict[]).map((v) => (
          <div
            key={v}
            className={`h-12 w-16 rounded-md border-2 border-black/40 transition-all ${
              carrying === v && !ink[v] ? "animate-pulse" : ""
            }`}
            style={{
              background: `radial-gradient(circle at 45% 40%, ${STAMPS[v].ink}, color-mix(in srgb, ${STAMPS[v].ink} 55%, black))`,
              boxShadow: "inset 0 4px 10px rgb(0 0 0 / 0.55)",
            }}
            aria-label={`${STAMPS[v].big} ink pad`}
          />
        ))}
      </div>
    </div>
  );
}

function PaperSheet({
  marks,
  preview,
  highlight,
  outerRef,
}: {
  marks: Mark[];
  preview: Preview | null;
  highlight: boolean;
  outerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 });
  const sry = useSpring(ry, { stiffness: 180, damping: 18 });

  function onPointerMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    ry.set(Math.max(-1, Math.min(1, dx)) * MAX_TILT);
    rx.set(Math.max(-1, Math.min(1, -dy)) * MAX_TILT);
  }
  function onPointerLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      ref={(el) => {
        ref.current = el;
        outerRef.current = el;
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: -24, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: "spring", stiffness: 170, damping: 22 }}
      style={{ rotateX: srx, rotateY: sry, transformStyle: "preserve-3d" }}
      aria-label="Résumé sheet — carry an inked stamp over it, then release to stamp"
      className={`touch-pan-y relative mx-auto max-h-[72vh] w-full max-w-2xl overflow-y-auto rounded-[3px] bg-[#f5f1e6] p-3 text-[#241f1a] shadow-[0_34px_80px_rgb(0_0_0/0.6)] sm:p-5 ${
        highlight ? "ring-4 ring-gilt/70" : ""
      }`}
    >
      <CurrentResume />
      <a
        href={CONTACT.resumeHref}
        download
        data-cursor="hand"
        className="mt-6 inline-block rounded border border-[#241f1a]/40 px-3 py-1.5 font-mono text-xs text-[#241f1a]/80 transition-colors hover:bg-[#241f1a]/5"
      >
        📄 download the résumé (PDF)
      </a>
      <div
        aria-hidden
        className="absolute right-0 top-0 h-8 w-8"
        style={{
          background: "linear-gradient(225deg, #3a2c18 48%, #e6e0d0 50%, #d8d0ba 100%)",
          borderBottomLeftRadius: "3px",
        }}
      />

      {/* landed ink + live placement preview */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {marks.map((m) => (
          <StampMark key={m.id} m={m} />
        ))}
        {preview && (
          <StampMark m={{ id: -1, verdict: preview.verdict, x: preview.x, y: preview.y, rot: 0 }} preview />
        )}
      </div>
    </motion.div>
  );
}

/* the stamp that rides the cursor while carrying, plus a grabbing hand */
function CarryGhost({ verdict, x, y, inked }: { verdict: Verdict; x: number; y: number; inked: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed z-[400] -translate-x-1/2 -translate-y-full"
      style={{ left: x, top: y }}
    >
      <div className="relative -rotate-6">
        <span className="block rounded-sm bg-[#f5f1e6] p-1 shadow-[0_18px_26px_rgb(0_0_0/0.55)]">
          <StampFace verdict={verdict} wet={inked} />
        </span>
        {/* grabbing hand */}
        <span className="absolute -right-3 -top-4 text-2xl drop-shadow-[0_2px_3px_rgb(0_0_0/0.6)]">✊</span>
      </div>
    </div>
  );
}

function FeedbackCard({ verdict, onClose }: { verdict: Verdict; onClose: () => void }) {
  const s = STAMPS[verdict];
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    let ok = false;
    try {
      const r = await fetch("/api/resume-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict, note }),
      });
      ok = (await r.json().catch(() => ({ ok: false }))).ok === true;
    } catch {
      ok = false;
    }
    if (ok) {
      setDone("📬 Feedback filed — thank you!");
    } else {
      const subject = encodeURIComponent(`Résumé feedback — stamped ${s.big}`);
      const body = encodeURIComponent(note.trim() || `(stamped ${s.big}, no note)`);
      window.open(`mailto:${CONTACT.email}?subject=${subject}&body=${body}`, "_blank");
      setDone("📮 Opened your mail app — send it from there!");
    }
    setBusy(false);
    setTimeout(onClose, 2400);
  }

  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="bevel-out fixed inset-x-3 bottom-4 z-20 mx-auto max-w-md bg-panel p-3 shadow-[8px_8px_0_rgb(0_0_0/0.4)]"
      role="form"
      aria-label="Résumé feedback"
    >
      {done ? (
        <p className="py-3 text-center font-mono text-xs text-starlight">{done}</p>
      ) : (
        <>
          <p
            className="font-mono text-[11px] font-bold"
            style={{ color: verdict === "hired" ? "var(--sprout)" : "var(--rose)" }}
          >
            {s.prompt}
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={s.placeholder}
            rows={2}
            maxLength={1000}
            data-cursor="hand"
            className="bevel-in mt-2 w-full resize-none bg-cosmos/70 p-2 text-xs text-starlight outline-none placeholder:text-faint/50"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={send}
              disabled={busy}
              data-cursor="hand"
              className="bevel-out flex-1 bg-panel py-1.5 font-mono text-[11px] font-bold text-starlight active:bevel-in disabled:opacity-50"
            >
              {busy ? "filing…" : "✉ file feedback"}
            </button>
            <button
              onClick={onClose}
              data-cursor="hand"
              className="bevel-out bg-panel px-3 py-1.5 font-mono text-[11px] text-faint active:bevel-in"
            >
              skip
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

export function ResumeSpace({ autoOpen = false }: { autoOpen?: boolean } = {}) {
  const exitSpace = useOs((s) => s.exitSpace);
  /* the intro tour lands here with the folder already untied */
  const [open, setOpen] = useState(autoOpen);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [feedback, setFeedback] = useState<Verdict | null>(null);
  const [ink, setInk] = useState<Record<Verdict, boolean>>({ hired: false, rejected: false });
  const [carrying, setCarrying] = useState<Verdict | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [docPrompt, setDocPrompt] = useState<string | null>(null);
  const padRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setAmbient("office");
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (carrying) {
        setCarrying(null);
        setPreview(null);
      } else if (docPrompt) setDocPrompt(null);
      else if (feedback) setFeedback(null);
      else exitSpace();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitSpace, feedback, carrying, docPrompt]);

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2800);
    return () => clearTimeout(t);
  }, [hint]);

  // carry loop: track the pointer + preview while a stamp is held
  useEffect(() => {
    if (!carrying) return;
    const onMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      setPointer({ x, y });
      const sheetR = sheetRef.current?.getBoundingClientRect();
      if (ink[carrying] && open && inRect(sheetR, x, y) && sheetR) {
        setPreview({
          verdict: carrying,
          x: Math.min(94, Math.max(6, ((x - sheetR.left) / sheetR.width) * 100)),
          y: Math.min(96, Math.max(4, ((y - sheetR.top) / sheetR.height) * 100)),
        });
      } else {
        setPreview(null);
      }
    };
    const onUp = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      const padR = padRef.current?.getBoundingClientRect();
      const sheetR = sheetRef.current?.getBoundingClientRect();

      if (inRect(padR, x, y)) {
        setInk((s) => ({ ...s, [carrying]: true }));
        thunk();
        setHint(`${STAMPS[carrying].big} stamp inked — now press it on the résumé.`);
      } else if (inRect(sheetR, x, y) && open && sheetR) {
        if (!ink[carrying]) {
          thunk();
          setHint("Dry stamp! Drop it on the ink tray first.");
        } else {
          setMarks((ms) => [
            ...ms,
            {
              id: Date.now(),
              verdict: carrying,
              x: Math.min(94, Math.max(6, ((x - sheetR.left) / sheetR.width) * 100)),
              y: Math.min(96, Math.max(4, ((y - sheetR.top) / sheetR.height) * 100)),
              rot: -14 + Math.random() * 24,
            },
          ]);
          setInk((s) => ({ ...s, [carrying]: false }));
          stampSlam();
          setFeedback(carrying);
        }
      } else if (inRect(sheetR, x, y) && !open) {
        setHint("Untie the folder first — the résumé is still filed.");
      }
      setCarrying(null);
      setPreview(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [carrying, ink, open]);

  function pickUp(v: Verdict, e: React.PointerEvent) {
    setPointer({ x: e.clientX, y: e.clientY });
    setCarrying(v);
    thunk();
  }

  return (
    <div
      className={`fixed inset-0 z-[60] overflow-hidden ${carrying ? "cursor-none" : ""}`}
      style={{
        background: "radial-gradient(circle at 50% 20%, #4a3520 0%, #33241a 45%, #1e1510 100%)",
      }}
      aria-label="Résumé space"
    >
      {/* desk grain */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{ background: "repeating-linear-gradient(92deg, transparent 0 26px, rgb(0 0 0 / 0.18) 26px 28px)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 38%, rgb(255 217 160 / 0.16), transparent 60%)" }}
      />

      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-2 p-3">
        <span className="bevel-out flex min-w-0 items-center gap-2 bg-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-starlight">
          <PixelIcon id="resume" className="h-4 w-4 shrink-0" />
          {LEGACY_NAV.resumeTitle}
          <span className="hidden sm:inline">— {LEGACY_NAV.stampHint}</span>
        </span>
        <button
          onClick={exitSpace}
          autoFocus
          data-cursor="hand"
          className="bevel-out flex min-h-11 shrink-0 items-center gap-2 bg-panel px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-starlight active:bevel-in"
        >
          {LEGACY_NAV.backToDesktop}
          <kbd className="hidden opacity-60 sm:inline">{LEGACY_NAV.escapeHint}</kbd>
        </button>
      </div>

      <AnimatePresence>
        {hint && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="bevel-out absolute left-1/2 top-14 z-20 -translate-x-1/2 whitespace-nowrap bg-panel px-3 py-1.5 font-mono text-[10px] text-gilt"
          >
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {/* the desk: stamps + ink tray | folder */}
      <div className="flex h-full flex-col items-center justify-center gap-5 p-4 pt-16 lg:flex-row lg:gap-10 sm:p-10">
        <div className="flex shrink-0 flex-row items-end gap-5 lg:flex-col lg:items-center lg:gap-7">
          {(Object.keys(STAMPS) as Verdict[]).map((v) => (
            <TrayStamp
              key={v}
              verdict={v}
              inked={ink[v]}
              carried={carrying === v}
              onPickUp={pickUp}
            />
          ))}
          <InkTray padRef={padRef} carrying={carrying} ink={ink} />
        </div>

        <div className="w-full max-w-3xl [perspective:1100px]">
          <motion.div
            animate={{ y: open ? 40 : 0 }}
            transition={{ type: "spring", stiffness: 190, damping: 24 }}
            className="relative rounded-xl bg-[#d8b878] p-4 shadow-[0_30px_70px_rgb(0_0_0/0.55)] sm:p-6"
          >
            <div className="absolute -top-3 left-10 h-4 w-36 rounded-t-lg bg-[#d8b878]" aria-hidden />
            <div className="flex items-center justify-between rounded-lg bg-[#c9a869] px-4 py-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#5a4520] sm:text-sm">
                Norman, D. — Curriculum Vitae
              </span>
              <button
                onClick={() => {
                  setOpen((v) => !v);
                  if (open) thunk();
                  else chime();
                }}
                data-cursor="hand"
                aria-expanded={open}
                aria-label={open ? "Close the folder" : "Open the folder"}
                className="flex items-center gap-2 rounded-md border border-[#7a5f38]/50 bg-[#d8b878] px-3 py-1.5 transition-transform hover:-translate-y-px"
              >
                <StringTie open={open} />
                <span className="font-mono text-[11px] text-[#5a4520]">{open ? "tie" : "untie"}</span>
              </button>
            </div>

            <div className="relative z-10 min-h-[4rem]">
              <AnimatePresence>
                {open && (
                  <PaperSheet marks={marks} preview={preview} highlight={carrying !== null && ink[carrying]} outerRef={sheetRef} />
                )}
              </AnimatePresence>
              {!open && (
                <p className="py-10 text-center font-mono text-xs text-[#5a4520]/70">
                  ( contents filed — untie the string{marks.length > 0 ? "; your verdict is on record" : ""} )
                </p>
              )}
            </div>

            <div className="relative z-10 mt-2 flex flex-wrap items-center gap-2 px-1 pb-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#5a4520]/70">
                also filed:
              </span>
              {DOCS.map((d) =>
                d.gated ? (
                  <button
                    key={d.label}
                    onClick={() => {
                      setDocPrompt(d.label);
                      chime();
                    }}
                    data-cursor="hand"
                    className="rounded-t-md border border-b-0 border-[#7a5f38]/50 bg-[#e6d9b8] px-3 py-1.5 font-mono text-[11px] text-[#5a4520] shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    {d.icon} {d.label} <span className="text-[9px] opacity-60">🔒 on request</span>
                  </button>
                ) : (
                  <a
                    key={d.label}
                    href={d.href}
                    target="_blank"
                    rel="noreferrer"
                    data-cursor="hand"
                    className="rounded-t-md border border-b-0 border-[#7a5f38]/50 bg-[#e6d9b8] px-3 py-1.5 font-mono text-[11px] text-[#5a4520] shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    {d.icon} {d.label} <span className="text-[9px] opacity-60">PDF ↗</span>
                  </a>
                ),
              )}
            </div>

            <div className="pointer-events-none absolute inset-x-4 bottom-3 h-10 rounded-b-lg bg-gradient-to-t from-[#c9a869] to-transparent" aria-hidden />
          </motion.div>
        </div>
      </div>

      {/* the carried stamp + grabbing hand riding the cursor */}
      {carrying && <CarryGhost verdict={carrying} x={pointer.x} y={pointer.y} inked={ink[carrying]} />}

      <AnimatePresence>
        {feedback && <FeedbackCard verdict={feedback} onClose={() => setFeedback(null)} />}
      </AnimatePresence>

      {/* gated-document prompt (transcript is available on request only) */}
      <AnimatePresence>
        {docPrompt && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="bevel-out fixed inset-x-3 bottom-4 z-20 mx-auto max-w-md bg-panel p-3 shadow-[8px_8px_0_rgb(0_0_0/0.4)]"
            role="dialog"
            aria-label={`${docPrompt} — available on request`}
          >
            <p className="font-mono text-[11px] font-bold text-gilt">
              🔒 {docPrompt} — available on request
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-faint">
              I keep my {docPrompt.toLowerCase()} private rather than posting it publicly.
              If you&apos;re recruiting and want it, reach out — happy to share it directly.
            </p>
            <div className="mt-2 flex gap-2">
              <a
                href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(`Requesting Devauntae's ${docPrompt}`)}`}
                data-cursor="hand"
                onClick={() => setTimeout(() => setDocPrompt(null), 300)}
                className="bevel-out flex-1 bg-panel py-1.5 text-center font-mono text-[11px] font-bold text-starlight active:bevel-in"
              >
                ✉ email me for it
              </a>
              <button
                onClick={() => setDocPrompt(null)}
                data-cursor="hand"
                className="bevel-out bg-panel px-3 py-1.5 font-mono text-[11px] text-faint active:bevel-in"
              >
                close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
