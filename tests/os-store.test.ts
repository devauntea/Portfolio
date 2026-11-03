import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { useOs } from "../src/lib/os-store.ts";

beforeEach(() => {
  useOs.setState({ windows: [], zTop: 10, space: null, booted: false, startupRan: false });
});

test("opening an app leaves the résumé space and shows the requested window", () => {
  useOs.getState().enterSpace("resume");
  useOs.getState().openWindow("projects");
  assert.equal(useOs.getState().space, null);
  assert.deepEqual(useOs.getState().windows.map((window) => window.id), ["projects"]);
});

test("reopening an existing app leaves fullscreen without duplicating its window", () => {
  useOs.getState().openWindow("about");
  useOs.getState().openWindow("projects");
  useOs.getState().enterSpace("gallery");
  useOs.getState().openWindow("about");
  const { space, windows, zTop } = useOs.getState();
  assert.equal(space, null);
  assert.equal(windows.length, 2);
  assert.equal(windows.find((window) => window.id === "about")?.z, zTop);
});

test("leaving a space preserves desktop windows", () => {
  useOs.getState().openWindow("projects");
  const windows = useOs.getState().windows;
  useOs.getState().enterSpace("games");
  useOs.getState().exitSpace();
  assert.equal(useOs.getState().space, null);
  assert.deepEqual(useOs.getState().windows, windows);
});

test("manual navigation prevents a delayed startup item from taking over", () => {
  useOs.getState().openWindow("projects");
  assert.equal(useOs.getState().claimStartup(), false);
  useOs.setState({ startupRan: false });
  useOs.getState().enterSpace("gallery");
  assert.equal(useOs.getState().claimStartup(), false);
});

test("startup can run only once per visit", () => {
  assert.equal(useOs.getState().claimStartup(), true);
  assert.equal(useOs.getState().claimStartup(), false);
});
