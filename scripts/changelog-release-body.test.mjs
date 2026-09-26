import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractChangelogReleaseBody } from "./changelog-release-body.mjs";

describe("extractChangelogReleaseBody", () => {
  it("extracts a dated version section without swallowing older releases", () => {
    const md = `# Changelog

## 0.14.0 - 2026-09-27

### Fixes

- fix one

### Improvements

- improve one

## 0.13.0 - 2026-08-16

### Fixes

- old fix
`;
    const body = extractChangelogReleaseBody(md, "0.14.0");
    assert.ok(body);
    assert.match(body, /fix one/);
    assert.match(body, /improve one/);
    assert.doesNotMatch(body, /old fix/);
    assert.doesNotMatch(body, /0\.13\.0/);
  });

  it("accepts undated ## X.Y.Z headers", () => {
    const md = `## 1.0.0

### Technical

- tech note

## 0.9.0

### Fixes

- older
`;
    const body = extractChangelogReleaseBody(md, "1.0.0");
    assert.equal(body, "### Technical\n\n- tech note");
  });

  it("returns null when the version is missing", () => {
    assert.equal(
      extractChangelogReleaseBody("## 0.1.0 - 2026-01-01\n\n- a\n", "9.9.9"),
      null,
    );
  });
});
