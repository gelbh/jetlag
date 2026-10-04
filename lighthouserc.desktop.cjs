const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// Floors = CI median - 0.05, never below the program targets (/, /join, /premium >= 0.95;
// /create >= 0.85). Medians from PR #763 run 37168611257 (2026-10-04, served like prod):
// / 1.00, /join 1.00, /premium 1.00, /create 0.89.
module.exports = createLhciConfig({
  perf: { home: 0.95, join: 0.95, premium: 0.95, create: 0.85 },
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
