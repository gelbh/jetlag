import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirebaseError } from "firebase/app";
import type { Firestore } from "firebase/firestore";
import {
  selectFailedEntries,
  selectPendingCount,
  useWriteLedgerStore,
} from "@/state/writeLedgerStore";
import { addWriteRejectedBreadcrumb } from "@/services/core/analytics/sentry";
import { commitWrite, trackRestoredWrites } from "./commitWrite";

vi.mock("@/services/core/analytics/sentry", () => ({
  addWriteRejectedBreadcrumb: vi.fn(),
}));

const waitForPendingWrites = vi.hoisted(() => vi.fn());
vi.mock("firebase/firestore", () => ({ waitForPendingWrites }));

describe("commitWrite", () => {
  beforeEach(() => {
    useWriteLedgerStore.setState({ entries: {} });
    vi.mocked(addWriteRejectedBreadcrumb).mockClear();
  });

  it("returns synchronously and tracks pending until ack", async () => {
    let resolve!: () => void;
    const { acknowledged } = commitWrite(
      "chat.send",
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(1);
    resolve();
    await acknowledged;
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(0);
  });

  it("records rejection as failed and does not throw unhandled", async () => {
    const { acknowledged } = commitWrite("found.confirm", () =>
      Promise.reject(new FirebaseError("permission-denied", "nope")),
    );
    await expect(acknowledged).rejects.toThrow();
    const failed = selectFailedEntries(useWriteLedgerStore.getState());
    expect(failed[0]?.label).toBe("found.confirm");
    expect(addWriteRejectedBreadcrumb).toHaveBeenCalledWith(
      "found.confirm",
      expect.any(FirebaseError),
    );
  });

  it("captures synchronous throws from run()", async () => {
    const { acknowledged } = commitWrite("chat.send", () => {
      throw new Error("boom");
    });
    await expect(acknowledged).rejects.toThrow("boom");
    expect(selectFailedEntries(useWriteLedgerStore.getState())).toHaveLength(1);
  });
});

describe("trackRestoredWrites", () => {
  beforeEach(() => useWriteLedgerStore.setState({ entries: {} }));

  it("holds one pending entry until the SDK queue drains", async () => {
    let drain!: () => void;
    waitForPendingWrites.mockReturnValueOnce(
      new Promise<void>((r) => {
        drain = r;
      }),
    );
    trackRestoredWrites({} as Firestore);
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(1);
    drain();
    await Promise.resolve();
    await Promise.resolve();
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(0);
  });

  it("settles (never fails) when waiting rejects", async () => {
    waitForPendingWrites.mockReturnValueOnce(Promise.reject(new Error("x")));
    trackRestoredWrites({} as Firestore);
    await Promise.resolve();
    await Promise.resolve();
    expect(useWriteLedgerStore.getState().entries).toEqual({});
  });
});
