import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { arrayUnion, deleteField } from "firebase/firestore";
import { describe, expect, it } from "vitest";
import { bindRulesTestEnv, milesToMeters, seedSessionMembers, sessionPayload } from "./helpers";

describe("firestore.rules — sessions", () => {
  const rules = bindRulesTestEnv();

  it("allows a signed-in host to create a free session", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1")),
    );
  });

  it("allows castleSiege create with observer host and team roles", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-castle")
        .set(
          sessionPayload("host-1", {
            mode: "castleSiege",
            memberRoles: { "host-1": "observer" },
            castleSiegeRoles: { "host-1": "teamA" },
            seriesLength: 3,
            setupMode: "fairSplit",
          }),
        ),
    );
  });

  it("denies classic create when host memberRoles is observer", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      host
        .firestore()
        .collection("sessions")
        .doc("session-observer-classic")
        .set(
          sessionPayload("host-1", {
            memberRoles: { "host-1": "observer" },
          }),
        ),
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
    await host
      .firestore()
      .collection("sessionCodes")
      .doc("ABCD")
      .set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertSucceeds(guest.firestore().collection("sessionCodes").doc("ABCD").get());
    await assertFails(guest.firestore().collection("sessions").doc("session-1").get());
  });

  it("lets only the host mark a session code as ended", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    const codeDoc = () => host.firestore().collection("sessionCodes").doc("ABCD");
    await codeDoc().set({ sessionId: "session-1", hostUid: "host-1" });

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(
      guest.firestore().collection("sessionCodes").doc("ABCD").update({ status: "ended" }),
    );
    await assertFails(codeDoc().update({ status: "archived" }));
    await assertFails(codeDoc().update({ status: "ended", sessionId: "session-2" }));
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

  it("denies a client membership heal that swaps out another member", async () => {
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
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
      guest.firestore().collection("sessions").doc("session-1").update({
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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "hider-1": "hider" });

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));
    await seedSessionMembers(rules.testEnv, { "host-1": "seeker", "guest-1": "seeker" });

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
    await assertSucceeds(host.firestore().collection("users").doc("host-1").get());

    const guest = rules.testEnv.authenticatedContext("guest-1");
    await assertFails(guest.firestore().collection("users").doc("host-1").get());
    await assertFails(
      host.firestore().collection("users").doc("host-1").set({
        premiumSessionCredits: 5,
      }),
    );
  });

  it("allows the host to end a session", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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
    await assertFails(unauthenticated.firestore().collection("sessions").doc("session-1").get());
  });

  it("denies session collection listing for non-members", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const outsider = rules.testEnv.authenticatedContext("outsider-1");
    await assertFails(outsider.firestore().collection("sessions").get());
  });

  it("stores session documents with expected host uid", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

    const snapshot = await host.firestore().collection("sessions").doc("session-1").get();

    expect(snapshot.data()?.hostUid).toBe("host-1");
  });

  it("rejects session members registering device tokens (FCM retired)", async () => {
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

    await assertFails(
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
    await assertFails(
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
  });

  it("allows host to update session rules before timer starts", async () => {
    const host = rules.testEnv.authenticatedContext("host-1");
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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
    await host.firestore().collection("sessions").doc("session-1").set(sessionPayload("host-1"));

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

  describe("legacy membership join is self-only", () => {
    const baseMembers = {
      memberUids: ["host-1", "seeker-a"],
      memberRoles: { "host-1": "seeker", "seeker-a": "seeker" },
      memberAppVersions: { "host-1": "1.7.0", "seeker-a": "1.7.0" },
    };

    async function seed(overrides: Record<string, unknown> = baseMembers) {
      await rules.testEnv.withSecurityRulesDisabled(async (context) => {
        await context
          .firestore()
          .collection("sessions")
          .doc("session-1")
          .set(sessionPayload("host-1", overrides));
      });
    }

    function sessionAs(uid: string) {
      return rules.testEnv
        .authenticatedContext(uid)
        .firestore()
        .collection("sessions")
        .doc("session-1");
    }

    it("allows the no-read join shape (arrayUnion plus dotted own entries)", async () => {
      await seed();
      await assertSucceeds(
        sessionAs("guest-1").update({
          memberUids: arrayUnion("guest-1"),
          "memberRoles.guest-1": "hider",
          "memberAppVersions.guest-1": "1.7.0",
        }),
      );
    });

    it("allows the read-path full-array join that adds only the caller", async () => {
      await seed();
      await assertSucceeds(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "host-1": "seeker", "seeker-a": "seeker", "guest-1": "hider" },
          memberAppVersions: { "host-1": "1.7.0", "seeker-a": "1.7.0", "guest-1": "1.7.0" },
        }),
      );
    });

    it("allows a member to rewrite full arrays changing only their own entries", async () => {
      // join.ts read path with returningMemberUid === uid moves the caller to the end.
      await seed({
        memberUids: ["host-1", "guest-1", "seeker-a"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker", "seeker-a": "seeker" },
        memberAppVersions: { "host-1": "1.7.0", "guest-1": "1.6.0", "seeker-a": "1.7.0" },
      });
      await assertSucceeds(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider", "seeker-a": "seeker" },
          memberAppVersions: { "host-1": "1.7.0", "guest-1": "1.7.0", "seeker-a": "1.7.0" },
        }),
      );
    });

    it("allows an own-role switch that writes only memberRoles and memberAppVersions", async () => {
      await seed({
        memberUids: ["host-1", "guest-1"],
        memberRoles: { "host-1": "seeker", "guest-1": "seeker" },
        memberAppVersions: { "host-1": "1.7.0", "guest-1": "1.7.0" },
      });
      await assertSucceeds(
        sessionAs("guest-1").update({
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
          memberAppVersions: { "host-1": "1.7.0", "guest-1": "1.7.0" },
        }),
      );
    });

    it("allows a join on a role-less session that creates only the caller's role", async () => {
      await seed({ memberUids: ["host-1", "seeker-a"], memberRoles: null });
      await assertSucceeds(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "guest-1": "hider" },
        }),
      );
    });

    it("denies a join that rewrites another member's role", async () => {
      await seed();
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "host-1": "seeker", "seeker-a": "hider", "guest-1": "hider" },
        }),
      );
    });

    it("denies a stale full-array join that drops another member", async () => {
      await seed();
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "guest-1"],
          memberRoles: { "host-1": "seeker", "guest-1": "hider" },
          memberAppVersions: { "host-1": "1.7.0", "guest-1": "1.7.0" },
        }),
      );
    });

    it("denies a join that adds another uid alongside the caller", async () => {
      await seed();
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1", "friend-1"],
          memberRoles: { "host-1": "seeker", "seeker-a": "seeker", "guest-1": "hider" },
        }),
      );
    });

    it("denies a join that edits another member's app version", async () => {
      await seed();
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: arrayUnion("guest-1"),
          "memberRoles.guest-1": "hider",
          "memberAppVersions.seeker-a": "0.0.1",
        }),
      );
    });

    it("denies other members' entries when memberAppVersions does not exist yet", async () => {
      await seed({
        memberUids: ["host-1", "seeker-a"],
        memberRoles: { "host-1": "seeker", "seeker-a": "seeker" },
      });
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "host-1": "seeker", "seeker-a": "seeker", "guest-1": "hider" },
          memberAppVersions: { "guest-1": "1.7.0", "seeker-a": "0.0.1" },
        }),
      );
    });

    it("denies a role-less session join that writes another member's role", async () => {
      await seed({ memberUids: ["host-1", "seeker-a"], memberRoles: null });
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: ["host-1", "seeker-a", "guest-1"],
          memberRoles: { "guest-1": "hider", "seeker-a": "hider" },
        }),
      );
    });

    it("denies duplicating the caller's own uid in memberUids", async () => {
      await seed();
      await assertFails(
        sessionAs("seeker-a").update({
          memberUids: ["host-1", "seeker-a", "seeker-a"],
        }),
      );
    });

    it("denies a join that also writes castleSiegeRoles", async () => {
      await seed({
        ...baseMembers,
        mode: "castleSiege",
        castleSiegeRoles: { "host-1": "teamA" },
      });
      await assertFails(
        sessionAs("guest-1").update({
          memberUids: arrayUnion("guest-1"),
          "memberRoles.guest-1": "seeker",
          "castleSiegeRoles.guest-1": "teamB",
        }),
      );
    });
  });
});
