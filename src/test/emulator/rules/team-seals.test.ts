import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { describe, it } from "vitest";
import { arenaFromGameArea } from "../../../domain/session/castleSiege/arena";
import { DEFAULT_CASTLE_SIEGE_DIALS } from "../../../domain/session/castleSiege/dials";
import { serializeCastleSiegeArenaForFirestore } from "../../../services/firestore/serialization/serializeCastleSiege";
import { DUBLIN_CITY_GAME_AREA } from "../../fixtures/dublinGameArea";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

function castleSiegeSessionPayload(hostUid: string) {
  return sessionPayload(hostUid, {
    mode: "castleSiege",
    memberRoles: { [hostUid]: "observer" },
    castleSiegeRoles: { [hostUid]: "teamA" },
    setupMode: "pregame",
  });
}

describe("firestore.rules — castle siege team seals + setup", () => {
  const rules = bindRulesTestEnv();

  async function seedCastleSiegeSession() {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs")
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

    return rules.testEnv.authenticatedContext("host-1");
  }

  it("allows host to update arena border belt dials and coin", async () => {
    const host = await seedCastleSiegeSession();
    const arena = serializeCastleSiegeArenaForFirestore(arenaFromGameArea(DUBLIN_CITY_GAME_AREA));

    await assertSucceeds(
      host
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .update({
          arena,
          border: {
            geometryJson: JSON.stringify({
              type: "LineString",
              coordinates: [
                [-6.3, 53.33],
                [-6.2, 53.37],
              ],
            }),
          },
          neutralBelt: {
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
          },
          dials: DEFAULT_CASTLE_SIEGE_DIALS,
          coinAssignment: { teamA: "left", teamB: "right" },
        }),
    );
  });

  it("allows a team member to write their own seal hash", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
        }),
    );
  });

  it("denies writing the opposing team's seal hash", async () => {
    await seedCastleSiegeSession();
    const teamB = rules.testEnv.authenticatedContext("team-b-1");

    await assertFails(
      teamB
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-b-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
        }),
    );
  });

  it("lets opposing team read hash-only seal docs", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");
    const teamB = rules.testEnv.authenticatedContext("team-b-1");

    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
        }),
    );

    await assertSucceeds(
      teamB
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
  });

  it("denies opposing team reading seal docs that include plaintext fields", async () => {
    await seedCastleSiegeSession();

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          anchorName: "Keep",
          lat: 53.35,
          lng: -6.26,
          secretPhrase: "s3cret",
        });
    });

    const teamB = rules.testEnv.authenticatedContext("team-b-1");
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertFails(
      teamB
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
  });

  it("denies client writes that include plaintext seal fields", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertFails(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_B,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          secretPhrase: "nope",
        }),
    );
  });

  const SAMPLE_CIPHERTEXT = {
    v: 1,
    alg: "A256GCM",
    keyId: "castle-siege-seal-wrap-test",
    iv: "dGVzdGl2MTIzNDU2",
    ciphertext: "Y2lwaGVydGV4dC1ibG9iLW5vdC1wbGFpbnRleHQ=",
    wrappedKey: "d3JhcHBlZC1rZXktYmxvYg==",
    wrapIv: "d3JhcEl2MTIzNDU2",
  };

  it("allows a team member to write hash + ciphertext envelope", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          ciphertext: SAMPLE_CIPHERTEXT,
        }),
    );
  });

  it("denies opposing team reading seal docs that include ciphertext (V3)", async () => {
    await seedCastleSiegeSession();

    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          ciphertext: SAMPLE_CIPHERTEXT,
        });
    });

    const teamB = rules.testEnv.authenticatedContext("team-b-1");
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertFails(
      teamB
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
    await assertSucceeds(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
  });

  it("denies classic observers reading ciphertext envelopes", async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .set({
          ...castleSiegeSessionPayload("host-1"),
          memberUids: ["host-1", "team-a-1", "observer-1"],
          memberRoles: {
            "host-1": "observer",
            "team-a-1": "observer",
            "observer-1": "observer",
          },
          castleSiegeRoles: {
            "host-1": "teamA",
            "team-a-1": "teamA",
            "observer-1": "observer",
          },
        });
      await context
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          ciphertext: SAMPLE_CIPHERTEXT,
        });
    });

    const spectator = rules.testEnv.authenticatedContext("observer-1");
    await assertFails(
      spectator
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .get(),
    );
  });

  it("denies client writes with malformed ciphertext envelopes", async () => {
    await seedCastleSiegeSession();
    const teamA = rules.testEnv.authenticatedContext("team-a-1");

    await assertFails(
      teamA
        .firestore()
        .collection("sessions")
        .doc("session-cs")
        .collection("teamSeals")
        .doc("teamA")
        .set({
          hash: HASH_A,
          sealedByUid: "team-a-1",
          sealedAt: "2026-10-20T12:00:00.000Z",
          ciphertext: { v: 1, alg: "A256GCM" },
        }),
    );
  });
});
