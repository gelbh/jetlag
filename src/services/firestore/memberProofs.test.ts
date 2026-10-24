import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDoc, setDoc } = vi.hoisted(() => ({ getDoc: vi.fn(), setDoc: vi.fn() }));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  getDoc,
  setDoc,
}));

vi.mock("@/services/core/firebase/firebase", () => ({ getFirestoreDb: () => ({}) }));

import { hashHealSecret } from "@/domain/session/join/healSecret";
import { useSessionStore } from "@/state/sessionStore";
import { ensureMemberProof, resetMemberProofCacheForTests } from "./memberProofs";

describe("ensureMemberProof", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMemberProofCacheForTests();
    useSessionStore.setState({ healSecrets: {} });
    setDoc.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates a proof and stores a new secret when none exists", async () => {
    getDoc.mockResolvedValue({ exists: () => false });

    await ensureMemberProof("session-1", "uid-1");

    const secret = useSessionStore.getState().healSecrets["session-1"];
    expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(setDoc).toHaveBeenCalledWith(
      { path: "sessions/session-1/memberProofs/uid-1" },
      { hash: await hashHealSecret(secret), createdAt: expect.any(String) },
    );
  });

  it("reuses the stored secret when the proof is missing", async () => {
    useSessionStore.getState().setHealSecret("session-1", "stored-secret");
    getDoc.mockResolvedValue({ exists: () => false });

    await ensureMemberProof("session-1", "uid-1");

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hash: await hashHealSecret("stored-secret") }),
    );
    expect(useSessionStore.getState().healSecrets).toEqual({ "session-1": "stored-secret" });
  });

  it("leaves an existing proof alone and reads it once per member", async () => {
    getDoc.mockResolvedValue({ exists: () => true });

    await ensureMemberProof("session-1", "uid-1");
    await ensureMemberProof("session-1", "uid-1");

    expect(getDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("swallows a denied create without storing the secret", async () => {
    getDoc.mockResolvedValue({ exists: () => false });
    setDoc.mockRejectedValue(new Error("permission-denied"));

    await expect(ensureMemberProof("session-1", "uid-1")).resolves.toBeUndefined();
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });

  it("skips the proof when crypto.subtle is unavailable", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
      subtle: undefined,
    });
    getDoc.mockResolvedValue({ exists: () => false });

    await expect(ensureMemberProof("session-1", "uid-1")).resolves.toBeUndefined();
    expect(getDoc).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });
});
