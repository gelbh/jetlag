import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { createTestPinAnnotation, createTestSession } from "../../test/fixtures/sessions";
import { resetAllStores } from "../../test/helpers/storeReset";
import { useAnnotationStore, useSessionStore } from "../../state/sessionStore";
import { useAnnotations } from "./useAnnotations";

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

describe("useAnnotations", () => {
  beforeEach(() => {
    resetAllStores();
    useSessionStore.getState().setSession(createTestSession());
  });

  it("adds local annotations and increments pending writes for remote sessions", async () => {
    useSessionStore.getState().setSession(
      createTestSession({ id: "remote-1", code: "ABCD" }),
    );

    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    expect(useAnnotationStore.getState().annotations).toHaveLength(1);
  });

  it("supports undo for the active local session", async () => {
    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    act(() => {
      result.current.undoLastAnnotation();
    });

    expect(
      useAnnotationStore
        .getState()
        .annotations.every((annotation) => annotation.status === "deleted"),
    ).toBe(true);
  });

  it("skips remote persistence for local-only sessions", async () => {
    useSessionStore.getState().setSession(createTestSession({ id: LOCAL_SESSION_ID }));

    const { result } = renderHook(() => useAnnotations());

    await act(async () => {
      await result.current.createAnnotation({
        type: "pin",
        geometry: createTestPinAnnotation().geometry,
        metadata: createTestPinAnnotation().metadata,
      });
    });

    expect(useSessionStore.getState().pendingWrites).toBe(0);
  });
});
