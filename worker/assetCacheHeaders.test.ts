import { describe, expect, it } from "vitest";
import { cacheControlForPathname } from "./assetCacheHeaders";

describe("cacheControlForPathname", () => {
  it("immutably caches hashed assets", () => {
    expect(cacheControlForPathname("/assets/index-abc123.js")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  it("long-caches geo bundles", () => {
    expect(cacheControlForPathname("/geo/us-northeast.geojson")).toBe(
      "public, max-age=2592000",
    );
  });

  it("revalidates HTML and service worker", () => {
    expect(cacheControlForPathname("/")).toBe("no-cache");
    expect(cacheControlForPathname("/index.html")).toBe("no-cache");
    expect(cacheControlForPathname("/sw.js")).toBe("no-cache");
    expect(cacheControlForPathname("/manifest.webmanifest")).toBe("no-cache");
  });

  it("returns null for API routes (caller leaves headers alone)", () => {
    expect(cacheControlForPathname("/api/csp-report")).toBeNull();
  });
});
