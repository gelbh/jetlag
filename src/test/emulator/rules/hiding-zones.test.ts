import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import {
  bindRulesTestEnv,
  sessionPayload,
  hidingZonePayload,
} from "./helpers";

describe("firestore.rules — hiding zones", () => {
  const rules = bindRulesTestEnv();

  it("allows hiders to write their own hiding zone", async () => {
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
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1"],
        memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
      });

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
        .collection("hidingZones")
        .doc("other-hider")
        .set(hidingZonePayload()),
    );
  });

});
