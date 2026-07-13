import { describe, expect, it } from "vitest";
import {
  isLazyRoute,
  normalizeRoutePath,
  preloadRoute,
} from "./routePreloaders";
import { routeReadinessKind } from "./useRouteScreenReady";

describe("normalizeRoutePath", () => {
  it("strips query strings and hashes", () => {
    expect(normalizeRoutePath("/map?foo=bar")).toBe("/map");
    expect(normalizeRoutePath("/create#step-2")).toBe("/create");
  });

  it("normalizes preset edit paths", () => {
    expect(normalizeRoutePath("/presets/abc123/edit")).toBe(
      "/presets/:id/edit",
    );
    expect(normalizeRoutePath("/presets/new")).toBe("/presets/new");
  });

  it("defaults empty paths to root", () => {
    expect(normalizeRoutePath("")).toBe("/");
  });
});

describe("isLazyRoute", () => {
  it("marks known lazy routes", () => {
    expect(isLazyRoute("/map")).toBe(true);
    expect(isLazyRoute("/create")).toBe(true);
    expect(isLazyRoute("/tutorial")).toBe(true);
    expect(isLazyRoute("/presets")).toBe(true);
    expect(isLazyRoute("/presets/new")).toBe(true);
    expect(isLazyRoute("/presets/foo/edit")).toBe(true);
  });

  it("marks eager routes as not lazy", () => {
    expect(isLazyRoute("/")).toBe(false);
    expect(isLazyRoute("/join")).toBe(false);
    expect(isLazyRoute("/admin")).toBe(false);
    expect(isLazyRoute("/premium")).toBe(false);
  });
});

describe("preloadRoute", () => {
  it("resolves immediately for eager routes", async () => {
    await expect(preloadRoute("/join")).resolves.toBeUndefined();
  });

  it("loads lazy route modules without throwing", async () => {
    await expect(preloadRoute("/tutorial")).resolves.toBeUndefined();
  });
});

describe("routeReadinessKind", () => {
  it("maps primary screens to readiness signals", () => {
    expect(routeReadinessKind("/")).toBe("auth-bootstrap");
    expect(routeReadinessKind("/map")).toBe("play-area");
    expect(routeReadinessKind("/admin")).toBe("admin-auth");
    expect(routeReadinessKind("/premium")).toBe("premium");
  });

  it("uses layout readiness for secondary routes", () => {
    expect(routeReadinessKind("/join")).toBe("layout");
    expect(routeReadinessKind("/create")).toBe("layout");
    expect(routeReadinessKind("/tutorial")).toBe("layout");
    expect(routeReadinessKind("/presets")).toBe("layout");
    expect(routeReadinessKind("/feedback")).toBe("layout");
  });
});
