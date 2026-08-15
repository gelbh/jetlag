import test from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_UPDATE_REQUIRED,
  assertClientMeetsGlobalMin,
  clearClientMinVersionCache,
  meetsClientMinVersion,
  resolveClientMinVersion,
} from "../session/clientMinVersion.mjs";

test("meetsClientMinVersion rejects 0.10.8 against 0.11.0", () => {
  assert.equal(meetsClientMinVersion("0.10.8", "0.11.0"), false);
  assert.equal(meetsClientMinVersion("0.11.0", "0.11.0"), true);
});

test("assertClientMeetsGlobalMin throws when below floor", () => {
  assert.throws(
    () => assertClientMeetsGlobalMin("0.10.8", "0.11.0"),
    (error) => error instanceof Error && error.message === CLIENT_UPDATE_REQUIRED,
  );
});

test("assertClientMeetsGlobalMin allows equal and newer", () => {
  assert.doesNotThrow(() => assertClientMeetsGlobalMin("0.11.0", "0.11.0"));
  assert.doesNotThrow(() => assertClientMeetsGlobalMin("0.12.0", "0.11.0"));
});

test("assertClientMeetsGlobalMin is fail-open when min empty", () => {
  assert.doesNotThrow(() => assertClientMeetsGlobalMin("0.10.8", null));
  assert.doesNotThrow(() => assertClientMeetsGlobalMin("0.10.8", ""));
});

test("assertClientMeetsGlobalMin rejects empty client when min configured", () => {
  assert.throws(
    () => assertClientMeetsGlobalMin("", "0.11.0"),
    (error) => error instanceof Error && error.message === CLIENT_UPDATE_REQUIRED,
  );
});

function buildOpsDb(minVersion) {
  return {
    collection: (name) => {
      assert.equal(name, "ops");
      return {
        doc: (id) => {
          assert.equal(id, "clientMinVersion");
          return {
            get: async () => {
              if (minVersion === undefined) {
                return { exists: false, data: () => undefined };
              }
              return {
                exists: true,
                data: () => ({ minVersion }),
              };
            },
          };
        },
      };
    },
  };
}

test("resolveClientMinVersion prefers Firestore doc over env fallback", async () => {
  clearClientMinVersionCache();
  const resolved = await resolveClientMinVersion(buildOpsDb("0.11.0"), {
    envFallback: "0.10.0",
  });
  assert.equal(resolved, "0.11.0");
});

test("resolveClientMinVersion uses env when doc missing", async () => {
  clearClientMinVersionCache();
  const resolved = await resolveClientMinVersion(buildOpsDb(undefined), {
    envFallback: "0.11.0",
  });
  assert.equal(resolved, "0.11.0");
});

test("resolveClientMinVersion returns null when both missing (gate off)", async () => {
  clearClientMinVersionCache();
  const resolved = await resolveClientMinVersion(buildOpsDb(undefined), {
    envFallback: "",
  });
  assert.equal(resolved, null);
});

test("resolveClientMinVersion reads process.env when options omit envFallback", async () => {
  clearClientMinVersionCache();
  const previous = process.env.CLIENT_MIN_VERSION;
  process.env.CLIENT_MIN_VERSION = "0.11.0";
  try {
    const resolved = await resolveClientMinVersion(buildOpsDb(undefined));
    assert.equal(resolved, "0.11.0");
  } finally {
    if (previous === undefined) {
      delete process.env.CLIENT_MIN_VERSION;
    } else {
      process.env.CLIENT_MIN_VERSION = previous;
    }
  }
});
