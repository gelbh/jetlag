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

  describe("role passcodes", () => {
    it("denies client membership join on gated sessions", async () => {
      const host = rules.testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-gated")
        .set(
          sessionPayload("host-1", {
            roleGates: { version: 1, leaders: { seeker: "host-1" } },
          }),
        );

      const guest = rules.testEnv.authenticatedContext("guest-1");
      await assertFails(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-gated")
          .update({
            memberUids: ["host-1", "guest-1"],
            memberRoles: { "host-1": "seeker", "guest-1": "hider" },
            memberAppVersions: { "guest-1": "0.2.1" },
          }),
      );
    });

    it("denies client reads of sessionRoleSecrets", async () => {
      await rules.testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection("sessionRoleSecrets")
          .doc("session-gated")
          .set({ observer: { code: "OBSV", salt: "s", hash: "h" } });
      });

      const host = rules.testEnv.authenticatedContext("host-1");
      await assertFails(
        host.firestore().collection("sessionRoleSecrets").doc("session-gated").get(),
      );
    });

    it("still allows legacy membership join without roleGates", async () => {
      const host = rules.testEnv.authenticatedContext("host-1");
      await host
        .firestore()
        .collection("sessions")
        .doc("session-legacy")
        .set(sessionPayload("host-1"));

      const guest = rules.testEnv.authenticatedContext("guest-1");
      await assertSucceeds(
        guest
          .firestore()
          .collection("sessions")
          .doc("session-legacy")
          .update({
            memberUids: ["host-1", "guest-1"],
            memberRoles: { "host-1": "seeker", "guest-1": "hider" },
            memberAppVersions: { "guest-1": "0.2.1" },
          }),
      );
    });
  });

});
