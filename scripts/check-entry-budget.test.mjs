import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateEntryBudget } from "./check-entry-budget.mjs";

const KB = 1024;
const limits = { jsKb: 100, cssKb: 50 };
const sizes = {
  "index.js": 40 * KB,
  "a.js": 10 * KB,
  "fb.js": 5 * KB,
  "i.css": 20 * KB,
};
const sizeOf = (f) => sizes[f] ?? 0;

const base = () => ({
  "index.html": {
    file: "index.js",
    src: "index.html",
    isEntry: true,
    imports: ["a.js"],
    css: ["i.css"],
    dynamicImports: ["fb.js"],
  },
  "a.js": { file: "a.js", name: "a" },
  "fb.js": {
    file: "fb.js",
    name: "vendor-firebase",
    src: "node_modules/firebase/app/index.js",
  },
});

test("passes under budget; dynamicImports not walked", () => {
  const r = evaluateEntryBudget({ manifest: base(), sizeOf, limits });
  assert.deepEqual(r.violations, []);
  assert.equal(r.jsKb, 50);
  assert.equal(r.cssKb, 20);
  assert.equal(r.rows[0].file, "index.js");
});

test("JS over budget fails", () => {
  const r = evaluateEntryBudget({
    manifest: base(),
    sizeOf,
    limits: { ...limits, jsKb: 45 },
  });
  assert.equal(r.violations.length, 1);
  assert.match(r.violations[0], /JS/);
});

test("CSS over budget fails", () => {
  const r = evaluateEntryBudget({
    manifest: base(),
    sizeOf,
    limits: { ...limits, cssKb: 10 },
  });
  assert.match(r.violations.join(), /CSS/);
});

test("forbidden chunk via static import fails (src and name)", () => {
  for (const patch of [
    { src: "node_modules/firebase/app/index.js" },
    { name: "vendor-firebase" },
    { name: "vendor-turf" },
  ]) {
    const m = base();
    m["index.html"].imports.push("fb.js");
    m["fb.js"] = { file: "fb.js", ...patch };
    const r = evaluateEntryBudget({ manifest: m, sizeOf, limits });
    assert.equal(r.violations.length, 1, JSON.stringify(patch));
    assert.match(r.violations[0], /forbidden/);
  }
});
