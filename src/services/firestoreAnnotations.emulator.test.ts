import { beforeEach, describe, expect, it } from "vitest";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";
import { createTestPinAnnotation } from "../test/fixtures/sessions";
import {
  createRemoteSession,
  endRemoteSession,
  getRemoteSessionById,
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
  subscribeToRemoteAnnotations,
  writeRemoteAnnotation,
} from "./firestoreAnnotations";
import { buildAnnotationDocument } from "./firestoreSerialization";

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

  it("marks ended sessions as ended on lookup", async () => {
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

async function viWaitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
