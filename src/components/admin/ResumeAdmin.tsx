"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ADMIN, DESK } from "@/data/profile";
import { MAX_RESUME_BYTES, validateResumePdf } from "@/lib/resume-validate";
import type { ResumeMeta } from "@/lib/resume-store";
import { ResumePdf } from "@/components/spaces/ResumePdf";

export function ResumeAdmin({ initialOwner }: { initialOwner: boolean }) {
  const [owner, setOwner] = useState(initialOwner);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const password = new FormData(form).get("password");
      const response = await fetch("/api/agent-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 401 ? ADMIN.denied : ADMIN.unavailable,
        );
      form.reset();
      setOwner(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : ADMIN.unavailable);
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/agent-link", { method: "DELETE" });
      if (!response.ok) throw new Error();
      setOwner(false);
    } catch {
      setError(ADMIN.unavailable);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="studio-admin">
      <header className="admin-topbar">
        <Link href="/" className="admin-brand">
          <span>{DESK.initials}</span>
          {ADMIN.title}
        </Link>
        <nav>
          <Link href="/">↙ {ADMIN.back}</Link>
          {owner && (
            <button disabled={busy} onClick={signOut}>
              {ADMIN.logout}
            </button>
          )}
        </nav>
      </header>
      <div className="admin-intro">
        <p className="desk-eyebrow">{ADMIN.eyebrow}</p>
        <h1>{owner ? ADMIN.replace : ADMIN.loginTitle}</h1>
        <p>{owner ? ADMIN.intro : ADMIN.loginDetail}</p>
      </div>
      {error && (
        <p className="admin-notice is-error" role="alert">
          {error}
        </p>
      )}
      {owner ? (
        <ResumeManager
          onExpired={() => {
            setOwner(false);
            setError(ADMIN.expired);
          }}
        />
      ) : (
        <form className="admin-login" onSubmit={signIn}>
          <label htmlFor="owner-password">{ADMIN.password}</label>
          <input
            id="owner-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={busy}
          />
          <button className="admin-primary" disabled={busy}>
            {busy ? ADMIN.signingIn : ADMIN.login} ↗
          </button>
        </form>
      )}
    </main>
  );
}

function ResumeManager({ onExpired }: { onExpired: () => void }) {
  const [meta, setMeta] = useState<ResumeMeta | null>(null);
  const [selected, setSelected] = useState<{ file: File; url: string } | null>(
    null,
  );
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [checking, setChecking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const choosing = useRef(0),
    uploading = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/resume", { cache: "no-store", signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setMeta)
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage({ text: ADMIN.metadataError, error: true });
      });
    return () => controller.abort();
  }, []);
  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.url);
    },
    [selected],
  );
  useEffect(
    () => () => {
      choosing.current++;
    },
    [],
  );
  async function choose(file: File) {
    if (uploading.current) return;
    const request = ++choosing.current;
    setChecking(true);
    setMessage(null);
    try {
      if (file.size > MAX_RESUME_BYTES) throw new Error(ADMIN.limit);
      const check = validateResumePdf(new Uint8Array(await file.arrayBuffer()));
      if (!check.ok) throw new Error(check.error);
      if (request === choosing.current)
        setSelected({ file, url: URL.createObjectURL(file) });
    } catch (err) {
      if (request === choosing.current) {
        setSelected(null);
        setMessage({
          text: err instanceof Error ? err.message : ADMIN.failure,
          error: true,
        });
      }
    } finally {
      if (request === choosing.current) setChecking(false);
    }
  }
  async function publish() {
    if (!selected || uploading.current || checking) return;
    uploading.current = true;
    setBusy(true);
    setMessage(null);
    const body = new FormData();
    body.append("file", selected.file);
    try {
      const response = await fetch("/api/admin/resume", {
        method: "POST",
        body,
      });
      if (response.status === 401) {
        onExpired();
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok)
        throw new Error(data?.error || ADMIN.failure);
      setMeta(data);
      setSelected(null);
      setMessage({ text: ADMIN.success, error: false });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : ADMIN.failure,
        error: true,
      });
    } finally {
      uploading.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="admin-workspace" aria-busy={busy}>
      <div className="admin-controls">
        <section className="admin-current">
          <p className="desk-eyebrow">{ADMIN.current}</p>
          <h2>{meta?.filename ?? ADMIN.checking}</h2>
          <p>
            {meta?.source === "blob"
              ? ADMIN.uploaded
              : meta
                ? ADMIN.original
                : ""}
          </p>
          {meta?.updatedAt && (
            <small>
              {ADMIN.updated} · {new Date(meta.updatedAt).toLocaleString()}
            </small>
          )}
          <a
            href={`/api/resume/file?v=${encodeURIComponent(meta?.updatedAt ?? "current")}`}
            target="_blank"
            rel="noreferrer"
          >
            {ADMIN.view} ↗
          </a>
        </section>
        <p className="admin-instruction">{ADMIN.instruction}</p>
        <div
          className={`admin-drop ${dragging ? "is-dragging" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && !busy) void choose(file);
          }}
        >
          <span aria-hidden="true">↥</span>
          <strong>{dragging ? ADMIN.drop : ADMIN.choose}</strong>
          <small>{ADMIN.limit}</small>
          <input
            ref={input}
            aria-label={ADMIN.choose}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy || checking}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void choose(file);
              e.target.value = "";
            }}
          />
        </div>
        {selected && (
          <div className="admin-selected">
            <p className="desk-eyebrow">{ADMIN.selected}</p>
            <strong>{selected.file.name}</strong>
            <small>{(selected.file.size / 1024).toFixed(0)} KB</small>
          </div>
        )}
        <button
          className="admin-primary"
          disabled={!selected || busy || checking}
          onClick={publish}
        >
          {busy ? ADMIN.publishing : ADMIN.publish} ↗
        </button>
        {message && (
          <p
            role={message.error ? "alert" : "status"}
            className={`admin-notice ${message.error ? "is-error" : ""}`}
          >
            {message.text}
          </p>
        )}
        <p className="admin-footnote">{ADMIN.note}</p>
      </div>
      <section className="admin-preview" aria-label={ADMIN.preview}>
        {selected ? (
          <>
            <header>
              <span>{selected.file.name}</span>
              <a href={selected.url} target="_blank" rel="noreferrer">
                {ADMIN.previewLink} ↗
              </a>
            </header>
            <SelectedPdf key={selected.url} src={selected.url} />
            <small>{ADMIN.previewFallback}</small>
          </>
        ) : (
          <div className="admin-preview-empty">
            <span aria-hidden="true">▤</span>
            <h2>{ADMIN.previewEmpty}</h2>
            <p>{ADMIN.previewHint}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function SelectedPdf({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);
  return (
    <div className="admin-pdf-pages">
      {failed ? (
        <p role="status">{ADMIN.previewFallback}</p>
      ) : (
        <ResumePdf src={src} onFail={onFail} />
      )}
    </div>
  );
}
