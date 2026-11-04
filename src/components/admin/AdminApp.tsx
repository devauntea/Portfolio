"use client";

/* The owner's control panel: swap the résumé without touching the repo.

   The window is only reachable behind the password gate, but the server
   re-checks the cookie on every call, this UI is a convenience, not the
   security boundary. Storage errors are shown verbatim because the ones that
   happen here are configuration problems worth reading. */

import { useCallback, useEffect, useRef, useState } from "react";
import { chime, thunk } from "@/lib/sound";

interface Meta {
  source: "blob" | "bundled";
  updatedAt: string | null;
  filename: string;
}

export function AdminApp() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Load once on mount. Upload and revert set the card from their own
     responses, so this is the only read. The .then chain (rather than an
     awaited call) keeps setState out of the effect body, see the React 19
     purity notes in memory/portfolio_lessons.md. */
  useEffect(() => {
    let live = true;
    fetch("/api/resume", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Meta) => {
        if (live) setMeta(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const upload = useCallback(async (file: File) => {
    setBusy(true);
    setMsg(null);
    const body = new FormData();
    body.append("file", file);
    try {
      const r = await fetch("/api/admin/resume", { method: "POST", body });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setMeta({ source: d.source, updatedAt: d.updatedAt, filename: d.filename });
        setMsg({ tone: "ok", text: "✓ Résumé replaced. Reopen the Résumé folder to see it." });
        chime();
      } else {
        setMsg({ tone: "bad", text: d.error ?? "Upload failed." });
        thunk();
      }
    } catch {
      setMsg({ tone: "bad", text: "Network error. The upload didn't land." });
      thunk();
    }
    setBusy(false);
  }, []);

  async function revert() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/resume", { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) {
        setMeta({ source: d.source, updatedAt: d.updatedAt, filename: d.filename });
        setMsg({ tone: "ok", text: "↩ Reverted to the résumé bundled with the deploy." });
      } else {
        setMsg({ tone: "bad", text: d.error ?? "Revert failed." });
      }
    } catch {
      setMsg({ tone: "bad", text: "Network error." });
    }
    setBusy(false);
  }

  const when = meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString() : null;

  return (
    <div className="space-y-3 font-mono text-[11px] text-starlight">
      <section className="bevel-in bg-cosmos/60 p-2.5">
        <p className="text-[10px] uppercase tracking-widest text-faint">current résumé</p>
        <p className="mt-1 text-sm text-starlight">{meta?.filename ?? "…"}</p>
        <p className="mt-0.5 text-[10px] text-faint">
          {meta === null
            ? "checking…"
            : meta.source === "blob"
              ? `uploaded ${when}`
              : "bundled with the deploy (nothing uploaded yet)"}
        </p>
        <a
          href="/api/resume/file"
          target="_blank"
          rel="noreferrer"
          data-cursor="hand"
          className="mt-1.5 inline-block text-[10px] text-lumen underline"
        >
          view it ↗
        </a>
      </section>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        data-cursor="hand"
        className={`bevel-in cursor-pointer p-5 text-center transition-colors ${
          dragging ? "bg-lumen/10" : "bg-cosmos/40"
        }`}
      >
        <p className="text-2xl" aria-hidden>
          📄
        </p>
        <p className="mt-1.5 text-[11px] text-starlight">
          {dragging ? "drop it" : "drop a PDF here, or click to choose"}
        </p>
        <p className="mt-0.5 text-[10px] text-faint">PDF only · 4 MB max</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          aria-label="Choose a résumé PDF"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      {busy && <p className="text-center text-[10px] text-gilt">working…</p>}

      {msg && (
        <p
          role="status"
          className="bevel-in bg-cosmos/60 p-2 text-[10px] leading-relaxed"
          style={{ color: msg.tone === "ok" ? "var(--sprout)" : "var(--rose)" }}
        >
          {msg.text}
        </p>
      )}

      <button
        onClick={revert}
        disabled={busy || meta?.source !== "blob"}
        data-cursor="hand"
        className="bevel-out w-full bg-panel py-1.5 text-[11px] text-faint active:bevel-in disabled:opacity-40"
      >
        ↩ revert to the bundled résumé
      </button>
    </div>
  );
}
