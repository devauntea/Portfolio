# DevauntaeOS portfolio

**Live: https://devauntaenorman.vercel.app** (Vercel project
`devauntaenorman`).

The portfolio is a retro computer. It boots, drops you on a dithered desktop,
and everything about Me is a folder or an app: windows you drag around
for the reading material, and full-screen *spaces* for the big experiences —
the Résumé folder, a walkable 3D gallery, and the Game Room. A little potted
plant in the corner leads somewhere green.

Built with Next.js (App Router) + TypeScript, Tailwind v4, Framer Motion,
React Three Fiber + drei. Sound is synthesized Web Audio (off by default).
No database — owner auth is a server-side password check, and the httpOnly
cookie carries a hash of the password rather than the password itself.

First visit runs a short intro: a ghost cursor points out the desktop, the
taskbar, and the right-click menu, then opens the Résumé folder. It plays once
per visitor; replay it from Display, or turn it off with the startup item.

**The résumé is swappable from the site itself.** Unlock `🔑 Admin` in the
Start menu and drop in a PDF. It goes to a private Vercel Blob and is served
through `/api/resume/file` — the only path to the document. The Résumé space
renders that PDF with pdf.js, falling back to the copy bundled in
`public/docs`, then to the text in `src/data/profile.ts`, so the sheet is
never blank.

Pure logic (owner auth, upload validation) is unit-tested with `npm test` —
Node's built-in runner, no framework and no dev dependency. Everything
involving layout, rAF, or animation is verified in a real browser.
