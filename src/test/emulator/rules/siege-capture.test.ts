import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

const SESSION_ID = "session-cs-capture";

const SIEGE_CLOCK = {
  limitSeconds: 600,
  deadlineMs: Date.now() + 600_000,
  paused: false,
  pauseReason: null,
  remainingMsWhenPaused: null,
  roles: { teamA: "attack", teamB: "defend" },
  headStartTeamId: null,
  headStartEndsAtMs: null,
  headStartConsumed: true,
};

function pendingCapture(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending",
    attackingTeamId: "teamA",
    submittedByUid: "team-a-1",
    photoStoragePath: "sessions/session-cs-capture/siegeCaptures/a.jpg",
    submittedAtMs: 1_000,
    confirmDeadlineMs: Date.now() + 60_000,
    resolvedAtMs: null,
    resolvedByUid: null,
    ...overrides,
  };
}

describe("firestore.rules — castle siege capture ACL", () => {
  const rules = bindRulesTestEnv();

  async function seedSiegeSession(extra: Record<string, unknown> = {}) {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .set({
          ...sessionPayload("host-1", {
            mode: "castleSiege",
            setupMode: "pregame",
          }),
          memberUids: ["host-1", "team-a-1", "team-b-1", "observer-1"],
          memberRoles: {
            "host-1": "observer",
            "team-a-1": "observer",
            "team-b-1": "observer",
            "observer-1": "observer",
          },
          castleSiegeRoles: {
            "host-1": "teamA",
            "team-a-1": "teamA",
            "team-b-1": "teamB",
            "observer-1": "observer",
          },
          phase: "siege",
          siegeClock: SIEGE_CLOCK,
          siegeCapture: {
            status: "idle",
            attackingTeamId: null,
            submittedByUid: null,
            photoStoragePath: null,
            submittedAtMs: null,
            confirmDeadlineMs: null,
            resolvedAtMs: null,
            resolvedByUid: null,
          },
          ...extra,
        });
    });
  }

  it("allows attacker submit and denies observer forge confirm", async () => {
    await seedSiegeSession();
    const attacker = rules.testEnv.authenticatedContext("team-a-1");
    const observer = rules.testEnv.authenticatedContext("observer-1");

    await assertSucceeds(
      attacker.firestore().collection("sessions").doc(SESSION_ID).update({
        siegeCapture: pendingCapture(),
      }),
    );

    await assertFails(
      observer
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .update({
          siegeCapture: pendingCapture({
            status: "confirmed",
            resolvedAtMs: 2_000,
            resolvedByUid: "observer-1",
          }),
        }),
    );
  });

  it("denies attacker self-confirm; allows defender confirm", async () => {
    await seedSiegeSession({
      siegeCapture: pendingCapture(),
    });
    const attacker = rules.testEnv.authenticatedContext("team-a-1");
    const defender = rules.testEnv.authenticatedContext("team-b-1");

    await assertFails(
      attacker
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .update({
          siegeCapture: pendingCapture({
            status: "confirmed",
            resolvedAtMs: 2_000,
            resolvedByUid: "team-a-1",
          }),
        }),
    );

    await assertSucceeds(
      defender
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .update({
          siegeCapture: pendingCapture({
            status: "confirmed",
            resolvedAtMs: 2_000,
            resolvedByUid: "team-b-1",
          }),
        }),
    );
  });

  it("denies enemy teamPressure read", async () => {
    await seedSiegeSession();
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .collection("teamPressure")
        .doc("teamB")
        .set({ scalar: 40, band: "flag" });
    });

    const attacker = rules.testEnv.authenticatedContext("team-a-1");
    const defender = rules.testEnv.authenticatedContext("team-b-1");

    await assertFails(
      attacker
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .collection("teamPressure")
        .doc("teamB")
        .get(),
    );
    await assertSucceeds(
      defender
        .firestore()
        .collection("sessions")
        .doc(SESSION_ID)
        .collection("teamPressure")
        .doc("teamB")
        .get(),
    );
  });
});
