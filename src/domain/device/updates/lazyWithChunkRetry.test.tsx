import { act, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { lazyWithChunkRetry } from "./lazyWithChunkRetry";

function Route() {
  return <p>route</p>;
}

describe("lazyWithChunkRetry preload", () => {
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    container?.remove();
    container = undefined;
  });

  async function renderOnce(Lazy: ReturnType<typeof lazyWithChunkRetry>) {
    container = document.body.appendChild(document.createElement("div"));
    const root = createRoot(container);
    const fallbacks: string[] = [];
    function Fallback() {
      fallbacks.push("shown");
      return <p>fallback</p>;
    }
    await act(async () => {
      root.render(
        <Suspense fallback={<Fallback />}>
          <Lazy />
        </Suspense>,
      );
    });
    return { root, fallbacks };
  }

  it("renders a preloaded module without suspending (pins React.lazy sync thenables)", async () => {
    const importFn = vi.fn(async () => ({ default: Route }));
    const Lazy = lazyWithChunkRetry(importFn);

    await Lazy.preload();
    await Lazy.preload();
    const { root, fallbacks } = await renderOnce(Lazy);

    expect(fallbacks).toEqual([]);
    expect(container?.textContent).toBe("route");
    expect(importFn).toHaveBeenCalledTimes(1);
    root.unmount();
  });

  it("shares one import between a preload and the first render", async () => {
    let resolve: (value: { default: typeof Route }) => void = () => {};
    const importFn = vi.fn(
      () => new Promise<{ default: typeof Route }>((r) => (resolve = r)),
    );
    const Lazy = lazyWithChunkRetry(importFn);

    const preloaded = Lazy.preload();
    const { root } = await renderOnce(Lazy);
    await act(async () => {
      resolve({ default: Route });
      await preloaded;
    });

    expect(importFn).toHaveBeenCalledTimes(1);
    expect(container?.textContent).toBe("route");
    root.unmount();
  });

  it("retries the import after a failed preload", async () => {
    const importFn = vi
      .fn<() => Promise<{ default: typeof Route }>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ default: Route });
    const Lazy = lazyWithChunkRetry(importFn);

    await expect(Lazy.preload()).rejects.toThrow("offline");
    const { root } = await renderOnce(Lazy);

    expect(importFn).toHaveBeenCalledTimes(2);
    expect(container?.textContent).toBe("route");
    root.unmount();
  });
});
