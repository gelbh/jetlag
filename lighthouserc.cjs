module.exports = {
  ci: {
    collect: {
      url: ["http://127.0.0.1:4173/", "http://127.0.0.1:4173/join"],
      startServerCommand:
        "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
      startServerReadyPattern: "Local:",
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
        formFactor: "mobile",
        screenEmulation: {
          mobile: true,
          width: 390,
          height: 844,
          deviceScaleFactor: 3,
          disabled: false,
        },
      },
    },
    assert: {
      assertions: {
        viewport: "error",
        "tap-targets": ["error", { minScore: 0.8 }],
        // Floors slightly loose vs typical home/join mobile baseline; tighten after first CI artifacts
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
