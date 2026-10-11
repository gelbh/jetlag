import { describe, expect, it } from "vitest";
import { deserializeIncidentFromFirestore } from "./firestoreIncidents";

const base = {
  status: "open",
  diagnostics: { appVersion: "unknown", route: "posthog", lastClientErrors: [], recentOps: [] },
};

describe("deserializeIncidentFromFirestore posthogIssue", () => {
  it("keeps a PostHog issue with an https link", () => {
    const record = deserializeIncidentFromFirestore("posthog-iss-1", {
      ...base,
      posthogIssue: { id: "iss-1", name: "TypeError", url: "https://eu.posthog.com/project/1/x" },
    });
    expect(record?.posthogIssue).toEqual({
      id: "iss-1",
      name: "TypeError",
      url: "https://eu.posthog.com/project/1/x",
    });
  });

  it("drops non-https links and malformed issues", () => {
    expect(
      deserializeIncidentFromFirestore("a", {
        ...base,
        posthogIssue: { id: "iss-1", name: "TypeError", url: "javascript:alert(1)" },
      })?.posthogIssue,
    ).toEqual({ id: "iss-1", name: "TypeError", url: null });
    expect(
      deserializeIncidentFromFirestore("b", { ...base, posthogIssue: { name: 1 } })?.posthogIssue,
    ).toBeUndefined();
  });
});
