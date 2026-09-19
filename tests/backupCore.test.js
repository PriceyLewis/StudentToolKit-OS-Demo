const test = require("node:test");
const assert = require("node:assert/strict");
const { applyRestoreTransaction, parseBackupPayload } = require("../src/utils/backupCore.js");

const allowedKeys = ["profileData", "habits"];

test("parseBackupPayload rejects malformed nested JSON values", () => {
  const raw = JSON.stringify({
    version: 1,
    exportedAt: "2026-09-19T12:00:00.000Z",
    app: "student-toolkit",
    data: {
      profileData: "{broken",
    },
  });

  assert.throws(
    () => parseBackupPayload(raw, { allowedKeys }),
    /Stored JSON is malformed/,
  );
});

test("parseBackupPayload ignores unknown keys and keeps recognised values", () => {
  const raw = JSON.stringify({
    version: 1,
    exportedAt: "2026-09-19T12:00:00.000Z",
    app: "student-toolkit",
    data: {
      profileData: JSON.stringify({ name: "Alex" }),
      injectedKey: JSON.stringify({ should: "not restore" }),
    },
  });

  const payload = parseBackupPayload(raw, { allowedKeys });
  assert.deepEqual(Object.keys(payload.data), ["profileData"]);
});

test("restore transaction rolls back previous data when a write fails", async () => {
  const state = new Map([
    ["profileData", JSON.stringify({ name: "Lewis" })],
    ["habits", JSON.stringify([{ id: "old" }])],
  ]);
  let shouldFail = true;

  const storage = {
    async multiGet(keys) {
      return keys.map((key) => [key, state.get(key) ?? null]);
    },
    async multiRemove(keys) {
      keys.forEach((key) => state.delete(key));
    },
    async multiSet(entries) {
      if (shouldFail) {
        shouldFail = false;
        throw new Error("simulated write failure");
      }
      entries.forEach(([key, value]) => state.set(key, value));
    },
  };

  await assert.rejects(
    () =>
      applyRestoreTransaction(storage, allowedKeys, {
        profileData: JSON.stringify({ name: "Demo" }),
        habits: null,
      }),
    /simulated write failure/,
  );

  assert.equal(state.get("profileData"), JSON.stringify({ name: "Lewis" }));
  assert.equal(state.get("habits"), JSON.stringify([{ id: "old" }]));
});
