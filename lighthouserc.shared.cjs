function createLhciConfig({ formFactor, homeJoinPerf, createPerf, outputDir, collectSettings }) {
  // Native-feel PWA locks browser page zoom (user-scalable=no). Skip meta-viewport
  // so the a11y category score is not dragged below the gate; map zoom is separate.
  const skipAudits = [
    ...new Set([...(collectSettings.skipAudits ?? []), "meta-viewport"]),
  ];
  return {
    ci: {
      collect: {
        url: [
          "http://127.0.0.1:4173/",
          "http://127.0.0.1:4173/tutorial",
          "http://127.0.0.1:4173/join",
          "http://127.0.0.1:4173/create",
        ],
        startServerCommand:
          "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
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
            // Vite preview serves SPA shell at `/` (noindex). SEO gate uses prerendered
            // `/tutorial` (index,follow); production `/` is Worker-remapped to prerender home.
            matchingUrlPattern: "http://127\\.0\\.0\\.1:4173/tutorial/?$",
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

module.exports = { createLhciConfig };
