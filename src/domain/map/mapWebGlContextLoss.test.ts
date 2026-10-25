import { describe, expect, it, vi } from "vitest";
import { attachMapWebGlContextLostListener } from "./mapWebGlContextLoss";

describe("mapWebGlContextLoss", () => {
  it("attachMapWebGlContextLostListener preventDefaults and notifies", () => {
    const canvas = document.createElement("canvas");
    const onLost = vi.fn();
    const detach = attachMapWebGlContextLostListener(canvas, onLost);

    const event = new Event("webglcontextlost", { cancelable: true });
    const prevented = !canvas.dispatchEvent(event);

    expect(prevented).toBe(true);
    expect(onLost).toHaveBeenCalledTimes(1);

    detach();
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    expect(onLost).toHaveBeenCalledTimes(1);
  });
});
