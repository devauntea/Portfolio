"use client";

/* Client half of /callback: shows the refresh token with a copy button and
   select-on-focus. Kept separate so the page itself stays a server
   component (the token exchange uses the client secret server-side). */

import { useState } from "react";

export function TokenPanel({ refresh }: { refresh: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <textarea
        readOnly
        value={refresh}
        onFocus={(e) => e.currentTarget.select()}
        className="bevel-in mt-3 h-24 w-full resize-none bg-panel/80 p-2 font-mono text-[11px] text-starlight"
      />
      <button
        onClick={() => {
          navigator.clipboard?.writeText(refresh).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            },
            () => {},
          );
        }}
        className="bevel-out mt-2 bg-panel px-3 py-1.5 font-mono text-[11px] font-bold text-starlight active:bevel-in"
      >
        {copied ? "✓ copied" : "⧉ copy token"}
      </button>
    </>
  );
}
