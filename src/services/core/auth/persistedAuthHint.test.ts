import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetClientEnvForTests } from "@/config/env";
import { expectsPermanentSignIn, OAUTH_REDIRECT_PENDING_KEY } from "./persistedAuthHint";

const KEY = "firebase:authUser:test-api-key:[DEFAULT]";

function storageWith(entries: Record<string, string>): Pick<Storage, "getItem"> {
  return { getItem: (key) => entries[key] ?? null };
}

const empty = storageWith({});
const blocked: Pick<Storage, "getItem"> = {
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

describe("expectsPermanentSignIn", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_FIREBASE_API_KEY", "test-api-key");
    resetClientEnvForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetClientEnvForTests();
  });

  it("is false with no persisted user", () => {
    expect(expectsPermanentSignIn(empty, empty)).toBe(false);
  });

  it("is false for a persisted anonymous user", () => {
    const local = storageWith({ [KEY]: JSON.stringify({ uid: "a", isAnonymous: true }) });
    expect(expectsPermanentSignIn(local, empty)).toBe(false);
  });

  it("is true for a persisted permanent user in local or session storage", () => {
    const user = storageWith({ [KEY]: JSON.stringify({ uid: "p", isAnonymous: false }) });
    expect(expectsPermanentSignIn(user, empty)).toBe(true);
    expect(expectsPermanentSignIn(empty, user)).toBe(true);
  });

  it("is true while an OAuth redirect sign-in is coming back", () => {
    const session = storageWith({ [OAUTH_REDIRECT_PENDING_KEY]: String(Date.now()) });
    expect(expectsPermanentSignIn(empty, session)).toBe(true);
  });

  it("ignores malformed entries and blocked or missing storage", () => {
    expect(expectsPermanentSignIn(storageWith({ [KEY]: "{not json" }), empty)).toBe(false);
    expect(expectsPermanentSignIn(blocked, blocked)).toBe(false);
    expect(expectsPermanentSignIn(null, null)).toBe(false);
  });
});
