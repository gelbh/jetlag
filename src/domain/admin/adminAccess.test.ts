import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import {
  ADMIN_EMAIL,
  claimsLookAdmin,
  resolveAdminAccess,
} from "./adminAccess";

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
    getIdTokenResult:
      overrides.getIdTokenResult ??
      vi.fn(async () => ({ claims: {} })),
  } as unknown as User;
}

describe("claimsLookAdmin", () => {
  it("requires email_verified true and admin email", () => {
    expect(
      claimsLookAdmin({ email: ADMIN_EMAIL, email_verified: true }),
    ).toBe(true);
    expect(
      claimsLookAdmin({ email: ADMIN_EMAIL, email_verified: false }),
    ).toBe(false);
    expect(
      claimsLookAdmin({ email: "other@example.com", email_verified: true }),
    ).toBe(false);
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
      email: ADMIN_EMAIL,
      emailVerified: true,
      isAnonymous: true,
    });
    await expect(resolveAdminAccess(user)).resolves.toBe("unsigned");
    expect(user.reload).not.toHaveBeenCalled();
  });

  it("returns denied for permanent non-admin without reload", async () => {
    const reload = vi.fn(async () => undefined);
    const user = createUser({
      email: "player@example.com",
      emailVerified: true,
      reload,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("denied");
    expect(reload).not.toHaveBeenCalled();
  });

  it("returns admin for verified admin without reload", async () => {
    const reload = vi.fn(async () => undefined);
    const user = createUser({
      email: ADMIN_EMAIL,
      emailVerified: true,
      reload,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("admin");
    expect(reload).not.toHaveBeenCalled();
  });

  it("heals stale emailVerified via reload", async () => {
    const user = createUser({
      email: ADMIN_EMAIL,
      emailVerified: false,
    });
    const reload = vi.fn(async () => {
      Object.defineProperty(user, "emailVerified", {
        value: true,
        configurable: true,
      });
    });
    (user as { reload: typeof reload }).reload = reload;

    await expect(resolveAdminAccess(user)).resolves.toBe("admin");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(user.getIdTokenResult).not.toHaveBeenCalled();
  });

  it("falls back to forced token claims after reload still stale", async () => {
    const getIdTokenResult = vi.fn(async () => ({
      claims: { email: ADMIN_EMAIL, email_verified: true },
    }));
    const reload = vi.fn(async () => undefined);
    const user = createUser({
      email: ADMIN_EMAIL,
      emailVerified: false,
      reload,
      getIdTokenResult,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("admin");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });

  it("returns denied when heal leaves claims unverified", async () => {
    const getIdTokenResult = vi.fn(async () => ({
      claims: { email: ADMIN_EMAIL, email_verified: false },
    }));
    const reload = vi.fn(async () => undefined);
    const user = createUser({
      email: ADMIN_EMAIL,
      emailVerified: false,
      reload,
      getIdTokenResult,
    });

    await expect(resolveAdminAccess(user)).resolves.toBe("denied");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(getIdTokenResult).toHaveBeenCalledWith(true);
  });
});
