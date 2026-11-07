import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv, seedSessionMembers, sessionPayload } from "./helpers";

function opsNoticePayload(overrides: Record<string, unknown> = {}) {
  return {
    text: "Stay on the train",
    tone: "info",
    createdAt: "2026-01-01T00:00:00.000Z",
    createdByUid: "admin-1",
    expiresAt: "2026-01-01T00:00:30.000Z",
    active: true,
    dismissedBy: {},
    ...overrides,
  };
}

describe("firestore.rules — session ops notices", () => {
  const rules = bindRulesTestEnv();

  async function seedSessionAndNotice() {
    await rules.testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
      await ctx
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("notices")
        .doc("notice-1")
        .set(opsNoticePayload());
    });
    await seedSessionMembers(rules.testEnv, {
      "host-1": "seeker",
      "hider-1": "hider",
    });
  }

  it("allows members to read notices", async () => {
    await seedSessionAndNotice();
    const member = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      member.firestore().collection("sessions").doc("session-1").collection("notices").get(),
    );
  });

  it("rejects non-members reading notices", async () => {
    await seedSessionAndNotice();
    const outsider = rules.testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider.firestore().collection("sessions").doc("session-1").collection("notices").get(),
    );
  });

  it("rejects member create", async () => {
    await seedSessionAndNotice();
    const member = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      member
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("notices")
        .doc("notice-2")
        .set(opsNoticePayload({ text: "Nope" })),
    );
  });

  it("allows member dismiss-only update", async () => {
    await seedSessionAndNotice();
    const member = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      member
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("notices")
        .doc("notice-1")
        .update({ "dismissedBy.hider-1": "2026-01-01T00:01:00.000Z" }),
    );
  });

  it("rejects member changing text on update", async () => {
    await seedSessionAndNotice();
    const member = rules.testEnv.authenticatedContext("hider-1");
    await assertFails(
      member
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("notices")
        .doc("notice-1")
        .update({
          text: "hacked",
          "dismissedBy.hider-1": "2026-01-01T00:01:00.000Z",
        }),
    );
  });
});
