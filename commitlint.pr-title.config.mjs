/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-length': [2, 'always', 0],
    'footer-max-length': [2, 'always', 0],
    // PR titles are often longer than commit subjects (Dependabot, scoped summaries).
    'header-max-length': [2, 'always', 120],
    'subject-full-stop': [2, 'never', '.'],
  },
};
