import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePrefixedBullet, SECTION_ORDER } from "./section-map.mjs";

describe("parsePrefixedBullet", () => {
  it("maps fix: to Fixes and strips the prefix", () => {
    assert.deepEqual(parsePrefixedBullet("fix: foo", "patch"), {
      section: "Fixes",
      text: "foo",
    });
  });

  it("maps improve: and improvement: to Improvements", () => {
    assert.deepEqual(parsePrefixedBullet("improve: bar", "patch"), {
      section: "Improvements",
      text: "bar",
    });
    assert.deepEqual(parsePrefixedBullet("improvement: bar", "minor"), {
      section: "Improvements",
      text: "bar",
    });
  });

  it("maps tech: and technical: to Technical", () => {
    assert.deepEqual(parsePrefixedBullet("tech: baz", "minor"), {
      section: "Technical",
      text: "baz",
    });
    assert.deepEqual(parsePrefixedBullet("technical: baz", "major"), {
      section: "Technical",
      text: "baz",
    });
  });

  it("defaults unprefixed + patch to Technical", () => {
    assert.deepEqual(parsePrefixedBullet("plain note", "patch"), {
      section: "Technical",
      text: "plain note",
    });
  });

  it("defaults unprefixed + minor/major to Improvements", () => {
    assert.deepEqual(parsePrefixedBullet("plain note", "minor"), {
      section: "Improvements",
      text: "plain note",
    });
    assert.deepEqual(parsePrefixedBullet("plain note", "major"), {
      section: "Improvements",
      text: "plain note",
    });
  });

  it("is case-insensitive on prefixes", () => {
    assert.deepEqual(parsePrefixedBullet("Fix: Foo", "patch"), {
      section: "Fixes",
      text: "Foo",
    });
  });
});

describe("SECTION_ORDER", () => {
  it("lists Fixes, Improvements, Technical", () => {
    assert.deepEqual(SECTION_ORDER, ["Fixes", "Improvements", "Technical"]);
  });
});
