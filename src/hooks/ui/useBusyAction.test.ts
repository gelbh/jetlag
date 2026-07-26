import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useBusyAction } from "./useBusyAction";

describe("useBusyAction", () => {
  it("sets busy during a delayed run and clears on resolve", async () => {
    const { result } = renderHook(() => useBusyAction());
    let resolve!: (value: string) => void;
    const pending = new Promise<string>((res) => {
      resolve = res;
    });

    let settled: Promise<string | undefined>;
    act(() => {
      settled = result.current.run(() => pending);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      resolve("ok");
      await settled!;
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("clears busy and surfaces error on reject", async () => {
    const { result } = renderHook(() => useBusyAction());

    await act(async () => {
      await result.current.run(async () => {
        throw new Error("boom");
      });
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.error?.message).toBe("boom");
  });

  it("ignores stale generation when a newer run is in flight", async () => {
    const { result } = renderHook(() => useBusyAction());
    let resolveFirst!: () => void;
    let resolveSecond!: () => void;
    const first = new Promise<void>((res) => {
      resolveFirst = res;
    });
    const second = new Promise<void>((res) => {
      resolveSecond = res;
    });

    act(() => {
      void result.current.run(() => first);
    });
    act(() => {
      void result.current.run(() => second);
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      resolveFirst();
      await Promise.resolve();
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      resolveSecond();
      await Promise.resolve();
    });
    expect(result.current.busy).toBe(false);
  });
});
