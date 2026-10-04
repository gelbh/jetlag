import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClientEnvForTests } from "@/config/env";
import { hasPersistedPermanentUserHint } from "./persistedAuthHint";

const KEY = "firebase:authUser:test-api-key:[DEFAULT]";

describe("hasPersistedPermanentUserHint", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    resetClientEnvForTests();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    resetClientEnvForTests();
  });

  it("is false with no persisted user", () => {
    expect(hasPersistedPermanentUserHint()).toBe(false);
  });

  it("is false for a persisted anonymous user", () => {
    localStorage.setItem(KEY, JSON.stringify({ uid: "a", isAnonymous: true }));
    expect(hasPersistedPermanentUserHint()).toBe(false);
  });

  it("is true for a persisted permanent user in local or session storage", () => {
    localStorage.setItem(KEY, JSON.stringify({ uid: "p", isAnonymous: false }));
    expect(hasPersistedPermanentUserHint()).toBe(true);

    localStorage.clear();
    sessionStorage.setItem(KEY, JSON.stringify({ uid: "p", isAnonymous: false }));
    expect(hasPersistedPermanentUserHint()).toBe(true);
  });

  it("ignores malformed entries and blocked storage", () => {
    localStorage.setItem(KEY, "{not json");
    expect(hasPersistedPermanentUserHint()).toBe(false);

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(hasPersistedPermanentUserHint()).toBe(false);
  });
});
