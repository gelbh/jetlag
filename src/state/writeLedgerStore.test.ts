import { beforeEach, describe, expect, it } from "vitest";
import {
  selectFailedEntries,
  selectOldestPendingAgeMs,
  selectPendingCount,
  useWriteLedgerStore,
} from "./writeLedgerStore";

describe("writeLedgerStore", () => {
  beforeEach(() => useWriteLedgerStore.setState({ entries: {} }));

  it("counts pending and drops settled", () => {
    const { begin, remove } = useWriteLedgerStore.getState();
    const a = begin("chat.send");
    begin("question.ask");
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(2);
    remove(a);
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(1);
  });

  it("keeps failures until dismissed", () => {
    const { begin, fail, remove } = useWriteLedgerStore.getState();
    const id = begin("found.confirm");
    fail(id, "permission-denied");
    expect(selectFailedEntries(useWriteLedgerStore.getState())).toHaveLength(1);
    expect(selectPendingCount(useWriteLedgerStore.getState())).toBe(0);
    remove(id);
    expect(selectFailedEntries(useWriteLedgerStore.getState())).toHaveLength(0);
  });

  it("ignores remove/fail for unknown ids without changing state", () => {
    const before = useWriteLedgerStore.getState().entries;
    const { remove, fail } = useWriteLedgerStore.getState();
    remove("missing");
    fail("missing", "x");
    expect(useWriteLedgerStore.getState().entries).toBe(before);
  });

  it("reports oldest pending age", () => {
    useWriteLedgerStore.setState({
      entries: {
        x: { id: "x", label: "chat.send", startedAt: 1000, status: "pending" },
        y: { id: "y", label: "chat.send", startedAt: 500, status: "failed", error: "x" },
      },
    });
    expect(selectOldestPendingAgeMs(useWriteLedgerStore.getState(), 9000)).toBe(
      8000,
    );
  });

  it("reports null age when nothing is pending", () => {
    expect(selectOldestPendingAgeMs(useWriteLedgerStore.getState(), 9000)).toBeNull();
  });
});
