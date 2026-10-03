import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CYCLE_THROTTLE_MS, STUCK_CACHE_MS } from "@/domain/device/sync/recoveryPolicy";
import { useSessionStore } from "@/state/sessionStore";
import { useWriteLedgerStore } from "@/state/writeLedgerStore";
import { LIE_FI_CHECK_INTERVAL_MS, useConnectionRecovery } from "./useConnectionRecovery";

const firestoreMocks = vi.hoisted(() => ({
  disableNetwork: vi.fn(() => Promise.resolve()),
  enableNetwork: vi.fn(() => Promise.resolve()),
}));

vi.mock("firebase/firestore", () => firestoreMocks);
vi.mock("@/services/core/firebase/firebase", () => ({
  getFirestoreDb: () => ({ fake: "db" }),
}));

const { disableNetwork, enableNetwork } = firestoreMocks;

type Props = { enabled: boolean; reachable: boolean | null; probeNow: () => void };

function setFromCache(value: boolean) {
  act(() => {
    useSessionStore.getState().setSessionFromCache(value);
  });
}

function render(initial: Partial<Props> = {}) {
  const probeNow = vi.fn();
  const props: Props = { enabled: true, reachable: true, probeNow, ...initial };
  const hook = renderHook((p: Props) => useConnectionRecovery(p.enabled, p.reachable, p.probeNow), {
    initialProps: props,
  });
  return { ...hook, probeNow, props };
}

describe("useConnectionRecovery — Firestore network cycle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    disableNetwork.mockClear();
    enableNetwork.mockClear();
    useSessionStore.setState({ sessionFromCache: false });
    useWriteLedgerStore.setState({ entries: {} });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("cycles once after the session listener stays cached for 5 s while reachable", async () => {
    render();
    setFromCache(true);

    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS - 1));
    expect(disableNetwork).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(disableNetwork).toHaveBeenCalledTimes(1);
    expect(enableNetwork).toHaveBeenCalledTimes(1);
    expect(disableNetwork.mock.invocationCallOrder[0]).toBeLessThan(
      enableNetwork.mock.invocationCallOrder[0] ?? 0,
    );

    // Still stuck: no further cycle without a new transition.
    await act(() => vi.advanceTimersByTimeAsync(CYCLE_THROTTLE_MS * 3));
    expect(disableNetwork).toHaveBeenCalledTimes(1);
  });

  it("does not cycle when the listener goes live before the threshold", async () => {
    render();
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS - 1_000));
    setFromCache(false);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS * 4));
    expect(disableNetwork).not.toHaveBeenCalled();
  });

  it("never cycles while unreachable or unknown", async () => {
    const { rerender, props } = render({ reachable: false });
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS * 4));
    rerender({ ...props, reachable: null });
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS * 4));
    expect(disableNetwork).not.toHaveBeenCalled();
  });

  it("never cycles while disabled", async () => {
    render({ enabled: false });
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS * 4));
    expect(disableNetwork).not.toHaveBeenCalled();
  });

  it("cycles as soon as reachability returns for an already-stuck listener", async () => {
    const { rerender, props } = render({ reachable: false });
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS * 2));
    expect(disableNetwork).not.toHaveBeenCalled();

    rerender({ ...props, reachable: true });
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(disableNetwork).toHaveBeenCalledTimes(1);
  });

  it("throttles repeat cycles to once per 30 s across stuck episodes", async () => {
    const { rerender, props } = render();
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS));
    expect(disableNetwork).toHaveBeenCalledTimes(1);

    // Flap reachability: new episode, but inside the throttle window.
    rerender({ ...props, reachable: false });
    rerender({ ...props, reachable: true });
    await act(() => vi.advanceTimersByTimeAsync(CYCLE_THROTTLE_MS - 1));
    expect(disableNetwork).toHaveBeenCalledTimes(1);

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(disableNetwork).toHaveBeenCalledTimes(2);
  });

  it("re-enables the network if disableNetwork rejects", async () => {
    disableNetwork.mockImplementationOnce(() => Promise.reject(new Error("boom")));
    render();
    setFromCache(true);
    await act(() => vi.advanceTimersByTimeAsync(STUCK_CACHE_MS));
    expect(enableNetwork).toHaveBeenCalledTimes(1);
  });
});

describe("useConnectionRecovery — lie-fi probe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    useSessionStore.setState({ sessionFromCache: false });
    useWriteLedgerStore.setState({ entries: {} });
    vi.stubGlobal("navigator", { ...navigator, onLine: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("probes once a write has been unacked for more than 8 s", async () => {
    const { probeNow } = render();
    act(() => {
      useWriteLedgerStore.getState().begin("chat.send");
    });

    await act(() => vi.advanceTimersByTimeAsync(LIE_FI_CHECK_INTERVAL_MS * 2));
    expect(probeNow).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(LIE_FI_CHECK_INTERVAL_MS));
    expect(probeNow).toHaveBeenCalledTimes(1);
  });

  it("does not probe without pending writes", async () => {
    const { probeNow } = render();
    await act(() => vi.advanceTimersByTimeAsync(LIE_FI_CHECK_INTERVAL_MS * 5));
    expect(probeNow).not.toHaveBeenCalled();
  });

  it("does not fast-probe when already known unreachable or OS-offline", async () => {
    const { probeNow, rerender, props } = render({ reachable: false });
    act(() => {
      useWriteLedgerStore.getState().begin("chat.send");
    });
    await act(() => vi.advanceTimersByTimeAsync(LIE_FI_CHECK_INTERVAL_MS * 5));
    expect(probeNow).not.toHaveBeenCalled();

    vi.stubGlobal("navigator", { ...navigator, onLine: false });
    rerender({ ...props, reachable: true });
    await act(() => vi.advanceTimersByTimeAsync(LIE_FI_CHECK_INTERVAL_MS * 5));
    expect(probeNow).not.toHaveBeenCalled();
  });
});
