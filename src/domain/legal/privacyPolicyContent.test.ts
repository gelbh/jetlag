import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_SECTIONS } from "./privacyPolicyContent";

describe("privacyPolicyContent", () => {
  it("names OpenFreeMap street tiles and not CARTO", () => {
    const mapSection = PRIVACY_POLICY_SECTIONS.find(
      (section) => section.id === "third-parties",
    );
    const copy = mapSection?.paragraphs.join(" ") ?? "";

    expect(copy).toContain("OpenFreeMap");
    expect(copy).not.toMatch(/CARTO/i);
  });
});
