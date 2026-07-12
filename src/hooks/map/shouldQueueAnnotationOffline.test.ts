import { describe, expect, it, beforeEach } from "vitest";
import { useSessionStore } from "../../state/sessionStore";
import { shouldQueueAnnotationOffline } from "./shouldQueueAnnotationOffline";

describe("shouldQueueAnnotationOffline", () => {
  beforeEach(() => {
    useSessionStore.setState({ networkReachable: null });
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
  });

  it("queues when the browser is offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });

    expect(shouldQueueAnnotationOffline()).toBe(true);
  });

  it("queues when online but reachability probe failed", () => {
    useSessionStore.setState({ networkReachable: false });

    expect(shouldQueueAnnotationOffline()).toBe(true);
  });

  it("does not queue when online and reachability is unknown", () => {
    expect(shouldQueueAnnotationOffline()).toBe(false);
  });
});
