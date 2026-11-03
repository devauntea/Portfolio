import { test } from "node:test";
import assert from "node:assert/strict";
import { blobConfigured } from "../src/lib/resume-store.ts";

test("a connected store works with request-scoped OIDC and no env token", () => {
  assert.equal(blobConfigured({ BLOB_STORE_ID: "store_connected" }), true);
});

test("static-token Blob connections remain supported", () => {
  assert.equal(blobConfigured({ BLOB_READ_WRITE_TOKEN: "test-token" }), true);
});

test("an OIDC token alone does not identify a connected store", () => {
  assert.equal(blobConfigured({ VERCEL_OIDC_TOKEN: "test-token" }), false);
  assert.equal(blobConfigured({}), false);
  assert.equal(blobConfigured({ BLOB_STORE_ID: "  ", BLOB_READ_WRITE_TOKEN: "" }), false);
});
