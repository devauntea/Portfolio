/* What counts as an acceptable résumé upload. Pure and dependency-free so it
   can be unit-tested and reused by any caller.

   The browser-declared content type is NOT consulted: it is attacker-supplied
   and trivially spoofed. The magic number is the only claim worth believing. */

export const MAX_RESUME_BYTES = 4 * 1024 * 1024;

const PDF_MAGIC = "%PDF-";

export type ResumeValidation = { ok: true } | { ok: false; error: string };

export function validateResumePdf(bytes: Uint8Array): ResumeValidation {
  if (bytes.length === 0) {
    return { ok: false, error: "That file is empty." };
  }
  if (bytes.length > MAX_RESUME_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1);
    return { ok: false, error: `That file is ${mb} MB. The limit is 4 MB.` };
  }
  if (bytes.length < PDF_MAGIC.length) {
    return { ok: false, error: "That doesn't look like a PDF." };
  }
  const magic = new TextDecoder("latin1").decode(bytes.subarray(0, PDF_MAGIC.length));
  if (magic !== PDF_MAGIC) {
    return { ok: false, error: "That doesn't look like a PDF." };
  }
  return { ok: true };
}
