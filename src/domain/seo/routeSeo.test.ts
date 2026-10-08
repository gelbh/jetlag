import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { LEARN_ROUTE_PATHS } from "./learnRoutePaths";
import {
  APP_ROUTE_PATHS,
  absoluteUrl,
  getRouteSeo,
  HOME_TITLE,
  listIndexablePaths,
} from "./routeSeo";
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
    for (const path of listIndexablePaths()) {
      expect(isDisallowed(path), `${path} is indexable but disallowed`).toBe(false);
    }
  });

  it("keeps formerly disallowed app routes noindex", () => {
    for (const path of ["/join", "/map", "/create", "/presets", "/stats", "/feedback"]) {
      expect(getRouteSeo(path).robots).toBe("noindex,nofollow");
    }
  });

  it("gives home a descriptive title within 60 chars and keeps the brand in JSON-LD", () => {
    const home = getRouteSeo("/");
    expect(home.title).toBe(HOME_TITLE);
    expect(home.title).toBe("Jet Lag Map Companion · Live Hide + Seek Maps");
    expect(home.title.length).toBeLessThanOrEqual(60);
    expect(home.jsonLd?.name).toBe("Jet Lag Map Companion");
    expect(home.description).toMatch(/unofficial/i);
  });

  it("keeps the static index.html title and share titles in sync with home SEO", () => {
    const html = readFileSync(resolve(import.meta.dirname, "../../../index.html"), "utf8");
    expect(html).toContain(`<title>${HOME_TITLE}</title>`);
    expect(html).toContain(`<meta property="og:title" content="${HOME_TITLE}" />`);
    expect(html).toContain(`<meta name="twitter:title" content="${HOME_TITLE}" />`);
    expect(html).toContain('<meta property="og:site_name" content="Jet Lag Map Companion" />');
  });

  it("keeps the noscript fallback free of headings so prerendered pages have one h1", () => {
    const html = readFileSync(resolve(import.meta.dirname, "../../../index.html"), "utf8");
    const noscript = html.match(/<noscript>([\s\S]*?)<\/noscript>/i)?.[1] ?? "";
    expect(noscript).not.toMatch(/<h[1-6]\b/i);
  });

  describe("learn pages (guide, question tools, FAQ)", () => {
    it("are all indexable and listed in the crawl policy", () => {
      const indexable = new Set(listIndexablePaths());
      for (const path of LEARN_ROUTE_PATHS) {
        expect(indexable.has(path), path).toBe(true);
        expect(getRouteSeo(path).robots).toBe("index,follow");
      }
    });

    it("have unique titles within 60 chars and descriptions within 160 chars", () => {
      const titles = new Set<string>();
      const descriptions = new Set<string>();
      for (const path of listIndexablePaths()) {
        const seo = getRouteSeo(path);
        expect(seo.title.length, path).toBeLessThanOrEqual(60);
        expect(seo.description.length, path).toBeLessThanOrEqual(160);
        expect(titles.has(seo.title), `duplicate title on ${path}`).toBe(false);
        expect(descriptions.has(seo.description), `duplicate description on ${path}`).toBe(false);
        titles.add(seo.title);
        descriptions.add(seo.description);
      }
    });

    it("emits WebPage JSON-LD, plus BreadcrumbList for nested tool pages", () => {
      const hub = getRouteSeo("/tools").jsonLd;
      expect(hub?.["@type"]).toBe("WebPage");
      expect(hub?.url).toBe("https://jetlag.gelbhart.dev/tools");

      const radar = getRouteSeo("/tools/radar").jsonLd;
      const graph = radar?.["@graph"] as Record<string, unknown>[];
      expect(graph.map((node) => node["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
      expect(graph[1]?.itemListElement).toEqual([
        { "@type": "ListItem", position: 1, name: "Home", item: "https://jetlag.gelbhart.dev/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Question tools",
          item: "https://jetlag.gelbhart.dev/tools",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Radar",
          item: "https://jetlag.gelbhart.dev/tools/radar",
        },
      ]);
    });
  });
});
