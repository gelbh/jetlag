import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MapTool } from "../../../domain/map/mapToolTypes";
import { useMapStore } from "../../../state/mapStore";
import { useToolSession } from "./useToolSession";

interface DemoConfig {
  value: number;
  label: string;
}

function setActiveTool(tool: MapTool) {
  act(() => {
    useMapStore.getState().setActiveTool(tool);
  });
}

describe("useToolSession", () => {
  beforeEach(() => {
    useMapStore.getState().setActiveTool("none");
  });

  it("opens into configuring when the tool becomes active", () => {
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
        createInitialConfig: () => ({ value: 1, label: "a" }),
        onSubmit: async () => undefined,
      }),
    );

    expect(result.current.phase).toBe("idle");
    expect(result.current.config).toBeNull();

    setActiveTool("radar");

    expect(result.current.phase).toBe("configuring");
    expect(result.current.config).toEqual({ value: 1, label: "a" });
  });

  it("starts open when mounted while the tool is active", () => {
    useMapStore.getState().setActiveTool("radar");
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
        createInitialConfig: () => ({ value: 1, label: "a" }),
        onSubmit: async () => undefined,
      }),
    );

    expect(result.current.phase).toBe("configuring");
    expect(result.current.config).toEqual({ value: 1, label: "a" });
  });

  it("never renders the newly active tool with stale idle state", () => {
    const phases: string[] = [];
    renderHook(() => {
      const tool = useMapStore((state) => state.activeTool);
      const session = useToolSession<DemoConfig>({
        toolId: "radar",
        createInitialConfig: () => ({ value: 1, label: "a" }),
        onSubmit: async () => undefined,
      });
      phases.push(`${tool}:${session.phase}`);
      return session;
    });

    setActiveTool("radar");
    setActiveTool("none");

    expect(phases).not.toContain("radar:idle");
    expect(phases).not.toContain("none:configuring");
  });

  it("submits through onSubmit and returns to configuring", async () => {
    useMapStore.getState().setActiveTool("radar");
    const onSubmit = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
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
    useMapStore.getState().setActiveTool("radar");
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
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

  it("re-opens after onSubmit closes the tool mid-submit", async () => {
    useMapStore.getState().setActiveTool("radar");
    const onSubmit = vi.fn(async () => {
      useMapStore.getState().setActiveTool("none");
    });
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
        createInitialConfig: () => ({ value: 1, label: "a" }),
        onSubmit,
      }),
    );

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.phase).toBe("idle");

    setActiveTool("radar");
    expect(result.current.config).toEqual({ value: 1, label: "a" });

    await act(async () => {
      await result.current.submit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it("submits right after reopening, before effects flush", async () => {
    useMapStore.getState().setActiveTool("radar");
    const onSubmit = vi.fn(async () => undefined);
    const { result } = renderHook(() =>
      useToolSession<DemoConfig>({
        toolId: "radar",
        createInitialConfig: () => ({ value: 1, label: "a" }),
        onSubmit,
      }),
    );

    await act(async () => {
      useMapStore.getState().setActiveTool("none");
      useMapStore.getState().setActiveTool("radar");
      await result.current.submit();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it.each(["resolve", "reject"] as const)(
    "ignores a stale submit that settles (%s) after close and reopen",
    async (outcome) => {
      useMapStore.getState().setActiveTool("radar");
      let settle: { resolve: () => void; reject: (error: Error) => void } | undefined;
      const onSubmit = vi.fn(async () => undefined);
      onSubmit.mockImplementationOnce(
        () =>
          new Promise<undefined>((resolve, reject) => {
            settle = { resolve: () => resolve(undefined), reject };
          }),
      );
      const { result } = renderHook(() =>
        useToolSession<DemoConfig>({
          toolId: "radar",
          createInitialConfig: () => ({ value: 1, label: "a" }),
          onSubmit,
        }),
      );

      let stale: Promise<void> | undefined;
      act(() => {
        stale = result.current.submit();
      });
      setActiveTool("none");
      setActiveTool("radar");
      await act(async () => {
        if (outcome === "resolve") {
          settle?.resolve();
        } else {
          settle?.reject(new Error("stale"));
        }
        await stale;
      });

      expect(result.current.phase).toBe("configuring");
      expect(result.current.config).toEqual({ value: 1, label: "a" });
      expect(result.current.error).toBeNull();

      await act(async () => {
        await result.current.submit();
      });
      expect(onSubmit).toHaveBeenCalledTimes(2);
    },
  );
});
