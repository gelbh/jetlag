const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  homeJoinPerf: 0.6,
  // MapLibre on /create; CI sample 2026-10-03 run 37151503219 n=3 min/median ~0.52/0.57.
  // Floor = min - slack (~0.07); authorize B (P4 Lighthouse4).
  createPerf: 0.45,
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
