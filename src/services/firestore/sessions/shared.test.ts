import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";

const forceRefreshIdToken = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@/services/core/auth/forceRefreshIdToken", () => ({
  forceRefreshIdToken,
}));

import { AUTH_FAILURE_MESSAGE, withPermissionDeniedAuthRetry } from "./shared";

describe("withPermissionDeniedAuthRetry", () => {
  beforeEach(() => {
    forceRefreshIdToken.mockClear();
  });

  it("refreshes once then succeeds after permission-denied", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(
        new FirebaseError("permission-denied", "Missing or insufficient permissions."),
      )
      .mockResolvedValueOnce("ok");

    await expect(withPermissionDeniedAuthRetry(op)).resolves.toBe("ok");
    expect(forceRefreshIdToken).toHaveBeenCalledOnce();
    expect(op).toHaveBeenCalledTimes(2);
  });

  it("throws auth failure after two permission-denied", async () => {
    const op = vi
      .fn()
      .mockRejectedValue(
        new FirebaseError("permission-denied", "Missing or insufficient permissions."),
      );

    await expect(withPermissionDeniedAuthRetry(op)).rejects.toThrow(AUTH_FAILURE_MESSAGE);
    expect(forceRefreshIdToken).toHaveBeenCalledOnce();
  });

  it("does not retry non-permission errors", async () => {
    const op = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(withPermissionDeniedAuthRetry(op)).rejects.toThrow("boom");
    expect(forceRefreshIdToken).not.toHaveBeenCalled();
  });

  it("retries functions/permission-denied once", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(new FirebaseError("functions/permission-denied", "denied"))
      .mockResolvedValueOnce("ok");

    await expect(withPermissionDeniedAuthRetry(op)).resolves.toBe("ok");
    expect(forceRefreshIdToken).toHaveBeenCalledOnce();
  });
});
