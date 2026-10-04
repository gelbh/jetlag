import { describe, expect, it, vi } from "vitest";
import { installPreloadErrorRecovery } from "./preloadErrorRecovery";

function setup(online: boolean) {
  const target = new EventTarget();
  const state = { online };
  const recover = vi.fn(() => true);
  installPreloadErrorRecovery({
    target: target as unknown as Window,
    isOnline: () => state.online,
    recover,
    defer: (run) => run(),
  });
  const preloadError = () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    target.dispatchEvent(event);
    return event;
  };
  return { target, state, recover, preloadError };
}

describe("installPreloadErrorRecovery", () => {
  it("recovers right away when online without swallowing the import error", () => {
    const { recover, preloadError } = setup(true);
    const event = preloadError();
    expect(recover).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(false);
  });

  it("defers recovery to a later task so the import's own handler runs first", () => {
    const target = new EventTarget();
    const recover = vi.fn(() => true);
    const deferred: Array<() => void> = [];
    installPreloadErrorRecovery({
      target: target as unknown as Window,
      isOnline: () => true,
      recover,
      defer: (run) => deferred.push(run),
    });
    target.dispatchEvent(new Event("vite:preloadError", { cancelable: true }));
    expect(recover).not.toHaveBeenCalled();
    deferred.forEach((run) => run());
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("waits for the online event while offline", () => {
    const { recover, preloadError } = setup(false);
    preloadError();
    expect(recover).not.toHaveBeenCalled();
  });

  it("recovers exactly once on online, however many chunks failed offline", () => {
    const { target, state, recover, preloadError } = setup(false);
    preloadError();
    preloadError();
    preloadError();
    state.online = true;
    target.dispatchEvent(new Event("online"));
    target.dispatchEvent(new Event("online"));
    expect(recover).toHaveBeenCalledTimes(1);
  });

  it("waits again if the device drops offline after recovering", () => {
    const { target, recover, preloadError } = setup(false);
    preloadError();
    target.dispatchEvent(new Event("online"));
    preloadError();
    target.dispatchEvent(new Event("online"));
    expect(recover).toHaveBeenCalledTimes(2);
  });
});
