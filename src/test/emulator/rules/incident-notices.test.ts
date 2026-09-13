import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv } from "./helpers";

function noticePayload(overrides: Record<string, unknown> = {}) {
  return {
    incidentId: "inc-1",
    status: "resolved",
    resolvedAt: "2026-01-01T00:00:00.000Z",
    bannerDismissedAt: null,
    ...overrides,
  };
}

function devicePayload(overrides: Record<string, unknown> = {}) {
  return {
    token: "fcm-token-1",
    platform: "ios",
    updatedAt: "2026-01-01T00:00:00.000Z",
    preferences: { enabled: true },
    ...overrides,
  };
}

describe("firestore.rules — incident notices & user devices", () => {
  const rules = bindRulesTestEnv();

  async function seedNotice(
    uid = "owner-1",
    incidentId = "inc-1",
    overrides: Record<string, unknown> = {},
  ) {
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx
        .firestore()
        .collection("users")
        .doc(uid)
        .collection("incidentNotices")
        .doc(incidentId)
        .set(noticePayload({ incidentId, ...overrides }));
    });
  }

  it("allows owner to list undismissed incident notices", async () => {
    await seedNotice("owner-1", "inc-1");
    await seedNotice("owner-1", "inc-2", {
      incidentId: "inc-2",
      bannerDismissedAt: "2026-01-02T00:00:00.000Z",
    });

    const owner = rules.testEnv.authenticatedContext("owner-1");
    await assertSucceeds(
      owner
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("incidentNotices")
        .where("bannerDismissedAt", "==", null)
        .get(),
    );
  });

  it("rejects other user reading incident notices", async () => {
    await seedNotice("owner-1", "inc-1");

    const other = rules.testEnv.authenticatedContext("other-1");
    await assertFails(
      other
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("incidentNotices")
        .doc("inc-1")
        .get(),
    );
    await assertFails(
      other
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("incidentNotices")
        .get(),
    );
  });

  it("allows owner to set only bannerDismissedAt on notice", async () => {
    await seedNotice("owner-1", "inc-1");

    const owner = rules.testEnv.authenticatedContext("owner-1");
    await assertSucceeds(
      owner
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("incidentNotices")
        .doc("inc-1")
        .update({ bannerDismissedAt: "2026-01-02T00:00:00.000Z" }),
    );
  });

  it("rejects owner changing resolvedAt on notice", async () => {
    await seedNotice("owner-1", "inc-1");

    const owner = rules.testEnv.authenticatedContext("owner-1");
    await assertFails(
      owner
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("incidentNotices")
        .doc("inc-1")
        .update({ resolvedAt: "2026-01-99T00:00:00.000Z" }),
    );
  });

  it("allows owner to upsert own device token", async () => {
    const owner = rules.testEnv.authenticatedContext("owner-1");
    const payload = devicePayload();

    await assertSucceeds(
      owner
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("devices")
        .doc("ios")
        .set(payload),
    );

    await assertSucceeds(
      owner
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("devices")
        .doc("ios")
        .set(
          devicePayload({
            token: "fcm-token-2",
            updatedAt: "2026-01-02T00:00:00.000Z",
          }),
        ),
    );
  });

  it("rejects other user writing devices", async () => {
    const other = rules.testEnv.authenticatedContext("other-1");
    await assertFails(
      other
        .firestore()
        .collection("users")
        .doc("owner-1")
        .collection("devices")
        .doc("ios")
        .set(devicePayload()),
    );
  });
});
