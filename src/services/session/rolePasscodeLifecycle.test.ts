import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  initSessionRoleGates,
  joinSessionWithRole,
  leaveSessionMembership,
  mapRolePasscodeJoinError,
  regenerateRolePasscode,
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

describe("rolePasscodeLifecycle", () => {
  beforeEach(() => {
    httpsCallable.mockReset();
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

  it("calls initSessionRoleGates for host bootstrap", async () => {
    const callable = vi.fn(async () => ({
      data: { observerPasscode: "OBSV", rolePasscode: "SEEK" },
    }));
    httpsCallable.mockReturnValue(callable);

    const result = await initSessionRoleGates("sess-1");

    expect(httpsCallable).toHaveBeenCalledWith({}, "initSessionRoleGates");
    expect(result.observerPasscode).toBe("OBSV");
  });

  it("maps wrong role code errors to player copy", () => {
    expect(
      mapRolePasscodeJoinError(new Error("permission-denied Wrong role code.")),
    ).toContain("Wrong role code");
  });
});
