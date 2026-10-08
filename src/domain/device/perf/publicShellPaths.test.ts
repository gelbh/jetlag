import { describe, expect, it } from "vitest";
import { isPublicShellPath } from "./publicShellPaths";

describe("isPublicShellPath", () => {
  it("matches landing and legal shells", () => {
    expect(isPublicShellPath("/")).toBe(true);
    expect(isPublicShellPath("/privacy")).toBe(true);
    expect(isPublicShellPath("/terms")).toBe(true);
  });

  it("matches the how-to-play pages", () => {
    expect(isPublicShellPath("/guide")).toBe(true);
    expect(isPublicShellPath("/tools/radar")).toBe(true);
    expect(isPublicShellPath("/faq/")).toBe(true);
    expect(isPublicShellPath("/tools/unknown")).toBe(false);
  });

  it("tolerates a trailing slash", () => {
    expect(isPublicShellPath("/privacy/")).toBe(true);
    expect(isPublicShellPath("/terms/")).toBe(true);
  });

  it("rejects in-app and nested paths", () => {
    expect(isPublicShellPath("/map")).toBe(false);
    expect(isPublicShellPath("/join")).toBe(false);
    expect(isPublicShellPath("/admin")).toBe(false);
    expect(isPublicShellPath("/privacy/extra")).toBe(false);
    expect(isPublicShellPath("")).toBe(false);
  });
});
