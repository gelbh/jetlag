import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPremiumProxyHeaders } from "./accessControl";
import { captureAppCheckTokenFailure } from "./sentry";

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => "token-123"),
    },
  }),
  getFirebaseAppCheck: () => ({ appCheck: true }),
}));

vi.mock("firebase/app-check", () => ({
  getToken: vi.fn(),
}));

vi.mock("./premiumApiContext", () => ({
  getPremiumApiContext: () => ({ sessionId: "session-abc" }),
}));

vi.mock("./sentry", () => ({
  captureAppCheckTokenFailure: vi.fn(),
}));

describe("accessControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds premium proxy headers with auth and session id", async () => {
    const { getToken } = await import("firebase/app-check");
    vi.mocked(getToken).mockResolvedValueOnce({ token: "app-check-token" });

    const headers = await buildPremiumProxyHeaders();
    expect(headers).toEqual({
      Authorization: "Bearer token-123",
      "X-Session-Id": "session-abc",
      "X-Firebase-AppCheck": "app-check-token",
    });
  });

  it("captures App Check token failures without blocking other headers", async () => {
    const { getToken } = await import("firebase/app-check");
    const tokenError = new Error("App Check token failed");
    vi.mocked(getToken).mockRejectedValueOnce(tokenError);

    const headers = await buildPremiumProxyHeaders();

    expect(headers).toEqual({
      Authorization: "Bearer token-123",
      "X-Session-Id": "session-abc",
    });
    expect(captureAppCheckTokenFailure).toHaveBeenCalledWith(tokenError, {
      source: "buildPremiumProxyHeaders",
    });
  });
});
