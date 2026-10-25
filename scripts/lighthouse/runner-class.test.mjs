#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const path = require.resolve("../../lighthouserc.cjs");
const SLOW = [0.88, 0.87, 0.87, 0.53];
const FAST = [0.91, 0.92, 0.92, 0.53];
const WARN = ["warn", "warn", "warn", "warn"];

/** @param {string} model */
function load(model) {
  const prior = process.env.LHCI_CPU_MODEL;
  process.env.LHCI_CPU_MODEL = model;
  delete require.cache[path];
  try {
    const config = require(path);
    const floors = config.ci.assert.assertMatrix.map(
      (m) => m.assertions["categories:performance"][1].minScore,
    );
    const perfLevels = config.ci.assert.assertMatrix.map(
      (m) => m.assertions["categories:performance"][0],
    );
    return { runnerClass: config.runnerClass, floors, perfLevels };
  } finally {
    if (prior === undefined) delete process.env.LHCI_CPU_MODEL;
    else process.env.LHCI_CPU_MODEL = prior;
  }
}

test("unlisted model gets slow floors", () => {
  assert.deepEqual(load("AMD EPYC 7763 64-Core Processor"), {
    runnerClass: "slow",
    floors: SLOW,
    perfLevels: WARN,
  });
});

test("every listed fast model gets fast floors", () => {
  const { FAST_CPU_MODELS } = require(path);
  assert.ok(FAST_CPU_MODELS.length > 0);
  for (const model of FAST_CPU_MODELS) {
    assert.deepEqual(load(model), { runnerClass: "fast", floors: FAST, perfLevels: WARN });
  }
});

test("padded fast model still matches", () => {
  assert.deepEqual(load(" AMD EPYC 9V74 80-Core Processor  "), {
    runnerClass: "fast",
    floors: FAST,
    perfLevels: WARN,
  });
});
