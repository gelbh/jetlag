import { beforeEach, describe, expect, it } from "vitest";
import { applyDocumentSeo } from "./applyDocumentSeo";

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute("content") ?? null;
}

describe("applyDocumentSeo", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });

  it("sets title, description, canonical, robots, and og tags for /tutorial", () => {
    applyDocumentSeo("/tutorial");
    expect(document.title).toContain("Tutorial");
    expect(metaContent('meta[name="description"]')).toBeTruthy();
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"),
    ).toBe("https://jetlag.gelbhart.dev/tutorial");
    expect(metaContent('meta[name="robots"]')).toBe("index,follow");
    expect(metaContent('meta[property="og:title"]')).toContain("Tutorial");
    expect(metaContent('meta[property="og:url"]')).toBe(
      "https://jetlag.gelbhart.dev/tutorial",
    );
    expect(metaContent('meta[property="og:image"]')).toBe(
      "https://jetlag.gelbhart.dev/og-default.png",
    );
    expect(metaContent('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("sets noindex for /map", () => {
    applyDocumentSeo("/map");
    expect(metaContent('meta[name="robots"]')).toBe("noindex,nofollow");
  });

  it("upserts rather than duplicating tags on second call", () => {
    applyDocumentSeo("/");
    applyDocumentSeo("/premium");
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(
      1,
    );
    expect(document.head.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });
});
