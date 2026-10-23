import { beforeEach, describe, expect, it, vi } from "vitest";

const { joinSessionWithRole, getDocFromServer } = vi.hoisted(() => ({
  joinSessionWithRole: vi.fn(),
  getDocFromServer: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDocFromServer,
}));

vi.mock("../core/firebase/firebase", () => ({ getFirestoreDb: () => ({}) }));

vi.mock("../session/rolePasscodeLifecycle", () => ({
  joinSessionWithRole,
  mapRolePasscodeJoinError: (error: unknown) =>
    error instanceof Error ? error.message : "Couldn't join the session.",
}));

vi.mock("./serialization/serializeSession", () => ({
  deserializeSessionFromFirestore: (id: string, data: Record<string, unknown>) => ({ id, ...data }),
}));

import { hashHealSecret } from "../../domain/session/join/healSecret";
import { useSessionStore } from "../../state/sessionStore";
import { joinGatedRemoteSessionByCode } from "./joinGatedRemoteSession";

function joinInput(overrides: Partial<Parameters<typeof joinGatedRemoteSessionByCode>[0]> = {}) {
  return {
    code: "ABCD",
    codeRecord: { sessionId: "session-1", hostUid: "host-1" },
    role: "seeker" as const,
    clientVersion: "0.2.0",
    lookupRemoteSessionByCode: vi.fn(),
    touchSessionLastActive: vi.fn(),
    ...overrides,
  };
}

describe("joinGatedRemoteSessionByCode heal proof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSessionStore.setState({ healSecrets: {} });
    joinSessionWithRole.mockResolvedValue({ sessionId: "session-1" });
    getDocFromServer.mockResolvedValue({
      exists: () => true,
      id: "session-1",
      data: () => ({ code: "ABCD", memberUids: ["new-uid"] }),
    });
  });

  it("sends a fresh proof hash on a first join and stores its secret after success", async () => {
    await joinGatedRemoteSessionByCode(joinInput());

    const sent = joinSessionWithRole.mock.calls[0][0];
    const secret = useSessionStore.getState().healSecrets["session-1"];
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sent.proofHash).toBe(await hashHealSecret(secret));
    expect(sent.healSecret).toBeUndefined();
  });

  it("sends the stored secret and its hash on a heal", async () => {
    useSessionStore.getState().setHealSecret("session-1", "stored-secret");

    await joinGatedRemoteSessionByCode(
      joinInput({ returningMemberUid: "old-uid", persistedMyUid: "old-uid" }),
    );

    expect(joinSessionWithRole).toHaveBeenCalledWith(
      expect.objectContaining({
        healSecret: "stored-secret",
        proofHash: await hashHealSecret("stored-secret"),
      }),
    );
    expect(useSessionStore.getState().healSecrets).toEqual({ "session-1": "stored-secret" });
  });

  it("does not store a secret when the callable rejects", async () => {
    joinSessionWithRole.mockRejectedValue(new Error("Wrong role code."));

    await expect(joinGatedRemoteSessionByCode(joinInput())).rejects.toThrow("Wrong role code.");
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });

  it("joins without a proof when crypto.subtle is unavailable", async () => {
    vi.stubGlobal("crypto", { getRandomValues: crypto.getRandomValues.bind(crypto) });
    try {
      await joinGatedRemoteSessionByCode(
        joinInput({ returningMemberUid: "old-uid", persistedMyUid: "old-uid" }),
      );
    } finally {
      vi.unstubAllGlobals();
    }

    const sent = joinSessionWithRole.mock.calls[0][0];
    expect(sent.proofHash).toBeUndefined();
    expect(sent.healSecret).toBeUndefined();
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });
});
