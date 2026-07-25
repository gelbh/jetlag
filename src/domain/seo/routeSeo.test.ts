import { describe, expect, it } from "vitest";
import crawlPolicy from "./seoCrawlPolicy.json";
import {
  APP_ROUTE_PATHS,
  absoluteUrl,
  getRouteSeo,
  listIndexablePaths,
} from "./routeSeo";

describe("routeSeo", () => {
  it("lists exactly the crawl-policy indexable paths", () => {
    expect([...listIndexablePaths()].sort()).toEqual(
      [...crawlPolicy.indexablePaths].sort(),
    );
  });

  it("covers every App route path", () => {
    for (const path of APP_ROUTE_PATHS) {
      expect(() => getRouteSeo(path)).not.toThrow();
    }
  });

  it("marks only indexable paths as index,follow", () => {
    const indexable = new Set(listIndexablePaths());
    for (const path of APP_ROUTE_PATHS) {
      const seo = getRouteSeo(path);
      expect(seo.robots).toBe(
        indexable.has(path) ? "index,follow" : "noindex,nofollow",
      );
    }
  });

  it("builds absolute canonical URLs without trailing slash (except root)", () => {
    expect(absoluteUrl("/")).toBe("https://jetlag.gelbhart.dev/");
    expect(absoluteUrl("/tutorial")).toBe(
      "https://jetlag.gelbhart.dev/tutorial",
    );
  });

  it("normalizes unknown paths to home SEO with noindex", () => {
    const seo = getRouteSeo("/not-a-real-route");
    expect(seo.canonicalPath).toBe("/");
    expect(seo.robots).toBe("noindex,nofollow");
  });

  it("indexable policy paths resolve to index,follow with matching canonical", () => {
    for (const path of listIndexablePaths()) {
      const seo = getRouteSeo(path);
      expect(seo.robots).toBe("index,follow");
      expect(seo.canonicalPath).toBe(path);
    }
  });

  it("disallowPaths covers every non-indexable app route", () => {
    const indexable = new Set(listIndexablePaths());
    for (const path of APP_ROUTE_PATHS) {
      if (indexable.has(path)) continue;
      const covered = crawlPolicy.disallowPaths.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );
      expect(covered, `${path} missing from disallowPaths`).toBe(true);
    }
  });
});
