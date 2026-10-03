import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { beforeEach, describe, it } from "vitest";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

function intentPayload(uid: string, overrides: Record<string, unknown> = {}) {
  return {
    type: "moveTimer",
    action: "pause",
    uid,
    requestedAtMs: Date.now(),
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

describe("firestore.rules — session intents", () => {
  const rules = bindRulesTestEnv();

  beforeEach(async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(
          sessionPayload("host-1", {
            memberUids: ["host-1", "hider-1", "seeker-1"],
            memberRoles: { "host-1": "seeker", "hider-1": "hider", "seeker-1": "seeker" },
          }),
        );
    });
  });

  function intents(uid: string) {
    return rules.testEnv
      .authenticatedContext(uid)
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("intents");
  }

  it("allows a hider to create their own move timer intent", async () => {
    await assertSucceeds(intents("hider-1").doc("i1").set(intentPayload("hider-1")));
    await assertSucceeds(
      intents("hider-1")
        .doc("i2")
        .set(intentPayload("hider-1", { action: "resume" })),
    );
  });

  it("denies seekers creating intents", async () => {
    await assertFails(intents("seeker-1").doc("i1").set(intentPayload("seeker-1")));
  });

  it("denies unauthenticated users, non-members, and unknown intent types", async () => {
    await assertFails(
      rules.testEnv
        .unauthenticatedContext()
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("intents")
        .doc("i1")
        .set(intentPayload("hider-1")),
    );
    await assertFails(intents("stranger-1").doc("i2").set(intentPayload("stranger-1")));
    await assertFails(
      intents("hider-1")
        .doc("i3")
        .set(intentPayload("hider-1", { type: "other" })),
    );
  });

  it("denies a hider creating an intent for another uid", async () => {
    await assertFails(intents("hider-1").doc("i1").set(intentPayload("seeker-1")));
  });

  it("denies extra keys, bad actions, and client-chosen createdAt", async () => {
    await assertFails(
      intents("hider-1")
        .doc("i1")
        .set(intentPayload("hider-1", { processedAt: serverTimestamp() })),
    );
    await assertFails(
      intents("hider-1")
        .doc("i2")
        .set(intentPayload("hider-1", { action: "rewind" })),
    );
    await assertFails(
      intents("hider-1")
        .doc("i3")
        .set(intentPayload("hider-1", { createdAt: new Date(0) })),
    );
    await assertFails(
      intents("hider-1")
        .doc("i4")
        .set(intentPayload("hider-1", { requestedAtMs: "soon" })),
    );
  });

  it("denies updates and deletes, even by the author", async () => {
    await assertSucceeds(intents("hider-1").doc("i1").set(intentPayload("hider-1")));
    await assertFails(intents("hider-1").doc("i1").update({ action: "resume" }));
    await assertFails(intents("hider-1").doc("i1").delete());
  });

  it("lets the author read their intent but not other users or lists", async () => {
    await assertSucceeds(intents("hider-1").doc("i1").set(intentPayload("hider-1")));
    await assertSucceeds(intents("hider-1").doc("i1").get());
    await assertFails(intents("seeker-1").doc("i1").get());
    await assertFails(intents("hider-1").get());
  });
});
