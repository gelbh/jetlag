import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, expect, it } from "vitest";
import {
  adminContext,
  bindRulesTestEnv,
  playerLocationPayload,
  seedSessionMembers,
  sessionPayload,
} from "./helpers";

describe("firestore.rules — player locations", () => {
  const rules = bindRulesTestEnv();

  it("scopes player location reads so seekers cannot read hider GPS", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, {
      "host-1": "seeker",
      "seeker-1": "seeker",
      "hider-1": "hider",
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, {
      "host-1": "seeker",
      "seeker-1": "seeker",
      "hider-1": "hider",
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, {
      "host-1": "seeker",
      "seeker-1": "seeker",
      "hider-1": "hider",
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const observer = adminContext(rules.testEnv, "observer-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");
    await seedSessionMembers(rules.testEnv, {
      "host-1": "seeker",
      "observer-1": "observer",
      "hider-1": "hider",
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

describe("firestore.rules — player trail points", () => {
  const rules = bindRulesTestEnv();

  async function seed(overrides: Record<string, unknown>) {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1", overrides));
    });
  }

  function trailPoints(uid: string) {
    return rules.testEnv
      .authenticatedContext(uid)
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("playerTrailPoints")
      .doc(uid)
      .collection("points");
  }

  function trailPoint(role?: string) {
    return {
      lat: 53.35,
      lng: -6.26,
      accuracyMeters: null,
      recordedAt: "2026-01-01T00:00:00.000Z",
      ...(role === undefined ? {} : { role }),
    };
  }

  const classicMembers = {
    memberUids: ["host-1", "seeker-1", "hider-1"],
    memberRoles: { "host-1": "seeker", "seeker-1": "seeker", "hider-1": "hider" },
  };

  it("requires the trail point role to match the writer's session role", async () => {
    await seed(classicMembers);
    await assertSucceeds(trailPoints("seeker-1").add(trailPoint("seeker")));
    await assertFails(trailPoints("seeker-1").add(trailPoint("hider")));
    await assertSucceeds(trailPoints("hider-1").add(trailPoint("hider")));
    await assertFails(trailPoints("hider-1").add(trailPoint("seeker")));
  });

  it("denies a point queued under a role the writer has switched away from", async () => {
    await seed({
      memberUids: ["host-1", "hider-1"],
      memberRoles: { "host-1": "seeker", "hider-1": "seeker" },
    });
    await assertFails(trailPoints("hider-1").add(trailPoint("hider")));
  });

  it("still accepts trail points without a role", async () => {
    await seed(classicMembers);
    await assertSucceeds(trailPoints("seeker-1").add(trailPoint()));
  });

  it("keeps role-less legacy sessions writable with either player role", async () => {
    await seed({ memberUids: ["host-1", "seeker-1"], memberRoles: null });
    await assertSucceeds(trailPoints("seeker-1").add(trailPoint("seeker")));
    await assertSucceeds(trailPoints("seeker-1").add(trailPoint("hider")));
  });

  it("denies a point from a member whose own key is missing from memberRoles", async () => {
    await seed({
      memberUids: ["host-1", "seeker-1", "hider-1"],
      memberRoles: { "host-1": "seeker", "seeker-1": "seeker" },
    });
    await assertFails(trailPoints("hider-1").add(trailPoint("hider")));
  });

  it("denies trail points from a castle siege observer host", async () => {
    await seed({
      mode: "castleSiege",
      memberUids: ["host-1", "seeker-1"],
      memberRoles: { "host-1": "observer", "seeker-1": "seeker" },
      castleSiegeRoles: { "host-1": "teamA" },
    });
    await assertFails(trailPoints("host-1").add(trailPoint("seeker")));
    await assertSucceeds(trailPoints("seeker-1").add(trailPoint("seeker")));
  });
});
