import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDocFromServer, setDoc } = vi.hoisted(() => ({
  getDocFromServer: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => ({ path: segments.join("/") })),
  getDocFromServer,
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
    getDocFromServer.mockResolvedValue({ exists: () => false });

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
    getDocFromServer.mockResolvedValue({ exists: () => false });

    await ensureMemberProof("session-1", "uid-1");

    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ hash: await hashHealSecret("stored-secret") }),
    );
    expect(useSessionStore.getState().healSecrets).toEqual({ "session-1": "stored-secret" });
  });

  it("leaves an existing proof alone and reads it once per member", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => true });

    await ensureMemberProof("session-1", "uid-1");
    await ensureMemberProof("session-1", "uid-1");

    expect(getDocFromServer).toHaveBeenCalledTimes(1);
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("stores no secret when a proof exists and none was stored", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => true });

    await ensureMemberProof("session-1", "uid-1");

    expect(useSessionStore.getState().healSecrets).toEqual({});
  });

  it("re-reads for a different uid in the same session", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => true });

    await ensureMemberProof("session-1", "uid-1");
    await ensureMemberProof("session-1", "uid-2");

    expect(getDocFromServer).toHaveBeenCalledTimes(2);
  });

  it("swallows a denied create and keeps the stored secret for the next resume", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => false });
    setDoc.mockRejectedValue(new Error("permission-denied"));

    await expect(ensureMemberProof("session-1", "uid-1")).resolves.toBeUndefined();
    expect(useSessionStore.getState().healSecrets["session-1"]).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stores a new secret before writing its proof", async () => {
    getDocFromServer.mockResolvedValue({ exists: () => false });
    let storedAtWrite: string | undefined;
    setDoc.mockImplementation(async () => {
      storedAtWrite = useSessionStore.getState().healSecrets["session-1"];
    });

    await ensureMemberProof("session-1", "uid-1");

    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(storedAtWrite).toBe(useSessionStore.getState().healSecrets["session-1"]);
    expect(storedAtWrite).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("generates, stores and writes nothing when the server read fails", async () => {
    getDocFromServer.mockRejectedValue(new Error("unavailable"));

    await expect(ensureMemberProof("session-1", "uid-1")).resolves.toBeUndefined();
    expect(setDoc).not.toHaveBeenCalled();
    expect(useSessionStore.getState().healSecrets).toEqual({});

    getDocFromServer.mockResolvedValue({ exists: () => true });
    await ensureMemberProof("session-1", "uid-1");
    expect(getDocFromServer).toHaveBeenCalledTimes(2);
  });

  it("skips the proof when crypto.subtle is unavailable", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
      subtle: undefined,
    });
    getDocFromServer.mockResolvedValue({ exists: () => false });

    await expect(ensureMemberProof("session-1", "uid-1")).resolves.toBeUndefined();
    expect(getDocFromServer).not.toHaveBeenCalled();
    expect(setDoc).not.toHaveBeenCalled();
    expect(useSessionStore.getState().healSecrets).toEqual({});
  });
});
