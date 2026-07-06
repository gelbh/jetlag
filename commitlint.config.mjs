/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-length': [2, 'always', 0],
    'footer-max-length': [2, 'always', 0],
    'header-max-length': [2, 'always', 72],
    'subject-full-stop': [2, 'never', '.'],
  },
};
