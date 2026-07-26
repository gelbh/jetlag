import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAdminAccessState } from "./useAdminAccessState";

const { usePermanentAuthUser, resolveAdminAccess } = vi.hoisted(() => ({
  usePermanentAuthUser: vi.fn(),
  resolveAdminAccess: vi.fn(),
}));

vi.mock("../billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser,
}));

vi.mock("../../domain/admin/adminAccess", () => ({
  resolveAdminAccess,
}));

describe("useAdminAccessState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays loading while auth is not ready", () => {
    usePermanentAuthUser.mockReturnValue({
      user: null,
      isPermanent: false,
      authReady: false,
    });

    const { result } = renderHook(() => useAdminAccessState());

    expect(result.current.state).toBe("loading");
    expect(result.current.authReady).toBe(false);
    expect(resolveAdminAccess).not.toHaveBeenCalled();
  });

  it("becomes admin after resolve settles for a stale admin user", async () => {
    const user = {
      uid: "admin-1",
      email: "gelbharttomer@gmail.com",
      emailVerified: false,
      isAnonymous: false,
    };
    usePermanentAuthUser.mockReturnValue({
      user,
      isPermanent: true,
      authReady: true,
    });
    resolveAdminAccess.mockResolvedValue("admin");

    const { result } = renderHook(() => useAdminAccessState());

    expect(result.current.state).toBe("loading");

    await waitFor(() => {
      expect(result.current.state).toBe("admin");
    });

    expect(resolveAdminAccess).toHaveBeenCalledWith(user);
    expect(result.current.user).toBe(user);
    expect(result.current.authReady).toBe(true);
  });

  it("becomes denied for a non-admin permanent user", async () => {
    const user = {
      uid: "player-1",
      email: "player@example.com",
      emailVerified: true,
      isAnonymous: false,
    };
    usePermanentAuthUser.mockReturnValue({
      user,
      isPermanent: true,
      authReady: true,
    });
    resolveAdminAccess.mockResolvedValue("denied");

    const { result } = renderHook(() => useAdminAccessState());

    await waitFor(() => {
      expect(result.current.state).toBe("denied");
    });

    expect(resolveAdminAccess).toHaveBeenCalledWith(user);
  });
});
