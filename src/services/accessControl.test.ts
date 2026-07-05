import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildPremiumProxyHeaders } from "./accessControl";

vi.mock("./firebase", () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => "token-123"),
    },
  }),
}));

vi.mock("./premiumApiContext", () => ({
  getPremiumApiContext: () => ({ sessionId: "session-abc" }),
}));

describe("accessControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("builds premium proxy headers with auth and session id", async () => {
    const headers = await buildPremiumProxyHeaders();
    expect(headers).toEqual({
      Authorization: "Bearer token-123",
      "X-Session-Id": "session-abc",
    });
  });
});
