import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSupportThread } from "./useSupportThread";

const postSupportAgentTurn = vi.hoisted(() => vi.fn());

vi.mock("../../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => true,
}));

vi.mock("../../services/firestore/firestoreIncidents", () => ({
  subscribeIncident: vi.fn(() => () => {}),
}));

vi.mock("../../services/firestore/firestoreIncidentThreads", () => ({
  subscribeSupportThreadMessages: vi.fn(() => () => {}),
}));

vi.mock("../../services/incident/incidentApi", () => ({
  postSupportAgentTurn,
}));

describe("useSupportThread", () => {
  it("keeps the summon id from a successful turn", async () => {
    postSupportAgentTurn.mockResolvedValueOnce({ summonId: "summon-1" });

    const { result } = renderHook(() => useSupportThread("inc-1"));

    await act(async () => {
      await result.current.sendTurn("hi");
    });
    expect(result.current.summonId).toBe("summon-1");
    expect(result.current.sending).toBe(false);
  });

  it("rethrows a failed turn and clears sending", async () => {
    postSupportAgentTurn.mockRejectedValueOnce(new Error("offline"));

    const { result } = renderHook(() => useSupportThread("inc-1"));

    await act(async () => {
      await expect(result.current.sendTurn("hi")).rejects.toThrow("offline");
    });
    expect(result.current.sending).toBe(false);
  });
});
