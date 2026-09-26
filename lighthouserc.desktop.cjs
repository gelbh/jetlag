const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  // Mantine Wave 0–2 tip lands slightly under prior Leaflet-era headroom.
  homeJoinPerf: 0.88,
  // MapLibre on /create is heavier than Leaflet; CI median ~0.55 with Mantine chrome.
  createPerf: 0.54,
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
