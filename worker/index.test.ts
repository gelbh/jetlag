import { describe, expect, it } from "vitest";
import { isSpaFallbackForAssetRequest } from "./index";

describe("isSpaFallbackForAssetRequest", () => {
  it("detects SPA index.html served for a missing asset", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/index-old.js");
    const response = new Response("<!doctype html>", {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(true);
  });

  it("allows real javascript assets through", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/index-new.js");
    const response = new Response("export {}", {
      status: 200,
      headers: { "Content-Type": "text/javascript" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(false);
  });

  it("preserves genuine asset 404 responses", () => {
    const request = new Request("https://jetlag.gelbhart.dev/assets/missing.js");
    const response = new Response("Not Found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });

    expect(isSpaFallbackForAssetRequest(request, response)).toBe(false);
  });
});
