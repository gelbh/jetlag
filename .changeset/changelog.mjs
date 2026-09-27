/**
 * Custom Changesets changelog: emit bullets (prefixes kept for normalize).
 * Section headings (Fixes / Improvements / Technical) are applied by
 * scripts/normalize-changelog-sections.mjs after `changeset version`.
 */
const changelogFunctions = {
  getReleaseLine: async (changeset) => {
    const lines = changeset.summary
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    return lines.map((line) => `- ${line}`).join("\n");
  },

  getDependencyReleaseLine: async () => "",
};

export default changelogFunctions;
