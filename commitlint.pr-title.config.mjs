import { sharedCommitlintRules } from './commitlint.shared.mjs';

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    ...sharedCommitlintRules,
    // PR titles are often longer than commit subjects (Dependabot, scoped summaries).
    'header-max-length': [2, 'always', 120],
  },
};
