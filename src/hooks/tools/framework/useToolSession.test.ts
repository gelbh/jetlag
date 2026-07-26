import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useToolSession } from "./useToolSession";

interface DemoConfig {
  value: number;
  label: string;
}

describe("useToolSession", () => {
  it("opens into configuring when active becomes true", () => {
    const { result, rerender } = renderHook(
      ({ active }) =>
        useToolSession<DemoConfig>({
          toolId: "demo",
          active,
          createInitialConfig: () => ({ value: 1, label: "a" }),
          onSubmit: async () => undefined,
        }),
      { initialProps: { active: false } },
    );

    expect(result.current.phase).toBe("idle");
    expect(result.current.config).toBeNull();

    rerender({ active: true });

    expect(result.current.phase).toBe("configuring");
    expect(result.current.config).toEqual({ value: 1, label: "a" });
  });

  it("submits through onSubmit and returns to configuring", async () => {
    const onSubmit = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "demo",
        active: true,
        createInitialConfig: () => ({ value: 2, label: "b" }),
        onSubmit,
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      { value: 2, label: "b" },
      expect.objectContaining({ setResolving: expect.any(Function) }),
    );
    expect(result.current.phase).toBe("configuring");
    expect(result.current.isBusy).toBe(false);
  });

  it("enters error phase when onSubmit throws", async () => {
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "demo",
        active: true,
        createInitialConfig: () => ({ value: 3, label: "c" }),
        onSubmit: async () => {
          throw new Error("boom");
        },
      }),
    );

    await act(async () => {
      await result.current.submit();
    });

    expect(result.current.phase).toBe("error");
    expect(result.current.error).toBe("boom");
  });
});
