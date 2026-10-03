import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firestoreMocks = vi.hoisted(() => ({
  disableNetwork: vi.fn(() => Promise.resolve()),
  enableNetwork: vi.fn(() => Promise.resolve()),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({ fake: "db" }),
}));

const { disableNetwork, enableNetwork } = firestoreMocks;
const { cycleFirestoreNetwork } = await import("./networkCycle");

describe("cycleFirestoreNetwork", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    disableNetwork.mockReset().mockImplementation(() => Promise.resolve());
    enableNetwork.mockReset().mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("disables then enables", async () => {
    await expect(cycleFirestoreNetwork()).resolves.toBe(true);
    expect(disableNetwork).toHaveBeenCalledTimes(1);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
    expect(disableNetwork.mock.invocationCallOrder[0]).toBeLessThan(
      enableNetwork.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("still enables when disable rejects", async () => {
    disableNetwork.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    await cycleFirestoreNetwork();
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });

  it("retries enable with backoff until it succeeds", async () => {
    enableNetwork
      .mockImplementationOnce(() => Promise.reject(new Error("e1")))
      .mockImplementationOnce(() => Promise.reject(new Error("e2")));
    const done = cycleFirestoreNetwork();
    await vi.advanceTimersByTimeAsync(0);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(enableNetwork).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(enableNetwork).toHaveBeenCalledTimes(3);
    await expect(done).resolves.toBe(true);
  });

  it("drops an overlapping call", async () => {
    let releaseDisable: (() => void) | undefined;
    disableNetwork.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseDisable = resolve;
        }),
    );
    const first = cycleFirestoreNetwork();
    await expect(cycleFirestoreNetwork()).resolves.toBe(false);
    releaseDisable?.();
    await expect(first).resolves.toBe(true);
    expect(disableNetwork).toHaveBeenCalledTimes(1);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });
});
