/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-standard",
    "@dreamsicle.io/stylelint-config-tailwindcss",
  ],
  ignoreFiles: ["**/node_modules/**", "**/dist/**", "coverage/**"],
  rules: {
    // Token / intentional Leaflet colors — allow hex and unrestricted values
    "color-no-hex": null,
    "declaration-property-value-allowed-list": null,
    // Flood noise vs existing hand-written CSS; prefer real-issue rules below
    "alpha-value-notation": null,
    "lightness-notation": null,
    "hue-degree-notation": null,
    "color-function-notation": null,
    "color-function-alias-notation": null,
    "selector-class-pattern": null, // BEM __ / -- used across map chrome
    "no-descending-specificity": null, // motion-gated selectors intentionally reorder
    "selector-not-notation": null,
    "media-feature-range-notation": null, // keep (max-width: …) readable
    "value-keyword-case": null, // preserve font family casing (SFMono-Regular, etc.)
    "property-no-vendor-prefix": null, // -webkit-* still required for iOS
    "rule-empty-line-before": null,
    "custom-property-empty-line-before": null,
    "declaration-empty-line-before": null,
    "comment-empty-line-before": null,
    "font-family-name-quotes": null,
  },
};
