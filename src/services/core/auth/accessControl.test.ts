import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureAppCheckTokenFailure } from "../analytics/clientErrors";
import { buildPremiumProxyHeaders } from "./accessControl";

const { waitForSessionMembership } = vi.hoisted(() => ({
  waitForSessionMembership: vi.fn(async (_getUid: () => string | undefined) => undefined),
}));

vi.mock("../firebase/firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      uid: "uid-1",
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
  waitForSessionMembership,
}));

vi.mock("../analytics/clientErrors", () => ({
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

  it("waits for session membership before returning headers", async () => {
    let release: () => void = () => undefined;
    waitForSessionMembership.mockImplementationOnce(
      () =>
        new Promise<undefined>((resolve) => {
          release = () => resolve(undefined);
        }),
    );

    let resolved = false;
    const pending = buildPremiumProxyHeaders().then((headers) => {
      resolved = true;
      return headers;
    });
    await vi.waitFor(() => expect(waitForSessionMembership).toHaveBeenCalledTimes(1));
    expect(waitForSessionMembership.mock.calls[0]?.[0]()).toBe("uid-1");
    expect(resolved).toBe(false);

    release();
    await expect(pending).resolves.toMatchObject({ "X-Session-Id": "session-abc" });
  });
});
