import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ensureDatedVersionHeaders,
  normalizeChangelogSections,
} from "./normalize-changelog-sections.mjs";

describe("ensureDatedVersionHeaders", () => {
  it("stamps undated headers and leaves dated ones alone", () => {
    const input = `## 0.14.0\n\n### Patch Changes\n\n- x\n\n## 0.13.0 - 2026-08-16\n\n- y\n`;
    const out = ensureDatedVersionHeaders(input, "2026-09-27");
    assert.match(out, /^## 0\.14\.0 - 2026-09-27$/m);
    assert.match(out, /^## 0\.13\.0 - 2026-08-16$/m);
  });
});

describe("normalizeChangelogSections", () => {
  it("regroups Patch/Minor into Fixes/Improvements/Technical and dates the header", () => {
    const input = `# Changelog

## 0.14.0

### Patch Changes

- fix: shade stays after confirm
- tech: tighten release check

### Minor Changes

- improve: full-bleed tool deck

## 0.13.0 - 2026-08-16

### Fixes

- old
`;
    const out = normalizeChangelogSections(input);
    assert.match(out, /^## 0\.14\.0 - \d{4}-\d{2}-\d{2}$/m);
    assert.match(out, /### Fixes\n\n- shade stays after confirm/);
    assert.match(out, /### Improvements\n\n- full-bleed tool deck/);
    assert.match(out, /### Technical\n\n- tighten release check/);
    assert.doesNotMatch(out, /### Patch Changes/);
    assert.doesNotMatch(out, /### Minor Changes/);
    assert.match(out, /## 0\.13\.0 - 2026-08-16/);
  });
});
