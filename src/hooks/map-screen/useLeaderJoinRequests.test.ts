import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaderJoinRequests } from "./useLeaderJoinRequests";
import type { RoleJoinRequest } from "../../domain/session/players/joinRequest";

vi.mock("../../services/session/joinRequestListen");
vi.mock("../../services/session/rolePasscodeLifecycle");

const mockListenLeaderJoinRequests = vi.mocked(
  await import("../../services/session/joinRequestListen").then(
    (m) => m.listenLeaderJoinRequests,
  ),
);

const mockResolveRoleJoinRequest = vi.mocked(
  await import("../../services/session/rolePasscodeLifecycle").then(
    (m) => m.resolveRoleJoinRequest,
  ),
);

describe("useLeaderJoinRequests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListenLeaderJoinRequests.mockReturnValue(() => undefined);
    mockResolveRoleJoinRequest.mockResolvedValue({ ok: true });
  });

  it("returns empty when no sessionId", () => {
    const { result } = renderHook(() =>
      useLeaderJoinRequests({
        sessionId: null,
        roleGates: null,
        myUid: "host",
        isHost: true,
      }),
    );

    expect(result.current.pendingJoinRequest).toBeNull();
    expect(result.current.joinRequestBusy).toBe(false);
  });

  it("listens for requests when enabled", () => {
    renderHook(() =>
      useLeaderJoinRequests({
        sessionId: "sess-1",
        roleGates: { version: 1, leaders: { seeker: "leader-1" } },
        myUid: "leader-1",
        isHost: false,
      }),
    );

    expect(mockListenLeaderJoinRequests).toHaveBeenCalledWith(
      "sess-1",
      ["seeker"],
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("filters expired requests from pending", () => {
    let setRequests: ((reqs: RoleJoinRequest[]) => void) | null = null;
    mockListenLeaderJoinRequests.mockImplementation(
      (_sessionId, _roles, onRequests) => {
        setRequests = onRequests;
        return () => undefined;
      },
    );

    const { result } = renderHook(() =>
      useLeaderJoinRequests({
        sessionId: "sess-1",
        roleGates: { version: 1, leaders: { seeker: "leader-1" } },
        myUid: "leader-1",
        isHost: false,
      }),
    );

    const expiredRequest: RoleJoinRequest = {
      id: "req-1",
      sessionId: "sess-1",
      requesterUid: "guest",
      role: "seeker",
      status: "pending",
      identityLabel: "ada",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2026-08-03T12:05:00.000Z",
    };

    const freshRequest: RoleJoinRequest = {
      id: "req-2",
      sessionId: "sess-1",
      requesterUid: "guest2",
      role: "seeker",
      status: "pending",
      identityLabel: "bob",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };

    act(() => {
      setRequests?.([expiredRequest, freshRequest]);
    });

    expect(result.current.pendingJoinRequest?.id).toBe("req-2");
  });

  it("accepts join request", async () => {
    let setRequests: ((reqs: RoleJoinRequest[]) => void) | null = null;
    mockListenLeaderJoinRequests.mockImplementation(
      (_sessionId, _roles, onRequests) => {
        setRequests = onRequests;
        return () => undefined;
      },
    );

    const { result } = renderHook(() =>
      useLeaderJoinRequests({
        sessionId: "sess-1",
        roleGates: { version: 1, leaders: { seeker: "leader-1" } },
        myUid: "leader-1",
        isHost: false,
      }),
    );

    const request: RoleJoinRequest = {
      id: "req-1",
      sessionId: "sess-1",
      requesterUid: "guest",
      role: "seeker",
      status: "pending",
      identityLabel: "ada",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };

    act(() => {
      setRequests?.([request]);
    });

    await act(async () => {
      result.current.handleAcceptJoinRequest();
    });

    expect(mockResolveRoleJoinRequest).toHaveBeenCalledWith(
      "sess-1",
      "req-1",
      "accept",
    );
  });

  it("declines join request", async () => {
    let setRequests: ((reqs: RoleJoinRequest[]) => void) | null = null;
    mockListenLeaderJoinRequests.mockImplementation(
      (_sessionId, _roles, onRequests) => {
        setRequests = onRequests;
        return () => undefined;
      },
    );

    const { result } = renderHook(() =>
      useLeaderJoinRequests({
        sessionId: "sess-1",
        roleGates: { version: 1, leaders: { seeker: "leader-1" } },
        myUid: "leader-1",
        isHost: false,
      }),
    );

    const request: RoleJoinRequest = {
      id: "req-1",
      sessionId: "sess-1",
      requesterUid: "guest",
      role: "seeker",
      status: "pending",
      identityLabel: "ada",
      createdAt: "2026-08-03T12:00:00.000Z",
      expiresAt: "2099-01-01T00:00:00.000Z",
    };

    act(() => {
      setRequests?.([request]);
    });

    await act(async () => {
      result.current.handleDeclineJoinRequest();
    });

    expect(mockResolveRoleJoinRequest).toHaveBeenCalledWith(
      "sess-1",
      "req-1",
      "decline",
    );
  });
});
