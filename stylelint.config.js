/** @type {import('stylelint').Config} */
export default {
  extends: [
    "stylelint-config-recommended",
    "@dreamsicle.io/stylelint-config-tailwindcss",
  ],
  ignoreFiles: ["**/node_modules/**", "**/dist/**", "coverage/**"],
  rules: {
    // Motion-gated selectors intentionally reorder vs base chrome rules
    "no-descending-specificity": null,
  },
};
