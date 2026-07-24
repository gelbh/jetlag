module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:4173/",
        "http://127.0.0.1:4173/join",
        "http://127.0.0.1:4173/create",
      ],
      startServerCommand:
        "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
      startServerReadyPattern: "Local:",
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertMatrix: [
        {
          matchingUrlPattern: "http://127\\.0\\.0\\.1:4173(/join)?/?$",
          assertions: {
            "categories:performance": ["error", { minScore: 0.9 }],
            "categories:accessibility": ["error", { minScore: 0.9 }],
            viewport: "error",
            "target-size": ["error", { minScore: 0.8 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
          },
        },
        {
          matchingUrlPattern: "http://127\\.0\\.0\\.1:4173/create/?$",
          assertions: {
            "categories:performance": ["error", { minScore: 0.8 }],
            "categories:accessibility": ["error", { minScore: 0.9 }],
            viewport: "error",
            "target-size": ["error", { minScore: 0.8 }],
            "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/desktop",
    },
  },
};
