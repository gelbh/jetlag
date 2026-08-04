import { deleteField } from "firebase/firestore";
import {
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { describe, expect, it } from "vitest";
import {
  bindRulesTestEnv,
  sessionPayload,
} from "./helpers";

describe("firestore.rules — end game", () => {
  const rules = bindRulesTestEnv();

  it("scopes end-game truth anchors so seekers cannot read freeze coords", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-1", "hider-1", "observer-1"],
          memberRoles: {
            "host-1": "seeker",
            "seeker-1": "seeker",
            "hider-1": "hider",
            "observer-1": "observer",
          },
        }),
      );

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    const observer = rules.testEnv.authenticatedContext("observer-1");
    const hider = rules.testEnv.authenticatedContext("hider-1");

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );
    await assertSucceeds(
      observer
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );
    await assertFails(
      seeker
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .get(),
    );

    const sessionSnap = await assertSucceeds(
      seeker.firestore().collection("sessions").doc("session-1").get(),
    );
    expect(sessionSnap.data()?.endGameTruthAnchors).toBeUndefined();
  });

  it("denies malformed seeker end-game truth anchors", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": { foo: 1 },
          },
        }),
    );
  });

  it("denies seeker end-game truth anchor updates after create", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.36,
              lng: -6.27,
              frozenAt: "2026-01-01T00:02:00.000Z",
            },
          },
        }),
    );
  });

  it("allows a seeker to start end game when freeze anchors already exist", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the client-shaped sequential found-station end-game start", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          timerAccumulatedMs: 15_000,
          timerRunningSince: "2026-01-01T00:00:15.000Z",
          lastActiveAt: "2026-01-01T00:00:20.000Z",
        }),
      });

    const anchors = {
      "hider-1": {
        lat: 53.35,
        lng: -6.26,
        frozenAt: "2026-01-01T00:01:00.000Z",
      },
    };

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({ anchors }),
    );

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies starting end game without freeze anchors", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertFails(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies a non-member from starting end game directly", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    const stranger = rules.testEnv.authenticatedContext("stranger-1");
    await assertFails(
      stranger.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "stranger-1",
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the host to clear active end game fields", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
          endGameStartedAt: "2026-01-01T00:01:00.000Z",
          endGameStartedByUid: "host-1",
        }),
      });

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("denies writing freeze coords onto the shared session document", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1", {
          memberUids: ["host-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "hider-1": "hider" },
        }),
      });

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("endGameTruth")
        .doc("anchors")
        .set({
          anchors: {
            "hider-1": {
              lat: 53.35,
              lng: -6.26,
              frozenAt: "2026-01-01T00:01:00.000Z",
            },
          },
        }),
    );

    await assertFails(
      host.firestore().collection("sessions").doc("session-1").update({
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "host-1",
        endGameTruthAnchors: {
          "hider-1": {
            lat: 53.35,
            lng: -6.26,
            frozenAt: "2026-01-01T00:01:00.000Z",
          },
        },
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("allows the host to reset session progress with end-game anchors cleared", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1"),
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
        endGameStartedAt: "2026-01-01T00:01:00.000Z",
        endGameStartedByUid: "hider-1",
      });

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        sessionResetAt: "2026-01-02T00:00:00.000Z",
        timerAccumulatedMs: 0,
        timerRunningSince: deleteField(),
        endGameStartedAt: deleteField(),
        endGameStartedByUid: deleteField(),
        endGameTruthAnchors: deleteField(),
        endGameRequestedAt: deleteField(),
        endGameRequestedByUid: deleteField(),
      }),
    );
  });

  it("rejects session reset from non-host members", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const seeker = rules.testEnv.authenticatedContext("seeker-1");
    await assertFails(
      seeker.firestore().collection("sessions").doc("session-1").update({
        sessionResetAt: "2026-01-02T00:00:00.000Z",
        timerAccumulatedMs: 0,
        timerRunningSince: deleteField(),
      }),
    );
  });

});
