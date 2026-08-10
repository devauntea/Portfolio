import { test } from "node:test";
import assert from "node:assert/strict";
import { validateResumePdf, MAX_RESUME_BYTES } from "../src/lib/resume-validate.ts";

const pdf = (extra = 0) =>
  new Uint8Array([...new TextEncoder().encode("%PDF-1.7\n"), ...new Uint8Array(extra)]);

test("accepts a well-formed PDF", () => {
  assert.deepEqual(validateResumePdf(pdf()), { ok: true });
});

test("rejects an empty file", () => {
  const res = validateResumePdf(new Uint8Array(0));
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /empty/i);
});

test("rejects a .docx, which is a ZIP wearing a different hat", () => {
  const docx = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
  const res = validateResumePdf(docx);
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /PDF/i);
});

test("rejects a file too short to hold a magic number", () => {
  assert.equal(validateResumePdf(new Uint8Array([0x25, 0x50])).ok, false);
});

test("rejects a file over the size cap", () => {
  const big = new Uint8Array(MAX_RESUME_BYTES + 1);
  big.set(new TextEncoder().encode("%PDF-"));
  const res = validateResumePdf(big);
  assert.equal(res.ok, false);
  assert.match(res.ok === false ? res.error : "", /8 MB/);
});

test("accepts a file exactly at the cap", () => {
  const edge = new Uint8Array(MAX_RESUME_BYTES);
  edge.set(new TextEncoder().encode("%PDF-"));
  assert.deepEqual(validateResumePdf(edge), { ok: true });
});
