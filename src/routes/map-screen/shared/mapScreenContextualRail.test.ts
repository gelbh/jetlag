import { describe, expect, it, vi } from "vitest";
import { createMapScreenRailTabHandler } from "./mapScreenContextualRail";

describe("createMapScreenRailTabHandler", () => {
  it("routes each tab to the matching open action", () => {
    const onOpenSettings = vi.fn();
    const onOpenChat = vi.fn();
    const onOpenLog = vi.fn();
    const onOpenCodes = vi.fn();
    const handle = createMapScreenRailTabHandler({
      onOpenSettings,
      onOpenChat,
      onOpenLog,
      onOpenCodes,
    });

    handle("settings");
    handle("chat");
    handle("log");
    handle("codes");

    expect(onOpenSettings).toHaveBeenCalledOnce();
    expect(onOpenChat).toHaveBeenCalledOnce();
    expect(onOpenLog).toHaveBeenCalledOnce();
    expect(onOpenCodes).toHaveBeenCalledOnce();
  });

  it("no-ops optional settings when omitted", () => {
    const onOpenChat = vi.fn();
    const handle = createMapScreenRailTabHandler({
      onOpenChat,
      onOpenLog: vi.fn(),
      onOpenCodes: vi.fn(),
    });

    expect(() => handle("settings")).not.toThrow();
    expect(onOpenChat).not.toHaveBeenCalled();
  });
});
