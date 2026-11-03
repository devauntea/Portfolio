"use client";

import { useCallback, useEffect, useState } from "react";
import { DESK } from "@/data/profile";
import { ResumePdf } from "@/components/spaces/ResumePdf";

/** Both portfolio experiences show the same version as View PDF / Download. */
export function CurrentResume() {
  const [revision, setRevision] = useState<string | null>(null);

  useEffect(() => {
    let request: AbortController | undefined;
    async function refresh() {
      request?.abort();
      const current = new AbortController();
      request = current;
      try {
        const response = await fetch("/api/resume", {
          cache: "no-store",
          signal: current.signal,
        });
        if (!response.ok) throw new Error("Résumé metadata unavailable");
        const meta = await response.json();
        if (!current.signal.aborted) {
          setRevision(`${meta.source}:${meta.updatedAt ?? "bundled"}`);
        }
      } catch {
        // The file endpoint can still work if the metadata request fails.
        if (!current.signal.aborted) setRevision((previous) => previous ?? "current");
      }
    }
    function onVisible() {
      if (document.visibilityState === "visible") void refresh();
    }
    void refresh();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      request?.abort();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (revision === null) return <p role="status">{DESK.resume.loading}</p>;
  return <ResumeVersion key={revision} revision={revision} />;
}

function ResumeVersion({ revision }: { revision: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onFail = useCallback(() => setFailed(true), []);
  const src = `/api/resume/file?v=${encodeURIComponent(revision)}`;

  if (failed) {
    return (
      <div className="current-resume-error" role="status">
        <p>{DESK.resume.previewFailed}</p>
        <button onClick={() => { setFailed(false); setAttempt((n) => n + 1); }}>
          {DESK.resume.retry}
        </button>
        <a href={src} target="_blank" rel="noreferrer">{DESK.resume.view}</a>
      </div>
    );
  }
  return <ResumePdf key={attempt} src={src} onFail={onFail} />;
}
