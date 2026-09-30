import { afterEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({ configured: true }));

vi.mock("@/config/env", () => ({
  isFirebaseConfiguredFromEnv: () => env.configured,
}));

import {
  isAuthBootstrapReady,
  isFirebaseConfigured,
  markAuthBootstrapReady,
  resetAuthBootstrapStateForTests,
  subscribeAuthBootstrapReady,
} from "./authBootstrapState";

describe("authBootstrapState", () => {
  afterEach(() => {
    env.configured = true;
    resetAuthBootstrapStateForTests();
  });

  it("is always ready when Firebase is not configured", () => {
    env.configured = false;
    expect(isFirebaseConfigured()).toBe(false);
    expect(isAuthBootstrapReady()).toBe(true);
  });

  it("notifies subscribers once when marked ready", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuthBootstrapReady(listener);
    expect(isAuthBootstrapReady()).toBe(false);

    markAuthBootstrapReady();
    markAuthBootstrapReady();

    expect(isAuthBootstrapReady()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops notifying after unsubscribe and resets for tests", () => {
    const listener = vi.fn();
    subscribeAuthBootstrapReady(listener)();
    markAuthBootstrapReady();
    expect(listener).not.toHaveBeenCalled();

    resetAuthBootstrapStateForTests();
    expect(isAuthBootstrapReady()).toBe(false);
  });
});
