"use client";

/* Renders the current résumé PDF into the paper sheet, one canvas per page.

   pdf.js is imported lazily so its bulk never touches the desktop bundle.
   Canvases are sized to the container width and scaled by devicePixelRatio,
   because a résumé rendered at CSS pixels looks soft on retina displays.

   Any failure calls onFail() once and the parent falls back to the text
   résumé — a blank sheet would be worse than a slightly stale one. */

import { useEffect, useRef, useState } from "react";

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
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();

        loadingTask = pdfjs.getDocument({ url: src });
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
          canvas.setAttribute("role", "img");
          canvas.setAttribute(
            "aria-label",
            `Résumé page ${n} of ${doc.numPages}`,
          );

          host.appendChild(canvas);
          /* v6 takes the canvas itself; canvasContext is the legacy path and
             passing both is contradictory. */
          renderTask = page.render({ canvas, viewport });
          await renderTask.promise;
          if (cancelled) return;
        }

        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) onFail();
      }
    })();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      void loadingTask?.destroy();
    };
  }, [src, onFail]);

  return (
    <div>
      <div ref={hostRef} />
      {!ready && (
        <div aria-hidden className="space-y-3 py-4">
          {[92, 78, 85, 64, 88, 71].map((w) => (
            <div
              key={w}
              className="h-3 animate-pulse rounded-sm bg-[#241f1a]/10"
              style={{ width: `${w}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
