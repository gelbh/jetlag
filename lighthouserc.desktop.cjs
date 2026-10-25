const { createLhciConfig } = require("./lighthouserc.shared.cjs");

module.exports = createLhciConfig({
  perf: { home: 0.95, join: 0.95, premium: 0.95, create: 0.85 },
  byteWeight: {
    home: 1_111_869,
    premium: 1_159_081,
    join: 1_187_071,
    create: 1_845_794,
  },
  outputDir: ".lighthouseci/desktop",
  collectSettings: {
    preset: "desktop",
  },
});
