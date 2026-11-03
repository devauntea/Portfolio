import { test } from "node:test";
import assert from "node:assert/strict";

const previous = {
  motes: [1, 3], pinned: ["aspect-niche"], soundOn: true,
  wallpaper: "dots", tourSeen: true, autoResume: true,
};
const storage = new Map([["archive-ui-v1", JSON.stringify({ state: previous, version: 0 })]]);
Object.defineProperty(globalThis, "window", {
  value: {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  },
  configurable: true,
});
const { useUi } = await import("../src/lib/ui-store.ts");

test("new visitors start at the desktop", () => {
  assert.equal(useUi.getInitialState().autoResume, false);
});

test("existing visitors lose the automatic résumé takeover but keep their progress and preferences", () => {
  assert.equal(useUi.getState().autoResume, false);
  const migrated = JSON.parse(storage.get("archive-ui-v1")!);
  assert.equal(migrated.version, 1);
  assert.deepEqual(migrated.state, { ...previous, autoResume: false });
});
