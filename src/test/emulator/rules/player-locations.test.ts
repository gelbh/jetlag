import {
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, expect, it } from "vitest";
import {
  bindRulesTestEnv,
  adminContext,
  sessionPayload,
  playerLocationPayload,
} from "./helpers";

describe("firestore.rules — player locations", () => {
  const rules = bindRulesTestEnv();

  it("scopes player location reads so seekers cannot read hider GPS", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .set(playerLocationPayload("seeker")),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .get(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .get(),
    );
  });

  it("allows a player to delete only their own live location", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .set(playerLocationPayload("seeker")),
    );
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("seeker-1")
        .delete(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .delete(),
    );
    await assertFails(
      rules.testEnv
        .unauthenticatedContext()
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .delete(),
    );
  });

  it("allows seekers to list only seeker player locations when hider docs exist", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "seeker-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "seeker-1": "seeker",
          "hider-1": "hider",
        },
      });

    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("playerLocations")
      .doc("host-1")
      .set(playerLocationPayload("seeker"));
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    const seekerSnapshot = await assertSucceeds(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "seeker")
        .get(),
    );
    expect(seekerSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["host-1"]);
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "hider")
        .get(),
    );
  });

  it("allows observers to read seeker and hider player locations", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const observer = adminContext(rules.testEnv, "observer-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "observer-1", "hider-1"],
        memberRoles: {
          "host-1": "seeker",
          "observer-1": "observer",
          "hider-1": "hider",
        },
      });

    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("playerLocations")
      .doc("host-1")
      .set(playerLocationPayload("seeker"));
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .set(playerLocationPayload("hider")),
    );

    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("host-1")
        .get(),
    );
    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .doc("hider-1")
        .get(),
    );

    const seekerSnapshot = await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "seeker")
        .get(),
    );
    expect(seekerSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["host-1"]);

    const hiderSnapshot = await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("playerLocations")
        .where("role", "==", "hider")
        .get(),
    );
    expect(hiderSnapshot.docs.map((doc) => doc.id).sort()).toEqual(["hider-1"]);
  });

});
