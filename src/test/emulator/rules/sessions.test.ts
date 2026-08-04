import { deleteField } from "firebase/firestore";
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
  annotationPayload,
} from "./helpers";

describe("firestore.rules — sessions", () => {
  const rules = bindRulesTestEnv();

  it("allows a signed-in host to create a free session", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .set(sessionPayload("host-1")),
    );
  });

  it("denies client-supplied server-only ops fields on session create", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-version")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersion: "9.9.9.9",
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-set-at")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersionSetAt: "2026-01-01T00:00:00.000Z",
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-grace")
        .set(
          sessionPayload("host-1", {
            requiredMinAppVersionGraceSeconds: 30,
          }),
        ),
    );
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-ops-mitigation")
        .set(
          sessionPayload("host-1", {
            opsMitigation: {
              id: "m1",
              type: "soft_reload",
              appliedAt: "2026-01-01T00:00:00.000Z",
              appliedByUid: "admin-1",
              incidentId: "inc-1",
            },
          }),
        ),
    );
  });

  it("allows signed-in users to look up session codes without reading session docs", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest.firestore().collection("sessionCodes").doc("ABCD").get(),
    );
    await assertFails(
      guest.firestore().collection("sessions").doc("session-1").get(),
    );
  });

  it("lets only the host mark a session code as ended", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    const codeDoc = () =>
      host.firestore().collection("sessionCodes").doc("ABCD");
    await codeDoc().set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessionCodes")
        .doc("ABCD")
        .update({ status: "ended" }),
    );
    await assertFails(codeDoc().update({ status: "archived" }));
    await assertFails(
      codeDoc().update({ status: "ended", sessionId: "session-2" }),
    );
    await assertSucceeds(codeDoc().update({ status: "ended" }));
  });

  it("allows a guest to join an active session as hider with memberAppVersions", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          hostAppVersion: "0.2.1",
        }),
      );
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
          memberAppVersions: { "guest-1": "0.2.1" },
        }),
    );
  });

  it("allows membership heal without client hostUid writes", async () => {
    const host = rules.testEnv.authenticatedContext("host-old");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-old", {
          memberUids: ["host-old", "seeker-a"],
          memberRoles: { "host-old": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "host-old": "0.10.8", "seeker-a": "0.10.8" },
        }),
      );

    const returning = rules.testEnv.authenticatedContext("uid-new");
    await assertSucceeds(
      returning
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["uid-new", "seeker-a"],
          memberRoles: { "uid-new": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "uid-new": "0.10.8", "seeker-a": "0.10.8" },
        }),
    );
  });

  it("denies client hostUid transfer even when the old host is removed", async () => {
    const host = rules.testEnv.authenticatedContext("host-old");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-old", {
          memberUids: ["host-old", "seeker-a"],
          memberRoles: { "host-old": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "host-old": "0.10.8", "seeker-a": "0.10.8" },
        }),
      );

    const returning = rules.testEnv.authenticatedContext("uid-new");
    await assertFails(
      returning
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hostUid: "uid-new",
          memberUids: ["uid-new", "seeker-a"],
          memberRoles: { "uid-new": "seeker", "seeker-a": "seeker" },
          memberAppVersions: { "uid-new": "0.10.8", "seeker-a": "0.10.8" },
        }),
    );
  });

  it("denies hostUid transfer when the old host remains a member", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
        }),
      );

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hostUid: "guest-1",
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
        }),
    );
  });

  it("allows session members to update lastActiveAt only", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await guest
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .update({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "hider" },
      });

    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2026-07-12T12:00:00.000Z" }),
    );

    await assertFails(
      rules.testEnv
        .authenticatedContext("outsider-1")
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2026-07-12T12:00:00.000Z" }),
    );

    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          lastActiveAt: "2026-07-12T12:00:00.000Z",
          code: "WXYZ",
        }),
    );

    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({ lastActiveAt: "2099-01-01T00:00:00.000Z" }),
    );
  });

  it("allows a second guest to join as hider when one hider is already in the session", async () => {
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
        memberUids: ["host-1", "hider-1"],
        memberRoles: { "host-1": "seeker", "hider-1": "hider" },
      });

    const guest = rules.testEnv.authenticatedContext("guest-2");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "hider-1", "guest-2"],
          memberRoles: {
            "host-1": "seeker",
            "hider-1": "hider",
            "guest-2": "hider",
          },
        }),
    );
  });

  it("allows a returning member to change role on join", async () => {
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
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
      });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertSucceeds(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
        }),
    );
  });

  it("denies premium session creation without host access claim", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-premium")
        .set(sessionPayload("host-1", { tier: "premium" })),
    );
  });

  it("allows users to read their own entitlements doc only", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host.firestore().collection("users").doc("host-1").get(),
    );

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest.firestore().collection("users").doc("host-1").get(),
    );
    await assertFails(
      host.firestore().collection("users").doc("host-1").set({
        premiumSessionCredits: 5,
      }),
    );
  });

  it("allows the host to end a session", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        endedAt: "2026-01-02T00:00:00.000Z",
        status: "ended",
        code: deleteField(),
      }),
    );
  });

  it("allows the host to update timer fields", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").update({
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
      }),
    );
  });

  it("allows the host to reset session progress", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set({
        ...sessionPayload("host-1"),
        timerAccumulatedMs: 120_000,
        timerRunningSince: "2026-01-01T00:01:00.000Z",
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


  it("requires sign-in for session reads", async () => {
    const unauthenticated = rules.testEnv.unauthenticatedContext();
    await assertFails(
      unauthenticated
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .get(),
    );
  });

  it("denies session collection listing for non-members", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const outsider = rules.testEnv.authenticatedContext("outsider-1");
    await assertFails(
      outsider.firestore().collection("sessions").get(),
    );
  });


  it("stores session documents with expected host uid", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const snapshot = await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .get();

    expect(snapshot.data()?.hostUid).toBe("host-1");
  });

  it("allows session members to register their own device token", async () => {
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

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "seeker-device-token",
          platform: "ios",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    const hider = rules.testEnv.authenticatedContext("hider-1");
    await assertSucceeds(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("hider-1")
        .set({
          token: "hider-device-token",
          platform: "android",
          role: "hider",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: {
            enabled: true,
            newQuestions: true,
            timerChanges: true,
            chatMessages: false,
            liveActivities: true,
          },
        }),
    );

    await assertFails(
      hider
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("devices")
        .doc("host-1")
        .set({
          token: "stolen-token",
          platform: "android",
          role: "seeker",
          updatedAt: "2026-01-01T00:00:00.000Z",
          preferences: { enabled: true },
        }),
    );
  });

  it("allows host to update session rules before timer starts", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects session rules update after timer has started", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(
        sessionPayload("host-1", {
          timerAccumulatedMs: 1000,
          timerRunningSince: null,
        }),
      );

    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

  it("rejects non-host session rules update", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .set(sessionPayload("host-1"));

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .update({
          hidingPeriodMinutes: 45,
          hidingZoneRadiusMeters: milesToMeters(0.25),
        }),
    );
  });

});
