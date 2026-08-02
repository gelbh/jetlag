const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  formFactor: "desktop",
  homeJoinPerf: 0.9,
  // MapLibre on /create is heavier than Leaflet; CI median ~0.70 after cutover.
  createPerf: 0.6,
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
