import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { describe, it } from "vitest";
import { ANNOTATION_TYPES } from "@/domain/map/annotations";
import { annotationPayload, bindRulesTestEnv, seedSessionMembers, sessionPayload } from "./helpers";

describe("firestore.rules — annotations", () => {
  const rules = bindRulesTestEnv();

  it("allows seeker members to read and write annotations", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "guest-1": "seeker" });

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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

  describe("hider pins", () => {
    async function hiderSession() {
      const host = rules.testEnv.authenticatedContext("host-1");
      await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
      await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });
      const annotations = (uid: string) =>
        rules.testEnv
          .authenticatedContext(uid)
          .firestore()
          .collection("sessions")
          .doc("session-1")
          .collection("annotations");
      return { annotations };
    }

    function ownPin(uid: string, label = "Pop-up zoo") {
      const base = annotationPayload();
      return {
        ...base,
        metadata: { ...base.metadata, label, createdByUid: uid, poiCategory: "zoo" },
      };
    }

    it("allows a hider to create and soft-delete their own pin", async () => {
      const { annotations } = await hiderSession();
      const pinRef = annotations("hider-1").doc("pin-1");
      await assertSucceeds(pinRef.set({ ...ownPin("hider-1"), updatedAt: serverTimestamp() }));
      await assertSucceeds(
        pinRef.set({ ...ownPin("hider-1"), status: "deleted", updatedAt: serverTimestamp() }),
      );
    });

    it("denies hider pins without their own uid, over the label cap, or of another type", async () => {
      const { annotations } = await hiderSession();
      await assertFails(annotations("hider-1").doc("pin-1").set(annotationPayload()));
      await assertFails(annotations("hider-1").doc("pin-2").set(ownPin("host-1")));
      await assertFails(
        annotations("hider-1")
          .doc("pin-3")
          .set(ownPin("hider-1", "x".repeat(61))),
      );
      await assertFails(
        annotations("hider-1")
          .doc("radar-1")
          .set({ ...ownPin("hider-1"), type: "radar" }),
      );
    });

    it("denies a hider editing their pin or deleting a seeker pin", async () => {
      const { annotations } = await hiderSession();
      await annotations("hider-1").doc("pin-1").set(ownPin("hider-1"));
      await annotations("host-1").doc("seeker-pin").set(ownPin("host-1"));

      await assertFails(
        annotations("hider-1").doc("pin-1").update({ "metadata.poiCategory": "museum" }),
      );
      await assertFails(
        annotations("hider-1")
          .doc("seeker-pin")
          .update({ status: "deleted", updatedAt: serverTimestamp() }),
      );
    });
  });

  it.each(ANNOTATION_TYPES)("allows seekers to write %s annotations", async (type) => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("annotations")
        .doc(`ann-${type}`)
        .set({ ...annotationPayload(), type }),
    );
  });
});
