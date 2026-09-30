import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { showEphemeralPlayerNotification } from "@/components/ui/notifications/showEphemeralPlayerNotification";
import { useWriteLedgerStore } from "@/state/writeLedgerStore";
import { WriteFailureNotifier } from "./WriteFailureNotifier";

vi.mock("@/components/ui/notifications/showEphemeralPlayerNotification", () => ({
  showEphemeralPlayerNotification: vi.fn(),
}));

describe("WriteFailureNotifier", () => {
  beforeEach(() => {
    useWriteLedgerStore.setState({ entries: {} });
    vi.mocked(showEphemeralPlayerNotification).mockClear();
  });

  it("notifies once per rejected write and dismisses it", () => {
    render(<WriteFailureNotifier />);
    act(() => {
      const { begin, fail } = useWriteLedgerStore.getState();
      fail(begin("chat.send"), "permission-denied");
    });

    expect(showEphemeralPlayerNotification).toHaveBeenCalledTimes(1);
    expect(showEphemeralPlayerNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Your message didn't sync" }),
    );
    expect(useWriteLedgerStore.getState().entries).toEqual({});
  });

  it("ignores pending writes", () => {
    render(<WriteFailureNotifier />);
    act(() => {
      const { begin, fail } = useWriteLedgerStore.getState();
      begin("chat.send");
      fail(begin("economy.update"), "failed-precondition");
    });

    expect(showEphemeralPlayerNotification).toHaveBeenCalledTimes(1);
    expect(showEphemeralPlayerNotification).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Card change didn't sync" }),
    );
    expect(Object.values(useWriteLedgerStore.getState().entries)).toHaveLength(1);
  });
});
