const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  homeJoinPerf: 0.9,
  // MapLibre + Mantine create shell; CI median ~0.57 after Wave 0-4 integrate.
  createPerf: 0.55,
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
