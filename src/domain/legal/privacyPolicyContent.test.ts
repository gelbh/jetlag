import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_SECTIONS } from "./privacyPolicyContent";

describe("privacyPolicyContent", () => {
  it("names OpenFreeMap street tiles and not CARTO", () => {
    const mapSection = PRIVACY_POLICY_SECTIONS.find((section) => section.id === "third-parties");
    const copy = mapSection?.paragraphs.join(" ") ?? "";

    expect(copy).toContain("OpenFreeMap");
    expect(copy).not.toMatch(/CARTO/i);
  });

  it("discloses Sentry Session Replay and pseudonymous account id", () => {
    const section = PRIVACY_POLICY_SECTIONS.find((entry) => entry.id === "errors-analytics");
    const copy = section?.paragraphs.join(" ") ?? "";

    expect(copy).toMatch(/Session Replay/i);
    expect(copy).toMatch(/masked/i);
    expect(copy).toMatch(/pseudonymous account identifier/i);
    expect(copy).toContain("PostHog session replay is not used");
  });
});
