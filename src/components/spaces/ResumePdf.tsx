"use client";

/* Renders the current résumé PDF into the paper sheet, one canvas per page.

   pdf.js is imported lazily so its bulk never touches the desktop bundle.
   Canvases are sized to the container width and scaled by devicePixelRatio,
   because a résumé rendered at CSS pixels looks soft on retina displays.

   Any failure calls onFail() so the parent can offer the current PDF and
   a retry, without passing an outdated text résumé off as the current one. */

import { useEffect, useRef, useState } from "react";
import { DESK } from "@/data/profile";

interface Props {
  src: string;
  /** must be referentially stable — memoize it in the parent */
  onFail: () => void;
}

const MAX_DPR = 2;

export function ResumePdf({ src, onFail }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    let renderTask: import("pdfjs-dist").RenderTask | undefined;
    const request = new AbortController();
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const [pdfjs, response] = await Promise.all([
          import("pdfjs-dist"),
          fetch(src, { cache: "no-store", signal: request.signal }),
        ]);
        if (cancelled) return;
        if (!response.ok) throw new Error("Unable to load résumé PDF");
        const data = new Uint8Array(await response.arrayBuffer());
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({ data });
        const doc = await loadingTask.promise;
        if (cancelled) return;

        host.replaceChildren();
        const width = host.clientWidth || 640;
        const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

        for (let n = 1; n <= doc.numPages; n += 1) {
          const page = await doc.getPage(n);
          if (cancelled) return;

          const unscaled = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: (width / unscaled.width) * dpr,
          });

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.style.width = "100%";
          canvas.style.display = "block";
          canvas.style.marginBottom = n < doc.numPages ? "1rem" : "0";
          canvas.setAttribute("aria-hidden", "true");
          const sheet = document.createElement("div");
          sheet.setAttribute("role", "group");
          sheet.setAttribute("aria-label", DESK.resume.pageLabel(n, doc.numPages));
          sheet.appendChild(canvas);
          host.appendChild(sheet);
          /* v6 takes the canvas itself; canvasContext is the legacy path and
             passing both is contradictory. */
          renderTask = page.render({ canvas, viewport });
          await renderTask.promise;
          if (cancelled) return;
          // Readable text comes from this PDF, never a separate static résumé.
          const text = await page.getTextContent();
          if (cancelled) return;
          const accessibleText = document.createElement("p");
          accessibleText.className = "sr-only";
          accessibleText.textContent = text.items.map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          ).join("");
          sheet.appendChild(accessibleText);
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) onFail();
      }
    })();

    return () => {
      cancelled = true;
      request.abort();
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [src, onFail]);

  return (
    <div>
      <div ref={hostRef} />
      {!ready && (
        <div className="space-y-3 py-4" role="status">
          <span className="sr-only">{DESK.resume.loading}</span>
          {[92, 78, 85, 64, 88, 71].map((w) => (
            <div
              key={w}
              aria-hidden
              className="h-3 animate-pulse rounded-sm bg-current/10"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
