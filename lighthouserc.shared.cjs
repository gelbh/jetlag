function createLhciConfig({ homeJoinPerf, createPerf, outputDir, collectSettings }) {
  // Native-feel PWA locks browser page zoom (user-scalable=no). Skip meta-viewport
  // so the a11y category score is not dragged below the gate; map zoom is separate.
  const skipAudits = [...new Set([...(collectSettings.skipAudits ?? []), "meta-viewport"])];
  return {
    ci: {
      collect: {
        url: [
          "http://127.0.0.1:4173/",
          "http://127.0.0.1:4173/premium",
          "http://127.0.0.1:4173/join",
          "http://127.0.0.1:4173/create",
        ],
        // `/` is remapped to the prerendered home like prod; see scripts/lhci-preview-server.mjs.
        startServerCommand: "npm run preview:lhci",
        startServerReadyPattern: "Local:",
        numberOfRuns: 3,
        settings: {
          ...collectSettings,
          skipAudits,
        },
      },
      assert: {
        assertMatrix: [
          {
            matchingUrlPattern: "http://127\\.0\\.0\\.1:4173(/join)?/?$",
            assertions: {
              "categories:performance": ["error", { minScore: homeJoinPerf }],
              "categories:accessibility": ["error", { minScore: 0.9 }],
              viewport: "off",
              "target-size": ["error", { minScore: 0.8 }],
              "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
            },
          },
          {
            // SEO gate uses prerendered `/premium` (index,follow).
            matchingUrlPattern: "http://127\\.0\\.0\\.1:4173/premium/?$",
            assertions: {
              "categories:seo": ["error", { minScore: 0.9 }],
            },
          },
          {
            matchingUrlPattern: "http://127\\.0\\.0\\.1:4173/create/?$",
            assertions: {
              "categories:performance": ["error", { minScore: createPerf }],
              "categories:accessibility": ["error", { minScore: 0.9 }],
              viewport: "off",
              "target-size": ["error", { minScore: 0.8 }],
              "cumulative-layout-shift": ["error", { maxNumericValue: 0.15 }],
            },
          },
        ],
      },
      upload: {
        target: "filesystem",
        outputDir,
      },
    },
  };
}

// LHCI loadRcFile require()s only .cjs/.js; keep .cjs under "type":"module".
module.exports = { createLhciConfig };
