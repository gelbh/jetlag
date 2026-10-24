import type { User } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimsLookAdmin, isAdminUser, resolveAdminAccess } from "./adminAccess";

function createUser(overrides: {
  email?: string | null;
  emailVerified?: boolean;
  isAnonymous?: boolean;
  reload?: ReturnType<typeof vi.fn>;
  getIdTokenResult?: ReturnType<typeof vi.fn>;
}): User {
  return {
    uid: "user-1",
    email: overrides.email ?? null,
    emailVerified: overrides.emailVerified ?? false,
    isAnonymous: overrides.isAnonymous ?? false,
    reload: overrides.reload ?? vi.fn(async () => undefined),
    getIdTokenResult: overrides.getIdTokenResult ?? vi.fn(async () => ({ claims: {} })),
  } as unknown as User;
}

describe("claimsLookAdmin", () => {
  it("requires admin claim and email_verified", () => {
    expect(claimsLookAdmin({ admin: true, email_verified: true })).toBe(true);
    expect(claimsLookAdmin({ admin: true, email_verified: false })).toBe(false);
    expect(claimsLookAdmin({ admin: false, email_verified: true })).toBe(false);
    expect(claimsLookAdmin({ email_verified: true })).toBe(false);
  });
});

describe("isAdminUser", () => {
  it("is always false without a token (sync path)", () => {
    expect(isAdminUser(createUser({ email: "anyone@example.com", emailVerified: true }))).toBe(
      false,
    );
  });
});

describe("resolveAdminAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unsigned for null", async () => {
    await expect(resolveAdminAccess(null)).resolves.toBe("unsigned");
  });

  it("returns unsigned for anonymous users", async () => {
    const user = createUser({
      email: "player@example.com",
      emailVerified: true,
      isAnonymous: true,
    });
    await expect(resolveAdminAccess(user)).resolves.toBe("unsigned");
    expect(user.reload).not.toHaveBeenCalled();
  });

  it("returns denied when token lacks admin claim", async () => {
    const getIdTokenResult = vi.fn(async () => ({
      claims: { email_verified: true },
    }));
    const user = createUser({
      email: "player@example.com",
      emailVerified: true,
      getIdTokenResult,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("denied");
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });

  it("returns admin when forced token has admin claim", async () => {
    const getIdTokenResult = vi.fn(async () => ({
      claims: { admin: true, email_verified: true },
    }));
    const user = createUser({
      email: "player@example.com",
      emailVerified: true,
      getIdTokenResult,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("admin");
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });

  it("heals stale emailVerified via reload then forced token", async () => {
    const user = createUser({
      email: "player@example.com",
      emailVerified: false,
    });
    const reload = vi.fn(async () => {
      Object.defineProperty(user, "emailVerified", {
        value: true,
        configurable: true,
      });
    });
    const getIdTokenResult = vi.fn(async () => ({
      claims: { admin: true, email_verified: true },
    }));
    (user as unknown as { reload: typeof reload }).reload = reload;
    (user as unknown as { getIdTokenResult: typeof getIdTokenResult }).getIdTokenResult =
      getIdTokenResult;

    await expect(resolveAdminAccess(user)).resolves.toBe("admin");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });

  it("returns denied when heal leaves claims without admin", async () => {
    const getIdTokenResult = vi.fn(async () => ({
      claims: { email_verified: true },
    }));
    const reload = vi.fn(async () => undefined);
    const user = createUser({
      email: "player@example.com",
      emailVerified: false,
      reload,
      getIdTokenResult,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("denied");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });
});
