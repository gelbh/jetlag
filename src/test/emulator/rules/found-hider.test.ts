import { deleteField } from "firebase/firestore";
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

describe("firestore.rules — found hider", () => {
  const rules = bindRulesTestEnv();

  it("allows a seeker to request found hider", async () => {
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

    const seeker = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:00:00.000Z",
        foundRequestedByUid: "host-1",
      }),
    );
  });

  it("denies found request from a hider", async () => {
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

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await assertFails(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:00:00.000Z",
        foundRequestedByUid: "hider-1",
      }),
    );
  });

  it("denies duplicate found request while one is pending", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1", "seeker-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "seeker-2": "seeker",
          },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T01:05:00.000Z",
        foundRequestedByUid: "seeker-2",
      }),
    );
  });

  it("allows a hider to confirm found with client confirmFoundHiderSession shape", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const hider = rules.testEnv.authenticatedContext("hider-1");
    // Mirrors confirmFoundHiderSession: confirm + clear request + clear end-game keys.
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "hider-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows a hider to confirm found while end game is active", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
          endGameStartedAt: "2026-01-01T00:30:00.000Z",
          endGameStartedByUid: "hider-1",
          endGameTruthAnchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:30:00.000Z",
            },
          },
        }),
      );

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "hider-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows a hider to decline a found request", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the requesting seeker to cancel a found request", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a non-requesting seeker from cancelling a found request", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1", "seeker-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "seeker-2": "seeker",
          },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const otherSeeker = rules.testEnv.authenticatedContext("seeker-2");
    await assertFails(
      otherSeeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a seeker from confirming found hider", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          foundRequestedAt: "2026-01-01T01:00:00.000Z",
          foundRequestedByUid: "host-1",
        }),
      );

    const seeker = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundConfirmedAt: "2026-01-01T01:05:00.000Z",
        foundConfirmedByUid: "host-1",
        gameOutcome: "found",
        foundRequestedAt: deleteField(),
        foundRequestedByUid: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies found request after the session has ended", async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("sessions").doc("session-1").set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          status: "ended",
          endedAt: "2026-01-01T02:00:00.000Z",
        }),
      );
    });

    const seeker = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        foundRequestedAt: "2026-01-01T02:05:00.000Z",
        foundRequestedByUid: "host-1",
      }),
    );
  });

});
