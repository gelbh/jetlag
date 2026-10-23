import { describe, expect, it } from "vitest";
import { isPublicShellPath } from "./publicShellPaths";

describe("isPublicShellPath", () => {
  it("matches landing, legal, and Premium shells", () => {
    expect(isPublicShellPath("/")).toBe(true);
    expect(isPublicShellPath("/privacy")).toBe(true);
    expect(isPublicShellPath("/terms")).toBe(true);
    expect(isPublicShellPath("/premium")).toBe(true);
    expect(isPublicShellPath("/premium/")).toBe(true);
  });

  it("rejects the Account hub (needs Firebase for the sign-in gate)", () => {
    expect(isPublicShellPath("/account")).toBe(false);
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
