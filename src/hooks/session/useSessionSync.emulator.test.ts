// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectEmulatorsForTests,
  teardownEmulatorsForTests,
} from "../../test/emulator/connectEmulators";
import { DUBLIN_CITY_GAME_AREA } from "../../test/fixtures/dublinGameArea";
import { createTestPinAnnotation } from "../../test/fixtures/sessions";
import * as firestoreAnnotations from "../../services/firestore/firestoreAnnotations";
import {
  createRemoteSession,
  writeRemoteAnnotation,
} from "../../services/firestore/firestoreAnnotations";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import { useSessionSync } from "./useSessionSync";

describe("useSessionSync emulator", () => {
  let testUid: string;

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

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
        useAnnotationStore.getState().annotations[0]?.metadata.label,
      ).toBe("Test pin");
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

  it("waits for syncEnabled before subscribing to annotations", async () => {
    const subscribeSpy = vi.spyOn(
      firestoreAnnotations,
      "subscribeToRemoteAnnotations",
    );
    const session = await createRemoteSession(DUBLIN_CITY_GAME_AREA, testUid);
    const annotation = createTestPinAnnotation({
      id: "ann-sync-gated",
      sessionId: session.id,
    });
    const staleAnnotation = createTestPinAnnotation({
      id: "ann-stale",
      sessionId: "other-session",
    });

    await writeRemoteAnnotation(session.id, annotation);
    useSessionStore.getState().setSession(session, testUid);
    useAnnotationStore.setState({
      annotations: [staleAnnotation],
      redoAnnotationIds: [],
      selectedAnnotationId: null,
      geometryEditAnnotationId: null,
      pulsingAnnotationIds: [],
    });

    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useSessionSync({ syncEnabled: enabled }),
      { initialProps: { enabled: false } },
    );

    expect(subscribeSpy).not.toHaveBeenCalled();
    expect(useAnnotationStore.getState().annotations).toHaveLength(1);

    rerender({ enabled: true });

    await waitFor(() => {
      expect(subscribeSpy).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(useAnnotationStore.getState().annotations).toHaveLength(1);
      expect(
        useAnnotationStore
          .getState()
          .annotations.find((item) => item.id === annotation.id),
      ).toBeDefined();
      expect(
        useAnnotationStore
          .getState()
          .annotations.some((item) => item.id === staleAnnotation.id),
      ).toBe(false);
    });

    const afterEnableCount = subscribeSpy.mock.calls.length;
    rerender({ enabled: false });

    const blockedAnnotation = createTestPinAnnotation({
      id: "ann-sync-gated-blocked",
      sessionId: session.id,
    });
    await writeRemoteAnnotation(session.id, blockedAnnotation);

    await waitFor(() => {
      expect(subscribeSpy.mock.calls.length).toBe(afterEnableCount);
      expect(
        useAnnotationStore
          .getState()
          .annotations.some((item) => item.id === blockedAnnotation.id),
      ).toBe(false);
    });
  });

  it("does not subscribe for local-only sessions", async () => {
    const subscribeSpy = vi.spyOn(
      firestoreAnnotations,
      "subscribeToRemoteAnnotations",
    );
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

    expect(subscribeSpy).not.toHaveBeenCalled();

    await writeRemoteAnnotation(session.id, remoteAnnotation);

    await waitFor(() => {
      expect(
        useAnnotationStore
          .getState()
          .annotations.some((item) => item.id === remoteAnnotation.id),
      ).toBe(false);
    });
  });
});
