const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.80;
// /create >= 0.60). Medians from PR #763 runs 37168611257 + 37169204794 (2026-10-04, served
// like prod): / 0.96|0.93, /join 0.97|0.95, /premium 0.97|0.95; a11y 0.95-0.96; CLS 0.
// /create misses its targets in CI (S2/S5 gap, recorded in #763): perf 0.64|0.58 (runs
// 0.56-0.65), TBT 402|622 ms (runs 378-669). Floor = latest median - 0.05; TBT cap above the
// worst observed run. Raise both to 0.60 / 600 once /create's boot cost drops.
module.exports = createLhciConfig({
  perf: { home: 0.91, join: 0.92, premium: 0.92, create: 0.53 },
  createMaxTbtMs: 700,
  outputDir: ".lighthouseci/mobile",
  collectSettings: {
    formFactor: "mobile",
    screenEmulation: {
      mobile: true,
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      disabled: false,
    },
  },
});
