import { describe, expect, it } from "vitest";
import { APP_ROUTE_PATHS, absoluteUrl, getRouteSeo, listIndexablePaths } from "./routeSeo";
import crawlPolicy from "./seoCrawlPolicy.json";

describe("routeSeo", () => {
  it("lists exactly the crawl-policy indexable paths", () => {
    expect([...listIndexablePaths()].sort()).toEqual([...crawlPolicy.indexablePaths].sort());
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
      expect(seo.robots).toBe(indexable.has(path) ? "index,follow" : "noindex,nofollow");
    }
  });

  it("builds absolute canonical URLs without trailing slash (except root)", () => {
    expect(absoluteUrl("/")).toBe("https://jetlag.gelbhart.dev/");
    expect(absoluteUrl("/premium")).toBe("https://jetlag.gelbhart.dev/premium");
  });

  it("returns dedicated not-found SEO for unknown paths with noindex", () => {
    const seo = getRouteSeo("/not-a-real-route");
    expect(seo.title).toContain("Page not found");
    expect(seo.description).toMatch(/does not exist/i);
    expect(seo.canonicalPath).toBe("/not-a-real-route");
    expect(seo.robots).toBe("noindex,nofollow");
  });

  it("keeps admin incident routes on admin SEO instead of not-found", () => {
    const list = getRouteSeo("/admin/incidents");
    expect(list.title).toContain("Incidents");
    expect(list.title).not.toContain("Page not found");
    expect(list.canonicalPath).toBe("/admin/incidents");
    expect(list.robots).toBe("noindex,nofollow");

    const detail = getRouteSeo("/admin/incidents/inc-123");
    expect(detail.title).toContain("Incident");
    expect(detail.title).not.toContain("Page not found");
    expect(detail.canonicalPath).toBe("/admin/incidents/:incidentId");
    expect(detail.robots).toBe("noindex,nofollow");
  });

  it("indexable policy paths resolve to index,follow with matching canonical", () => {
    for (const path of listIndexablePaths()) {
      const seo = getRouteSeo(path);
      expect(seo.robots).toBe("index,follow");
      expect(seo.canonicalPath).toBe(path);
    }
  });

  it("robots-disallows only admin so crawlers can read noindex on public app routes", () => {
    // A Disallowed URL never shows its noindex to Google, so shared links (e.g. /join?code=…)
    // could be indexed as bare URLs. Only the admin desk stays Disallowed.
    expect(crawlPolicy.disallowPaths).toEqual(["/admin"]);
    const isDisallowed = (path: string) =>
      crawlPolicy.disallowPaths.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    for (const path of APP_ROUTE_PATHS) {
      if (isDisallowed(path)) {
        expect(path.startsWith("/admin"), `${path} disallowed outside /admin`).toBe(true);
      }
    }
    for (const path of listIndexablePaths()) {
      expect(isDisallowed(path), `${path} is indexable but disallowed`).toBe(false);
    }
  });

  it("keeps formerly disallowed app routes noindex", () => {
    for (const path of ["/join", "/map", "/create", "/presets", "/stats", "/feedback"]) {
      expect(getRouteSeo(path).robots).toBe("noindex,nofollow");
    }
  });
});
