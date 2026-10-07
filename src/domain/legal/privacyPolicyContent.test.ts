import { describe, expect, it } from "vitest";
import { PRIVACY_POLICY_SECTIONS } from "./privacyPolicyContent";

describe("privacyPolicyContent", () => {
  it("documents server-side Stripe purchase analytics carve-out", () => {
    const analyticsSection = PRIVACY_POLICY_SECTIONS.find(
      (section) => section.id === "errors-analytics",
    );
    const copy = analyticsSection?.paragraphs.join(" ") ?? "";

    expect(copy).toContain("After a successful Premium Stripe payment, our server");
  });

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

  it("discloses ungated scrubbed error reports to Sentry and PostHog EU", () => {
    const section = PRIVACY_POLICY_SECTIONS.find((entry) => entry.id === "errors-analytics");
    const paragraphs = section?.paragraphs ?? [];
    const errorReporting = paragraphs[0] ?? "";
    const productAnalytics = paragraphs[1] ?? "";
    const copy = paragraphs.join(" ");

    expect(errorReporting).toMatch(/scrubbed/i);
    expect(errorReporting).toMatch(/Sentry/i);
    expect(errorReporting).toMatch(/PostHog/i);
    expect(errorReporting).toMatch(/\bEU\b/);
    expect(copy).toContain("PostHog session replay is not used");
    expect(productAnalytics).toMatch(/Accept/i);
    expect(productAnalytics).toMatch(/product analytics/i);
  });
});
