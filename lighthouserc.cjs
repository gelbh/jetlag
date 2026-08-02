const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  formFactor: "mobile",
  homeJoinPerf: 0.6,
  // MapLibre on /create is heavier than Leaflet; CI median ~0.32 after cutover.
  createPerf: 0.28,
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
