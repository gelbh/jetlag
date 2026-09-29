import { describe, expect, it } from "vitest";
import { handleTimeRequest } from "./timeEndpoint";

describe("handleTimeRequest", () => {
  it("returns server epoch ms, no-store", async () => {
    const res = handleTimeRequest(new Request("https://x/api/time"), () => 1234);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ now: 1234 });
  });

  it("HEAD returns 204 with x-server-time", () => {
    const res = handleTimeRequest(
      new Request("https://x/api/time", { method: "HEAD" }),
      () => 99,
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("x-server-time")).toBe("99");
  });

  it("rejects other methods with 405", () => {
    const res = handleTimeRequest(
      new Request("https://x/api/time", { method: "POST" }),
      () => 1,
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });
});
