const ORIGIN = "http://127.0.0.1:4173";
const ORIGIN_PATTERN = "http://127\\.0\\.0\\.1:4173";

/**
 * Every audited route gets the same a11y / CLS / target-size gates plus its own perf floor.
 * Perf uses the median of `numberOfRuns` (program spec: "median of 3"), not LHCI's default
 * best-run aggregation. Floors only ratchet up; lowering one needs a written reason in the PR.
 *
 * @param {{
 *   perf: { home: number, join: number, premium: number, create: number },
 *   createMaxTbtMs?: number,
 *   outputDir: string,
 *   collectSettings: Record<string, unknown> & { skipAudits?: string[] },
 * }} options
 */
function createLhciConfig({ perf, createMaxTbtMs, outputDir, collectSettings }) {
  // Native-feel PWA locks browser page zoom (user-scalable=no). Skip meta-viewport
  // so the a11y category score is not dragged below the gate; map zoom is separate.
  const skipAudits = [...new Set([...(collectSettings.skipAudits ?? []), "meta-viewport"])];

  /** @param {number} minScore @param {Record<string, unknown>} [extra] */
  const routeAssertions = (minScore, extra = {}) => ({
    "categories:performance": ["error", { minScore, aggregationMethod: "median" }],
    "categories:accessibility": ["error", { minScore: 0.95 }],
    viewport: "off",
    "target-size": ["error", { minScore: 0.8 }],
    "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
    ...extra,
  });

  return {
    ci: {
      collect: {
        url: [`${ORIGIN}/`, `${ORIGIN}/premium`, `${ORIGIN}/join`, `${ORIGIN}/create`],
        // Served like prod (Worker + Assets routing); see scripts/lhci-preview-server.mjs.
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
            matchingUrlPattern: `${ORIGIN_PATTERN}/?$`,
            assertions: routeAssertions(perf.home),
          },
          {
            matchingUrlPattern: `${ORIGIN_PATTERN}/join/?$`,
            assertions: routeAssertions(perf.join),
          },
          {
            // SEO gate uses prerendered `/premium` (index,follow).
            matchingUrlPattern: `${ORIGIN_PATTERN}/premium/?$`,
            assertions: routeAssertions(perf.premium, {
              "categories:seo": ["error", { minScore: 0.9 }],
            }),
          },
          {
            matchingUrlPattern: `${ORIGIN_PATTERN}/create/?$`,
            assertions: routeAssertions(
              perf.create,
              createMaxTbtMs === undefined
                ? {}
                : {
                    "total-blocking-time": [
                      "error",
                      { maxNumericValue: createMaxTbtMs, aggregationMethod: "median" },
                    ],
                  },
            ),
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
