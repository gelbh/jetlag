import { sharedCommitlintRules } from './commitlint.shared.mjs';

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    ...sharedCommitlintRules,
    'header-max-length': [2, 'always', 72],
  },
};
