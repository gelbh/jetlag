import { describe, expect, it } from "vitest";
import { expectsPermanentSignIn, OAUTH_REDIRECT_PENDING_KEY } from "./persistedAuthHint";

const KEY = "firebase:authUser:any-api-key:[DEFAULT]";

type HintStorage = Pick<Storage, "getItem" | "key" | "length">;

function storageWith(entries: Record<string, string>): HintStorage {
  const keys = Object.keys(entries);
  return {
    length: keys.length,
    key: (index) => keys[index] ?? null,
    getItem: (key) => entries[key] ?? null,
  };
}

const empty = storageWith({});
const blocked: HintStorage = {
  get length(): number {
    throw new DOMException("blocked", "SecurityError");
  },
  key: () => {
    throw new DOMException("blocked", "SecurityError");
  },
  getItem: () => {
    throw new DOMException("blocked", "SecurityError");
  },
};

describe("expectsPermanentSignIn", () => {
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

  it("ignores permanent users persisted for another Firebase app", () => {
    const other = storageWith({
      "firebase:authUser:any-api-key:secondary": JSON.stringify({ isAnonymous: false }),
    });
    expect(expectsPermanentSignIn(other, empty)).toBe(false);
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
