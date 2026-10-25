const ORIGIN = "http://127.0.0.1:4173";
const ORIGIN_PATTERN = "http://127\\.0\\.0\\.1:4173";
// LHCI matches on finalUrl, which follows client replaceState: tolerate a query string so a
// route that rewrites its URL keeps its gates (an unmatched URL is silently unasserted).
const END = "/?(\\?.*)?$";

/**
 * Every audited route gets the same a11y / CLS / target-size / byte-weight gates plus its own
 * perf floor (warn). Perf and optional create TBT use median of `numberOfRuns`, not LHCI's
 * default best-run aggregation.
 *
 * @param {{
 *   perf: { home: number, join: number, premium: number, create: number },
 *   byteWeight: { home: number, join: number, premium: number, create: number },
 *   numberOfRuns?: number,
 *   createMaxTbtMs?: number,
 *   outputDir: string,
 *   collectSettings: Record<string, unknown> & { skipAudits?: string[] },
 * }} options
 */
function createLhciConfig({
  perf,
  byteWeight,
  numberOfRuns = 3,
  createMaxTbtMs,
  outputDir,
  collectSettings,
}) {
  // Native-feel PWA locks browser page zoom (user-scalable=no). Skip meta-viewport
  // so the a11y category score is not dragged below the gate; map zoom is separate.
  const skipAudits = [...new Set([...(collectSettings.skipAudits ?? []), "meta-viewport"])];

  /** @param {number} minScore @param {number} maxBytes @param {Record<string, unknown>} [extra] */
  const routeAssertions = (minScore, maxBytes, extra = {}) => ({
    // Perf/TBT warn: shared-runner score noise; hard fail is byte weight.
    "categories:performance": ["warn", { minScore, aggregationMethod: "median" }],
    "categories:accessibility": ["error", { minScore: 0.95 }],
    viewport: "off",
    "target-size": ["error", { minScore: 0.8 }],
    "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
    "total-byte-weight": ["error", { maxNumericValue: maxBytes, aggregationMethod: "median" }],
    ...extra,
  });

  return {
    ci: {
      collect: {
        url: [`${ORIGIN}/`, `${ORIGIN}/premium`, `${ORIGIN}/join`, `${ORIGIN}/create`],
        // Served like prod (Worker + Assets routing); see scripts/lighthouse/preview-server.mjs.
        startServerCommand: "npm run preview:lhci",
        // Match plain console line from lighthouse/preview-server.mjs (Vite 8 ANSI breaks /Local:/i).
        startServerReadyPattern: "LHCI preview ready",
        numberOfRuns,
        settings: {
          ...collectSettings,
          skipAudits,
        },
      },
      assert: {
        assertMatrix: [
          {
            // SEO gate uses prerendered `/` (index,follow + WebSite JSON-LD).
            matchingUrlPattern: `${ORIGIN_PATTERN}${END}`,
            assertions: routeAssertions(perf.home, byteWeight.home, {
              "categories:seo": ["error", { minScore: 0.9 }],
            }),
          },
          {
            matchingUrlPattern: `${ORIGIN_PATTERN}/join${END}`,
            assertions: routeAssertions(perf.join, byteWeight.join),
          },
          {
            // SEO gate uses prerendered `/premium` (index,follow).
            matchingUrlPattern: `${ORIGIN_PATTERN}/premium${END}`,
            assertions: routeAssertions(perf.premium, byteWeight.premium, {
              "categories:seo": ["error", { minScore: 0.9 }],
            }),
          },
          {
            matchingUrlPattern: `${ORIGIN_PATTERN}/create${END}`,
            assertions: routeAssertions(
              perf.create,
              byteWeight.create,
              createMaxTbtMs === undefined
                ? {}
                : {
                    "total-blocking-time": [
                      "warn",
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
