import { assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { beforeEach, describe, it } from "vitest";
import { bindRulesTestEnv, sessionPayload } from "./helpers";

const PROOF_HASH = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

function proofPayload(overrides: Record<string, unknown> = {}) {
  return { hash: PROOF_HASH, createdAt: "2026-10-18T00:00:00.000Z", ...overrides };
}

describe("firestore.rules: member proofs", () => {
  const rules = bindRulesTestEnv();

  beforeEach(async () => {
    await rules.testEnv.withSecurityRulesDisabled(async (context) => {
      const sessionRef = context.firestore().collection("sessions").doc("session-1");
      await sessionRef.set(
        sessionPayload("host-1", {
          memberUids: ["host-1", "seeker-1", "hider-1"],
          memberRoles: { "host-1": "seeker", "seeker-1": "seeker", "hider-1": "hider" },
        }),
      );
      await sessionRef.collection("memberProofs").doc("host-1").set(proofPayload());
    });
  });

  function proofs(uid: string) {
    return rules.testEnv
      .authenticatedContext(uid)
      .firestore()
      .collection("sessions")
      .doc("session-1")
      .collection("memberProofs");
  }

  it("allows a member to create their own proof", async () => {
    await assertSucceeds(proofs("seeker-1").doc("seeker-1").set(proofPayload()));
  });

  it("denies creating a proof for another uid", async () => {
    await assertFails(proofs("seeker-1").doc("hider-1").set(proofPayload()));
  });

  it("denies non-members and signed-out callers", async () => {
    await assertFails(proofs("guest-1").doc("guest-1").set(proofPayload()));
    await assertFails(
      rules.testEnv
        .unauthenticatedContext()
        .firestore()
        .collection("sessions")
        .doc("session-1")
        .collection("memberProofs")
        .doc("guest-1")
        .set(proofPayload()),
    );
  });

  it("denies extra keys, missing keys, and hashes that are not 64 lowercase hex chars", async () => {
    const own = proofs("seeker-1").doc("seeker-1");
    await assertFails(own.set(proofPayload({ uid: "seeker-1" })));
    await assertFails(own.set({ hash: PROOF_HASH }));
    await assertFails(own.set(proofPayload({ hash: PROOF_HASH.toUpperCase() })));
    await assertFails(own.set(proofPayload({ hash: PROOF_HASH.slice(1) })));
    await assertFails(own.set(proofPayload({ createdAt: 42 })));
  });

  it("lets a caller get only their own proof, including a missing one", async () => {
    await assertSucceeds(proofs("host-1").doc("host-1").get());
    await assertSucceeds(proofs("seeker-1").doc("seeker-1").get());
    await assertFails(proofs("seeker-1").doc("host-1").get());
  });

  it("denies listing proofs", async () => {
    await assertFails(proofs("host-1").get());
  });

  it("denies update, overwrite, and delete of an existing proof", async () => {
    const own = proofs("host-1").doc("host-1");
    await assertFails(own.update({ hash: "b".repeat(64) }));
    await assertFails(own.set(proofPayload({ hash: "b".repeat(64) })));
    await assertFails(own.delete());
  });
});
