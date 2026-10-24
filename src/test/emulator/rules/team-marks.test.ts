import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

function castleSiegeSessionPayload(hostUid: string) {
  return sessionPayload(hostUid, {
    mode: "castleSiege",
    memberRoles: { [hostUid]: "observer" },
    castleSiegeRoles: { [hostUid]: "teamA" },
    setupMode: "pregame",
  });
}

const MARK = {
  geometryJson: JSON.stringify({
    type: "Polygon",
    coordinates: [
      [
        [-6.28, 53.34],
        [-6.22, 53.34],
        [-6.22, 53.36],
        [-6.28, 53.36],
        [-6.28, 53.34],
      ],
    ],
  }),
  updatedByUid: "team-a-1",
  updatedAt: new Date().toISOString(),
};

describe("firestore.rules — castle siege teamMarks (V12)", () => {
  const rules = bindRulesTestEnv();

  async function seedCastleSiegeSession() {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs-marks")
        .set({
          ...castleSiegeSessionPayload("host-1"),
          memberUids: ["host-1", "team-a-1", "team-b-1"],
          memberRoles: {
            "host-1": "observer",
            "team-a-1": "observer",
            "team-b-1": "observer",
          },
          castleSiegeRoles: {
            "host-1": "teamA",
            "team-a-1": "teamA",
            "team-b-1": "teamB",
          },
        });
    });
  }

  it("allows own team to write marks and denies enemy read", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");
    const teamB = rules.testEnv.authenticatedContext("team-b-1");

    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs-marks")
        .collection("teamMarks")
        .doc("teamA")
        .set(MARK),
    );

    await assertFails(
      teamB
        .firestore()
        .collection("sessions")
        .doc("session-cs-marks")
        .collection("teamMarks")
        .doc("teamA")
        .get(),
    );

    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs-marks")
        .collection("teamMarks")
        .doc("teamA")
        .get(),
    );

    // Playing host (host-1 is teamA) must not read enemy marks (V12).
    const playingHost = rules.testEnv.authenticatedContext("host-1");
    await assertFails(
      playingHost
        .firestore()
        .collection("sessions")
        .doc("session-cs-marks")
        .collection("teamMarks")
        .doc("teamB")
        .get(),
    );
  });
});
