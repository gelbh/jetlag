const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.80;
// /create >= 0.60). Medians from PR #763 run 37168611257 (2026-10-04, served like prod):
// / 0.96, /join 0.97, /premium 0.97, /create 0.64 (TBT 402 ms); a11y 0.95-0.96; CLS 0.
// /create is clamped to its 0.60 target (0.04 headroom; one run was 0.59).
module.exports = createLhciConfig({
  perf: { home: 0.91, join: 0.92, premium: 0.92, create: 0.6 },
  createMaxTbtMs: 600,
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
