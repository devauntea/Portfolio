import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  ownerConfigured,
  ownerToken,
  passwordMatches,
  isOwner,
} from "../src/lib/owner-auth.ts";

beforeEach(() => {
  process.env.OWNER_PASSWORD = "correct-horse";
});

test("a token is a stable 64-char sha256 hex digest", () => {
  assert.match(ownerToken(), /^[a-f0-9]{64}$/);
  assert.equal(ownerToken(), ownerToken());
});

test("the token is not the password itself", () => {
  assert.notEqual(ownerToken(), "correct-horse");
  assert.ok(!ownerToken().includes("correct-horse"));
});

test("changing the password changes the token", () => {
  const before = ownerToken();
  process.env.OWNER_PASSWORD = "battery-staple";
  assert.notEqual(ownerToken(), before);
});

test("a cookie holding the current token is the owner", () => {
  assert.equal(isOwner(ownerToken()), true);
});

test("wrong, empty, and missing cookies are rejected", () => {
  assert.equal(isOwner("nope"), false);
  assert.equal(isOwner(""), false);
  assert.equal(isOwner(undefined), false);
});

test("the raw password is not accepted as a cookie", () => {
  assert.equal(isOwner("correct-horse"), false);
});

test("an unconfigured owner rejects everything, including the empty token", () => {
  const token = ownerToken();
  process.env.OWNER_PASSWORD = "";
  assert.equal(ownerConfigured(), false);
  assert.equal(isOwner(token), false);
  assert.equal(isOwner(ownerToken()), false);
  assert.equal(passwordMatches(""), false);
});

test("passwordMatches compares against the configured password", () => {
  assert.equal(passwordMatches("correct-horse"), true);
  assert.equal(passwordMatches("wrong"), false);
  assert.equal(passwordMatches(undefined), false);
  assert.equal(passwordMatches(123), false);
});
