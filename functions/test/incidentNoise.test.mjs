import assert from "node:assert/strict";
import test from "node:test";
import { isKnownNoiseError } from "../incident/incidentNoise.mjs";

test("isKnownNoiseError matches injected wallet, ResizeObserver, extension and stale-chunk errors", () => {
  const noise = [
    "undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')",
    "ResizeObserver loop completed with undelivered notifications.",
    "Failed to load chrome-extension://abc/inject.js",
    "Error in moz-extension://abc/content.js",
    "safari-web-extension://abc/script.js threw",
    "Importing a module script failed.",
  ];
  for (const message of noise) {
    assert.equal(isKnownNoiseError({ name: "TypeError", message }), true, message);
  }
});

test("isKnownNoiseError ignores errors from our own code", () => {
  assert.equal(
    isKnownNoiseError({
      name: "TypeError",
      message: "undefined is not an object (evaluating 'session.id')",
    }),
    false,
  );
});

test("isKnownNoiseError tolerates missing or junk input", () => {
  assert.equal(isKnownNoiseError(null), false);
  assert.equal(isKnownNoiseError({ name: "Error" }), false);
  assert.equal(isKnownNoiseError({ message: 42 }), false);
});
