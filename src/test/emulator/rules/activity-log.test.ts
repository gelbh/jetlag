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

  describe("activityLog", () => {
    function activityLogPayload(
      overrides: Record<string, unknown> = {},
    ): Record<string, unknown> {
      return {
        type: "session_started",
        createdAt: "2026-07-25T10:00:00.000Z",
        payload: {},
        ...overrides,
      };
    }

    async function seedSessionWithMember(memberUid: string) {
      const host = rules.testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1"));
      await host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", memberUid],
          memberRoles: { "host-1": "seeker", [memberUid]: "hider" },
        });
      return host;
    }

    it("allows session members to create and read activity log events", async () => {
      await seedSessionWithMember("hider-1");
      const hider = rules.testEnv.authenticatedContext("hider-1");
      const eventRef = hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertSucceeds(eventRef.set(activityLogPayload()));
      await assertSucceeds(eventRef.get());
    });

    it("denies activity log updates and deletes", async () => {
      await seedSessionWithMember("hider-1");
      const hider = rules.testEnv.authenticatedContext("hider-1");
      const eventRef = hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertSucceeds(eventRef.set(activityLogPayload()));
      await assertFails(
        eventRef.update({
          payload: { summary: "tampered" },
        }),
      );
      await assertFails(eventRef.delete());
    });

    it("denies non-members from creating or reading activity log events", async () => {
      await seedSessionWithMember("hider-1");
      const stranger = rules.testEnv.authenticatedContext("stranger-1");
      const eventRef = stranger
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("activityLog")
        .doc("session_started");

      await assertFails(eventRef.set(activityLogPayload()));
      await assertFails(eventRef.get());
    });

    it("denies activity log creates with invalid type", async () => {
      await seedSessionWithMember("hider-1");
      const hider = rules.testEnv.authenticatedContext("hider-1");

      await assertFails(
        hider
          .firestore()
          .collection("sessions")
          .doc("session-1")
          .collection("activityLog")
          .doc("bad")
          .set(
            activityLogPayload({
              type: "timer_paused",
            }),
          ),
      );
    });
  });

});
