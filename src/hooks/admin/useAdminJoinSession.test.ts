import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminJoinSession } from "./useAdminJoinSession";

const { joinRemoteSessionByCode, navigate, setSession, setPremiumApiContext } = vi.hoisted(() => ({
  joinRemoteSessionByCode: vi.fn(),
  navigate: vi.fn(),
  setSession: vi.fn(),
  setPremiumApiContext: vi.fn(),
}));

vi.mock("../../services/firestore/firestoreAnnotations", () => ({ joinRemoteSessionByCode }));
vi.mock("../../services/core/auth/premiumApiContext", () => ({ setPremiumApiContext }));
vi.mock("../navigation/useAppNavigate", () => ({ useAppNavigate: () => navigate }));
vi.mock("../billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({ user: { uid: "admin-1" } }),
}));
vi.mock("../../state/sessionStore", () => ({
  useSessionStore: (select: (state: { setSession: typeof setSession }) => unknown) =>
    select({ setSession }),
}));

const summary = { sessionId: "s1", code: "ABCD" };

describe("useAdminJoinSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins as admin and navigates to the map", async () => {
    const session = { id: "s1", memberRoles: { "admin-1": "admin" } };
    joinRemoteSessionByCode.mockResolvedValueOnce({ status: "joined", session });

    const { result } = renderHook(() => useAdminJoinSession());
    let joined: boolean | undefined;
    await act(async () => {
      joined = await result.current.joinSession(summary);
    });

    expect(joined).toBe(true);
    expect(setSession).toHaveBeenCalledWith(session, "admin-1");
    expect(navigate).toHaveBeenCalledWith("/map");
    expect(result.current.joiningCode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("returns false and refreshes when the session is missing", async () => {
    const onRefresh = vi.fn();
    joinRemoteSessionByCode.mockResolvedValueOnce({ status: "missing" });

    const { result } = renderHook(() => useAdminJoinSession({ onRefresh }));
    let joined: boolean | undefined;
    await act(async () => {
      joined = await result.current.joinSession(summary);
    });

    expect(joined).toBe(false);
    expect(onRefresh).toHaveBeenCalledWith({ background: true });
    expect(result.current.error).toBe("That session is no longer available.");
    expect(result.current.joiningCode).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("returns false with the error message when the join throws", async () => {
    joinRemoteSessionByCode.mockRejectedValueOnce(new Error("permission-denied"));

    const { result } = renderHook(() => useAdminJoinSession());
    let joined: boolean | undefined;
    await act(async () => {
      joined = await result.current.joinSession(summary);
    });

    expect(joined).toBe(false);
    expect(result.current.error).toBe("permission-denied");
    expect(result.current.joiningCode).toBeNull();
  });
});
