const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  homeJoinPerf: 0.9,
  // MapLibre + Mantine create shell; CI sample 2026-10-03 run 37151503219 n=3 min/median ~0.88/0.88.
  // Floor = min - slack (~0.13); authorize B (P4 Lighthouse4).
  createPerf: 0.75,
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
