import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  sessionPayload,
} from "./helpers";

describe("firestore.rules", () => {
  const rules = bindRulesTestEnv();

  describe("joinRequests", () => {
    const joinRequestPayload = {
      requesterUid: "guest-1",
      role: "seeker",
      status: "pending",
      identityLabel: "ada",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2026-08-03T12:10:00.000Z",
      sessionId: "session-join-req",
    };

    async function seedGatedSessionWithJoinRequest() {
      await rules.testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .set(
            sessionPayload("host-1", {
              memberUids: ["host-1", "seeker-1"],
              memberRoles: { "host-1": "hider", "seeker-1": "seeker" },
              roleGates: {
                version: 1,
                leaders: { hider: "host-1", seeker: "seeker-1" },
              },
            }),
          );
        await context
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .set(joinRequestPayload);
      });
    }

    it("allows requester to read own join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const guest = rules.testEnv.authenticatedContext("guest-1");
      await assertSucceeds(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("allows role leader to read pending join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const leader = rules.testEnv.authenticatedContext("seeker-1");
      await assertSucceeds(
        leader
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("denies unrelated member read of join request", async () => {
      await seedGatedSessionWithJoinRequest();
      const host = rules.testEnv.authenticatedContext("host-1");
      await assertFails(
        host
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .get(),
      );
    });

    it("denies client writes to joinRequests", async () => {
      await seedGatedSessionWithJoinRequest();
      const guest = rules.testEnv.authenticatedContext("guest-1");
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-2")
          .set(joinRequestPayload),
      );
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-join-req")
          .collection("joinRequests")
          .doc("req-1")
          .update({ status: "cancelled" }),
      );
    });
  });
});
