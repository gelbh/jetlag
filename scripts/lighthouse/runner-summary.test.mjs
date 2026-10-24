#!/usr/bin/env node
import assert from "node:assert/strict";
import { test } from "node:test";
import { summarizeRunner } from "./runner-summary.mjs";

const lhr = (path, score, bi) => ({
  finalUrl: `http://127.0.0.1:4173${path}`,
  environment: { benchmarkIndex: bi },
  categories: { performance: { score } },
});

test("reports model, cores, median benchmarkIndex, and per-route medians", () => {
  const md = summarizeRunner({
    model: "AMD EPYC 7763 64-Core Processor",
    cores: 4,
    lhrs: [
      lhr("/", 0.9, 2400),
      lhr("/", 0.92, 2500),
      lhr("/", 0.95, 1200),
      lhr("/join", 0.94, 2450),
    ],
  });
  assert.match(md, /AMD EPYC 7763/);
  assert.match(md, /\| cores \| 4 \|/);
  assert.match(md, /\| median benchmarkIndex \| 2425 \|/);
  assert.match(md, /\| `\/` \| 0\.92 \|/);
  assert.match(md, /\| `\/join` \| 0\.94 \|/);
});

test("includes the resolved class when given", () => {
  assert.match(
    summarizeRunner({ model: "x", cores: 2, lhrs: [], runnerClass: "slow" }),
    /\| class \| slow \|/,
  );
});

test("empty LHR list still renders", () => {
  assert.match(
    summarizeRunner({ model: "x", cores: 2, lhrs: [] }),
    /\| median benchmarkIndex \| n\/a \|/,
  );
});
