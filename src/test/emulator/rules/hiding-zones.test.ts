import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv, hidingZonePayload, seedSessionMembers, sessionPayload } from "./helpers";

describe("firestore.rules — hiding zones", () => {
  const rules = bindRulesTestEnv();

  it("allows hiders to write their own hiding zone", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set(hidingZonePayload()),
    );
  });

  it("denies seekers from writing hiding zones", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "seeker-1": "seeker" });

    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("seeker-1")
        .set(hidingZonePayload()),
    );
  });

  it("denies hiders from writing another player's hiding zone doc", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("other-hider")
        .set(hidingZonePayload()),
    );
  });

  it("denies hider create with moveInProgress true", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set({ ...hidingZonePayload(), moveInProgress: true }),
    );
  });

  it("allows host to clear another uid moveInProgress to false only", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set({ ...hidingZonePayload(), moveInProgress: true });
    });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .update({ moveInProgress: false }),
    );
  });

  it("denies non-host seeker from clearing hider moveInProgress", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-2", "hider-1"],
          memberRoles: { "host-1": "seeker", "seeker-2": "seeker", "hider-1": "hider" },
        }),
      );

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .set({ ...hidingZonePayload(), moveInProgress: true });
    });

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("hidingZones")
        .doc("hider-1")
        .update({ moveInProgress: false }),
    );
  });
});
