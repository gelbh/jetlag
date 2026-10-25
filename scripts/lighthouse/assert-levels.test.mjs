#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);

const BYTE_CAPS = {
  home: 1_111_869,
  premium: 1_159_081,
  join: 1_187_071,
  create: 1_845_794,
};

const ERROR_KEYS = ["categories:accessibility", "cumulative-layout-shift", "target-size"];

/** @param {string} pattern */
function routeKey(pattern) {
  if (pattern.includes("/create")) return "create";
  if (pattern.includes("/premium")) return "premium";
  if (pattern.includes("/join")) return "join";
  return "home";
}

/** @param {string} path @param {string | undefined} [cpuModel] */
function loadConfig(path, cpuModel) {
  const resolved = require.resolve(path);
  const prior = process.env.LHCI_CPU_MODEL;
  if (cpuModel === undefined) delete process.env.LHCI_CPU_MODEL;
  else process.env.LHCI_CPU_MODEL = cpuModel;
  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    if (prior === undefined) delete process.env.LHCI_CPU_MODEL;
    else process.env.LHCI_CPU_MODEL = prior;
  }
}

/** @param {ReturnType<typeof loadConfig>} config */
function assertHybridLevels(config) {
  const matrix = config.ci.assert.assertMatrix;
  assert.equal(matrix.length, 4);

  for (const entry of matrix) {
    const key = routeKey(entry.matchingUrlPattern);
    const { assertions } = entry;

    const perf = assertions["categories:performance"];
    assert.equal(perf[0], "warn");
    assert.equal(typeof perf[1].minScore, "number");
    assert.equal(perf[1].aggregationMethod, "median");

    for (const audit of ERROR_KEYS) {
      assert.equal(assertions[audit][0], "error");
    }

    if (key === "home" || key === "premium") {
      assert.equal(assertions["categories:seo"][0], "error");
    }

    const bytes = assertions["total-byte-weight"];
    assert.deepEqual(bytes, [
      "error",
      { maxNumericValue: BYTE_CAPS[key], aggregationMethod: "median" },
    ]);

    if (assertions["total-blocking-time"] !== undefined) {
      assert.equal(key, "create");
      assert.equal(assertions["total-blocking-time"][0], "warn");
    }
  }
}

test("mobile hybrid assert levels and byte budgets", () => {
  const config = loadConfig("../../lighthouserc.cjs", "AMD EPYC 7763 64-Core Processor");
  assertHybridLevels(config);
  const create = config.ci.assert.assertMatrix.find((m) =>
    m.matchingUrlPattern.includes("/create"),
  );
  assert.ok(create?.assertions["total-blocking-time"]);
  assert.equal(create.assertions["total-blocking-time"][0], "warn");
});

test("desktop hybrid assert levels and byte budgets", () => {
  const config = loadConfig("../../lighthouserc.desktop.cjs");
  assertHybridLevels(config);
  const create = config.ci.assert.assertMatrix.find((m) =>
    m.matchingUrlPattern.includes("/create"),
  );
  assert.equal(create?.assertions["total-blocking-time"], undefined);
});
