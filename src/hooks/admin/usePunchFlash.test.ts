import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PUNCH_FLASH_MS, usePunchFlash } from "./usePunchFlash";

type Row = { sessionId: string; lastActivityAt: string | null };

const initial: Row[] = [
  { sessionId: "s1", lastActivityAt: "2026-10-12T10:00:00.000Z" },
  { sessionId: "s2", lastActivityAt: "2026-10-12T10:05:00.000Z" },
  { sessionId: "s3", lastActivityAt: null },
];

function withActivity(rows: Row[], sessionId: string, lastActivityAt: string | null): Row[] {
  return rows.map((row) => (row.sessionId === sessionId ? { ...row, lastActivityAt } : row));
}

function renderPunchFlash() {
  return renderHook(({ sessions }) => usePunchFlash(sessions), {
    initialProps: { sessions: initial },
  });
}

describe("usePunchFlash", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns an empty set on the first render", () => {
    const { result } = renderPunchFlash();

    expect([...result.current]).toEqual([]);
  });

  it("flashes only the session whose lastActivityAt advanced", () => {
    const { result, rerender } = renderPunchFlash();

    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });

    expect([...result.current]).toEqual(["s1"]);
  });

  it("flashes a known session whose lastActivityAt goes from null to a timestamp", () => {
    const { result, rerender } = renderPunchFlash();

    rerender({ sessions: withActivity(initial, "s3", "2026-10-12T10:01:00.000Z") });

    expect([...result.current]).toEqual(["s3"]);
  });

  it("does not flash a session that first appears after mount", () => {
    const { result, rerender } = renderPunchFlash();

    rerender({
      sessions: [...initial, { sessionId: "s4", lastActivityAt: "2026-10-12T11:00:00.000Z" }],
    });

    expect([...result.current]).toEqual([]);
  });

  it("does not flash an equal or earlier lastActivityAt", () => {
    const { result, rerender } = renderPunchFlash();

    rerender({ sessions: initial.map((row) => ({ ...row })) });
    rerender({ sessions: withActivity(initial, "s2", "2026-10-12T09:00:00.000Z") });

    expect([...result.current]).toEqual([]);
  });

  it("does not flash an unparsable lastActivityAt", () => {
    const { result, rerender } = renderPunchFlash();

    rerender({ sessions: withActivity(initial, "s1", "not a date") });

    expect([...result.current]).toEqual([]);
  });

  it("keeps the same set instance across re-renders with no change", () => {
    const { result, rerender } = renderPunchFlash();
    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });
    const flashed = result.current;

    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });

    expect(result.current).toBe(flashed);
  });

  it("removes the id after PUNCH_FLASH_MS", () => {
    const { result, rerender } = renderPunchFlash();
    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });

    act(() => {
      vi.advanceTimersByTime(PUNCH_FLASH_MS);
    });

    expect([...result.current]).toEqual([]);
  });

  it("restarts the window when the session punches again inside it", () => {
    const { result, rerender } = renderPunchFlash();
    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:02:00.000Z") });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect([...result.current]).toEqual(["s1"]);

    act(() => {
      vi.advanceTimersByTime(PUNCH_FLASH_MS - 20_000);
    });
    expect([...result.current]).toEqual([]);
  });

  it("clears pending timers on unmount", () => {
    const { rerender, unmount } = renderPunchFlash();
    rerender({ sessions: withActivity(initial, "s1", "2026-10-12T10:01:00.000Z") });

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
