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

test("forbidden chunk statically reachable from the App chunk fails", () => {
  const withApp = () => {
    const m = base();
    m["index.html"].dynamicImports.push("src/App.tsx");
    m["src/App.tsx"] = {
      file: "app.js",
      name: "App",
      src: "src/App.tsx",
      isDynamicEntry: true,
      imports: ["a.js", "mid.js"],
      dynamicImports: ["lazy.js"],
    };
    m["mid.js"] = { file: "mid.js", name: "analyticsConsent" };
    m["lazy.js"] = { file: "lazy.js", name: "sentry", imports: ["fb.js"] };
    return m;
  };

  const clean = evaluateEntryBudget({ manifest: withApp(), sizeOf, limits });
  assert.deepEqual(clean.violations, [], "dynamic imports are not walked");
  assert.equal(clean.appChecked, true);
  assert.equal(clean.jsKb, 50, "App walk does not count toward entry size");

  for (const patch of [
    { name: "vendor-firebase" },
    { name: "vendor-turf" },
    { name: "sentry" },
    { name: "analytics" },
    { src: "node_modules/@sentry/core/index.js" },
    { src: "node_modules/posthog-js/dist/module.js" },
  ]) {
    const m = withApp();
    m["mid.js"] = { file: "mid.js", imports: ["bad.js"] };
    m["bad.js"] = { file: "bad.js", ...patch };
    const r = evaluateEntryBudget({ manifest: m, sizeOf, limits });
    assert.equal(r.violations.length, 1, JSON.stringify(patch));
    assert.match(r.violations[0], /App static path \(app\.js\)/);
  }
});

test("App walk is skipped when the manifest has no App chunk", () => {
  const r = evaluateEntryBudget({ manifest: base(), sizeOf, limits });
  assert.equal(r.appChecked, false);
});
