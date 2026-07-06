// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../test/fixtures/dublinGameArea";
import { createTestPinAnnotation } from "../test/fixtures/sessions";
import {
  createRemoteSession,
  writeRemoteAnnotation,
} from "../services/firestoreAnnotations";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useAnnotationStore, useSessionStore } from "../state/sessionStore";
import { useSessionSync } from "./useSessionSync";

describe("useSessionSync emulator", () => {
  let testUid: string;

  beforeEach(async () => {
    localStorage.clear();
    sessionStorage.clear();
    useSessionStore.setState({
      session: null,
      pendingWrites: 0,
      syncInFlight: 0,
      lastSyncError: null,
      remoteUpdateNotice: null,
    });
    useAnnotationStore.setState({
      annotations: [],
      redoAnnotationIds: [],
      selectedAnnotationId: null,
      geometryEditAnnotationId: null,
      pulsingAnnotationIds: [],
    });

    await teardownEmulatorsForTests();
    ({ uid: testUid } = await connectEmulatorsForTests());
  });

  it("mirrors remote annotation updates into the annotation store", async () => {
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);
    const annotation = createTestPinAnnotation({
      id: "ann-sync-1",
      sessionId: session.id,
    });

    useSessionStore.getState().setSession(session, testUid);
    renderHook(() => useSessionSync());

    await writeRemoteAnnotation(session.id, annotation);

    await waitFor(() => {
      const stored = useAnnotationStore
        .getState()
        .annotations.find((item) => item.id === annotation.id);
      expect(stored?.type).toBe("pin");
    });
  });

  it("applies remote annotation updates after the initial sync", async () => {
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);
    const annotation = createTestPinAnnotation({
      id: "ann-sync-2",
      sessionId: session.id,
    });

    useSessionStore.getState().setSession(session, testUid);
    renderHook(() => useSessionSync());

    await writeRemoteAnnotation(session.id, annotation);
    await waitFor(() => {
      expect(useAnnotationStore.getState().annotations).toHaveLength(1);
      expect(
        useAnnotationStore.getState().annotations[0]?.updatedAt,
      ).toBeTruthy();
    });

    await writeRemoteAnnotation(session.id, {
      ...annotation,
      metadata: { ...annotation.metadata, label: "Updated pin" },
    });

    await waitFor(() => {
      expect(
        useAnnotationStore.getState().annotations[0]?.metadata.label,
      ).toBe("Updated pin");
    });
  });

  it("does not subscribe for local-only sessions", async () => {
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);
    const remoteAnnotation = createTestPinAnnotation({
      sessionId: session.id,
      id: "ann-local-skip",
    });

    useSessionStore.getState().setSession({
      id: LOCAL_SESSION_ID,
      code: "WXYZ",
      gameArea: DUBLIN_CITY_GAME_AREA,
      createdAt: session.createdAt,
      memberUids: [],
    });
    renderHook(() => useSessionSync());

    await writeRemoteAnnotation(session.id, remoteAnnotation);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(
      useAnnotationStore
        .getState()
        .annotations.some((item) => item.id === remoteAnnotation.id),
    ).toBe(false);
  });
});
