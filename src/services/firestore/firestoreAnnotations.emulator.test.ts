import { getDoc } from "firebase/firestore";
import { beforeEach, describe, expect, it } from "vitest";
import { APP_VERSION } from "../../domain/device/changelog";
import { generateHealSecret, hashHealSecret } from "../../domain/session/join/healSecret";
import { useSessionStore } from "../../state/sessionStore";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createTestPinAnnotation } from "../../test/fixtures/sessions";
import { JOIN_ERROR_HEAL_PROOF_INVALID } from "../session/rolePasscodeLifecycle";
import {
  createRemoteSession,
  endRemoteSession,
  ensureRemoteSessionMembership,
  getRemoteSessionById,
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
  subscribeToRemoteAnnotations,
  writeRemoteAnnotation,
} from "./firestoreAnnotations";
import { ensureMemberProof, memberProofDoc } from "./memberProofs";
import { buildAnnotationDocument } from "./serialization/serializeAnnotation";

describe("firestoreAnnotations emulator", () => {
  beforeEach(async () => {
    await teardownEmulatorsForTests();
    await connectEmulatorsForTests();
  });

  it("creates and looks up a remote session by code", async () => {
    const { uid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, uid);

    expect(session.code).toHaveLength(4);
    expect(session.memberUids).toContain(uid);

    const lookup = await lookupRemoteSessionByCode(session.code);
    expect(lookup.status).toBe("found");
    if (lookup.status === "found") {
      expect(lookup.session.id).toBe(session.id);
    }
  });

  it("joins an existing session by code", async () => {
    const { uid: hostUid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, hostUid);

    await teardownEmulatorsForTests();
    const { uid: guestUid } = await connectEmulatorsForTests();

    const joinResult = await joinRemoteSessionByCode(session.code, guestUid);
    expect(joinResult.status).toBe("joined");
    if (joinResult.status === "joined") {
      expect(joinResult.session.memberUids).toContain(guestUid);
    }
  });

  it("heals membership when auth uid drifted from a returning member", async () => {
    const { uid: hostUid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, hostUid);

    // Switch to the guest's device: its store has no secret for this session.
    useSessionStore.setState({ healSecrets: {} });
    await teardownEmulatorsForTests();
    const { uid: guestUid } = await connectEmulatorsForTests();

    await joinRemoteSessionByCode(session.code, guestUid);
    // Proof writes after join are fire-and-forget; wait for the in-flight one.
    await ensureMemberProof(session.id, guestUid);
    const guestSecret = useSessionStore.getState().healSecrets[session.id];
    expect(guestSecret).toMatch(/^[A-Za-z0-9_-]{43}$/);

    // Auth storage lost, jetlag-session intact: same store, new uid.
    await teardownEmulatorsForTests();
    const { uid: driftedGuestUid } = await connectEmulatorsForTests();

    const healed = await ensureRemoteSessionMembership(session, driftedGuestUid, "seeker", {
      returningMemberUid: guestUid,
      persistedMyUid: guestUid,
    });

    expect(healed.memberUids).toContain(driftedGuestUid);
    expect(healed.memberUids).not.toContain(guestUid);
    const movedProof = await getDoc(memberProofDoc(session.id, driftedGuestUid));
    expect(movedProof.data()).toEqual({
      hash: await hashHealSecret(guestSecret as string),
      createdAt: expect.any(String),
    });
  });

  it("rejects a drifted heal whose stored secret does not match the proof", async () => {
    const { uid: hostUid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, hostUid);

    useSessionStore.setState({ healSecrets: {} });
    await teardownEmulatorsForTests();
    const { uid: guestUid } = await connectEmulatorsForTests();
    await joinRemoteSessionByCode(session.code, guestUid);
    await ensureMemberProof(session.id, guestUid);

    // A forger knows the code and the old uid but not the device secret.
    useSessionStore.getState().setHealSecret(session.id, generateHealSecret());
    await teardownEmulatorsForTests();
    const { uid: forgerUid } = await connectEmulatorsForTests();

    await expect(
      ensureRemoteSessionMembership(session, forgerUid, "seeker", {
        returningMemberUid: guestUid,
        persistedMyUid: guestUid,
      }),
    ).rejects.toThrow(JOIN_ERROR_HEAL_PROOF_INVALID);
  });

  it("rejects version bypass without a persisted returning uid", async () => {
    const { uid: hostUid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(
      DUBLIN_CITY_GAME_AREA,
      hostUid,
      "free",
      undefined,
      "seeker",
      "medium",
      {},
      "imperial",
      "99.0.0",
    );

    await teardownEmulatorsForTests();
    const { uid: guestUid } = await connectEmulatorsForTests();

    const joinResult = await joinRemoteSessionByCode(
      session.code,
      guestUid,
      "seeker",
      APP_VERSION,
      { returningMemberUid: hostUid },
    );

    expect(joinResult.status).toBe("incompatible");

    const incompatibleJoin = await joinRemoteSessionByCode(
      session.code,
      "brand-new-uid",
      "seeker",
      APP_VERSION,
    );
    expect(incompatibleJoin.status).toBe("incompatible");
  });

  it("writes annotations and notifies subscribers", async () => {
    const { uid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, uid);
    const annotation = createTestPinAnnotation({
      sessionId: session.id,
    });

    const received: string[] = [];
    const unsubscribe = subscribeToRemoteAnnotations(
      session.id,
      (annotations) => {
        received.push(...annotations.map((item) => item.id));
      },
      (error) => {
        throw error;
      },
    );

    await writeRemoteAnnotation(session.id, annotation);

    await viWaitFor(() => received.includes(annotation.id));
    unsubscribe();
  });

  it("denies a replayed annotation write from a non-member", async () => {
    const { uid: hostUid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, hostUid);

    await teardownEmulatorsForTests();
    await connectEmulatorsForTests();

    // Mirrors an offline-queue replay: the client skipped the membership read,
    // so the rules are the only gate.
    await expect(
      writeRemoteAnnotation(
        session.id,
        createTestPinAnnotation({ id: "ann-non-member", sessionId: session.id }),
      ),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });

  it("deletes join code when ending a session", async () => {
    const { uid } = await connectEmulatorsForTests();
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, uid);
    const sessionCode = session.code;
    await endRemoteSession(session.id);

    const lookup = await lookupRemoteSessionByCode(sessionCode);
    expect(lookup.status).toBe("missing");

    const fetched = await getRemoteSessionById(session.id);
    expect(fetched?.endedAt).toBeTruthy();
    expect(fetched?.status).toBe("ended");
  });

  it("serializes annotations without nested arrays", () => {
    const annotation = createTestPinAnnotation();
    const payload = buildAnnotationDocument(annotation);
    expect(payload.type).toBe("pin");
    expect(typeof payload.geometryJson).toBe("string");
  });
});

async function viWaitFor(predicate: () => boolean, timeoutMs = 5_000): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
