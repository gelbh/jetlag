import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelRoleJoinRequest,
  clearRolePasscodeRevealWarm,
  initSessionRoleGates,
  joinSessionWithRole,
  leaveSessionMembership,
  mapJoinRequestError,
  mapRolePasscodeJoinError,
  regenerateRolePasscode,
  requestRoleJoin,
  resolveRoleJoinRequest,
  revealRolePasscode,
} from "./rolePasscodeLifecycle";

const httpsCallable = vi.hoisted(() => vi.fn());

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

vi.mock("../core/firebase/firebase", () => ({
  isFirebaseConfigured: vi.fn(() => true),
  getFirebaseFunctions: vi.fn(async () => ({})),
}));

vi.mock("../../domain/device/changelog", () => ({
  APP_VERSION: "0.9.9-test",
}));

describe("rolePasscodeLifecycle", () => {
  beforeEach(() => {
    httpsCallable.mockReset();
    clearRolePasscodeRevealWarm();
  });

  it("calls joinSessionWithRole with the join payload", async () => {
    const callable = vi.fn(async () => ({
      data: { sessionId: "sess-1", becameLeader: true, rolePasscode: "ABCD" },
    }));
    httpsCallable.mockReturnValue(callable);

    const result = await joinSessionWithRole({
      code: "WXYZ",
      role: "seeker",
      clientVersion: "0.2.0",
    });

    expect(httpsCallable).toHaveBeenCalledWith({}, "joinSessionWithRole");
    expect(callable).toHaveBeenCalledWith({
      code: "WXYZ",
      role: "seeker",
      clientVersion: "0.2.0",
    });
    expect(result.sessionId).toBe("sess-1");
  });

  it("calls leaveSessionMembership with session id", async () => {
    const callable = vi.fn(async () => ({ data: { ok: true } }));
    httpsCallable.mockReturnValue(callable);

    await leaveSessionMembership("sess-9");

    expect(httpsCallable).toHaveBeenCalledWith({}, "leaveSessionMembership");
    expect(callable).toHaveBeenCalledWith({ sessionId: "sess-9" });
  });

  it("calls reveal and regenerate role passcode callables", async () => {
    const reveal = vi.fn(async () => ({ data: { role: "observer", rolePasscode: "OBSV" } }));
    const regenerate = vi.fn(async () => ({ data: { role: "seeker", rolePasscode: "SEEK" } }));
    httpsCallable
      .mockReturnValueOnce(reveal)
      .mockReturnValueOnce(regenerate);

    await revealRolePasscode("sess-1", "observer");
    await regenerateRolePasscode("sess-1", "seeker");

    expect(reveal).toHaveBeenCalledWith({ sessionId: "sess-1", role: "observer" });
    expect(regenerate).toHaveBeenCalledWith({ sessionId: "sess-1", role: "seeker" });
  });

  it("coalesces in-flight reveal requests without durable memoization", async () => {
    let resolveReveal: ((value: { data: { role: "seeker"; rolePasscode: string } }) => void) | undefined;
    const reveal = vi.fn(
      () =>
        new Promise<{ data: { role: "seeker"; rolePasscode: string } }>((resolve) => {
          resolveReveal = resolve;
        }),
    );
    httpsCallable.mockReturnValue(reveal);

    const first = revealRolePasscode("sess-1", "seeker");
    const second = revealRolePasscode("sess-1", "seeker");
    await vi.waitFor(() => {
      expect(reveal).toHaveBeenCalledTimes(1);
    });

    resolveReveal?.({ data: { role: "seeker", rolePasscode: "ABCD" } });
    await expect(first).resolves.toEqual({ role: "seeker", rolePasscode: "ABCD" });
    await expect(second).resolves.toEqual({ role: "seeker", rolePasscode: "ABCD" });

    const revealAgain = vi.fn(async () => ({
      data: { role: "seeker" as const, rolePasscode: "EFGH" },
    }));
    httpsCallable.mockReturnValue(revealAgain);
    await expect(revealRolePasscode("sess-1", "seeker")).resolves.toEqual({
      role: "seeker",
      rolePasscode: "EFGH",
    });
    expect(revealAgain).toHaveBeenCalledTimes(1);
  });

  it("abandons warm reveal when regenerating so late prefetch cannot win", async () => {
    let resolvePrefetch: ((value: { data: { role: "seeker"; rolePasscode: string } }) => void) | undefined;
    const prefetchReveal = vi.fn(
      () =>
        new Promise<{ data: { role: "seeker"; rolePasscode: string } }>((resolve) => {
          resolvePrefetch = resolve;
        }),
    );
    const regenerate = vi.fn(async () => ({
      data: { role: "seeker" as const, rolePasscode: "NEW1" },
    }));
    const revealAfter = vi.fn(async () => ({
      data: { role: "seeker" as const, rolePasscode: "NEW1" },
    }));

    httpsCallable.mockReturnValueOnce(prefetchReveal);
    const warm = revealRolePasscode("sess-1", "seeker");
    await vi.waitFor(() => {
      expect(prefetchReveal).toHaveBeenCalledTimes(1);
    });

    httpsCallable.mockReturnValueOnce(regenerate);
    await expect(regenerateRolePasscode("sess-1", "seeker")).resolves.toEqual({
      role: "seeker",
      rolePasscode: "NEW1",
    });

    resolvePrefetch?.({ data: { role: "seeker", rolePasscode: "OLD1" } });
    await expect(warm).resolves.toEqual({ role: "seeker", rolePasscode: "OLD1" });

    httpsCallable.mockReturnValueOnce(revealAfter);
    await expect(revealRolePasscode("sess-1", "seeker")).resolves.toEqual({
      role: "seeker",
      rolePasscode: "NEW1",
    });
    expect(revealAfter).toHaveBeenCalledTimes(1);
  });

  it("calls initSessionRoleGates for host bootstrap", async () => {
    const callable = vi.fn(async () => ({
      data: { observerPasscode: "OBSV", rolePasscode: "SEEK" },
    }));
    httpsCallable.mockReturnValue(callable);

    const result = await initSessionRoleGates("sess-1");

    expect(httpsCallable).toHaveBeenCalledWith({}, "initSessionRoleGates");
    expect(result.observerPasscode).toBe("OBSV");
  });

  it("calls requestRoleJoin with session, role, and client version", async () => {
    const callable = vi.fn(async () => ({
      data: { requestId: "req-1", expiresAt: "2026-08-03T12:10:00.000Z" },
    }));
    httpsCallable.mockReturnValue(callable);

    const result = await requestRoleJoin("sess-1", "seeker");

    expect(httpsCallable).toHaveBeenCalledWith({}, "requestRoleJoin");
    expect(callable).toHaveBeenCalledWith({
      sessionId: "sess-1",
      role: "seeker",
      clientVersion: "0.9.9-test",
    });
    expect(result).toEqual({
      requestId: "req-1",
      expiresAt: "2026-08-03T12:10:00.000Z",
    });
  });

  it("calls cancel and resolve join-request callables", async () => {
    const cancel = vi.fn(async () => ({ data: { ok: true } }));
    const resolve = vi.fn(async () => ({ data: { ok: true } }));
    httpsCallable.mockReturnValueOnce(cancel).mockReturnValueOnce(resolve);

    await cancelRoleJoinRequest("sess-1", "req-9");
    await resolveRoleJoinRequest("sess-1", "req-9", "accept");

    expect(cancel).toHaveBeenCalledWith({
      sessionId: "sess-1",
      requestId: "req-9",
    });
    expect(resolve).toHaveBeenCalledWith({
      sessionId: "sess-1",
      requestId: "req-9",
      decision: "accept",
    });
  });

  it("maps wrong role code errors to player copy", () => {
    expect(
      mapRolePasscodeJoinError(new Error("permission-denied Wrong role code.")),
    ).toContain("Wrong role code");
  });

  it("maps empty-side join request errors to player copy", () => {
    expect(
      mapJoinRequestError(
        new Error("failed-precondition Join without a request — this side is empty."),
      ),
    ).toContain("empty");
  });
});
