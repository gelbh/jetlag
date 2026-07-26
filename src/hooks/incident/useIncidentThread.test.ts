import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIncidentThread } from "./useIncidentThread";

const postIncidentMessage = vi.hoisted(() => vi.fn());

vi.mock("../../services/core/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("../../services/firestore/firestoreIncidents", () => ({
  subscribeIncident: vi.fn(() => () => {}),
  subscribeIncidentMessages: vi.fn(() => () => {}),
}));

vi.mock("../../services/incident/incidentApi", () => ({
  postIncidentMessage,
}));

describe("useIncidentThread", () => {
  beforeEach(() => {
    postIncidentMessage.mockReset();
  });

  it("ignores overlapping sendMessage calls while in flight", async () => {
    let resolvePost!: () => void;
    postIncidentMessage.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolvePost = resolve;
        }),
    );

    const { result } = renderHook(() => useIncidentThread("inc-1"));

    await act(async () => {
      void result.current.sendMessage("one");
      void result.current.sendMessage("two");
    });

    expect(postIncidentMessage).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePost();
    });
  });
});
