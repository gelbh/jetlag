const { cpus } = require("node:os");
const { createLhciConfig } = require("./lighthouserc.shared.cjs");

// / and /premium (/join) floors split by runner CPU: simulated TBT scales with host CPU.
// Unlisted models get the slow floors. LHCI_CPU_MODEL overrides detection.
const FAST_CPU_MODELS = [
  "AMD EPYC 9V74 80-Core Processor",
  "AMD EPYC 9V45 96-Core Processor",
  "INTEL(R) XEON(R) PLATINUM 8573C",
  "Intel(R) Xeon(R) 6973P-C",
];
const model = process.env.LHCI_CPU_MODEL?.trim() || cpus()[0]?.model?.trim() || "";
const fast = FAST_CPU_MODELS.includes(model);
const runnerClass = fast ? "fast" : "slow";

// Byte caps: CI run 40217639375 medians ×1.15 (same mobile + desktop).
const byteWeight = {
  home: 1_111_869,
  premium: 1_159_081,
  join: 1_187_071,
  create: 1_845_794,
};

module.exports = createLhciConfig({
  perf: {
    home: fast ? 0.91 : 0.88,
    join: fast ? 0.92 : 0.87,
    premium: fast ? 0.92 : 0.87,
    create: 0.53,
  },
  byteWeight,
  numberOfRuns: 5,
  createMaxTbtMs: 800,
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
module.exports.model = model;
module.exports.runnerClass = runnerClass;
module.exports.FAST_CPU_MODELS = FAST_CPU_MODELS;
