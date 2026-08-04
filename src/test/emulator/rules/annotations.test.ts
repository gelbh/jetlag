import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  sessionPayload,
  annotationPayload,
} from "./helpers";

describe("firestore.rules — annotations", () => {
  const rules = bindRulesTestEnv();

  it("allows seeker members to read and write annotations", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
      });

    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });

  it("denies annotation writes from hiders", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });


  it("denies annotation writes from non-members", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = rules.testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set(annotationPayload()),
    );
  });


  it("rejects invalid annotation types", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc("ann-1")
        .set({
          ...annotationPayload(),
          type: "invalid",
        }),
    );
  });

});
