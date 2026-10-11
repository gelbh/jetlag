import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_REDIRECT_ROUTE_PATHS, APP_ROUTE_PATHS, isKnownAppPath } from "./appRoutePaths";
import { LEARN_ROUTE_PATHS } from "./learnRoutePaths";

const ROOT = resolve(import.meta.dirname, "../../..");

/** `<Route path="…">` values in App.tsx, minus the catch-all and DEV-only galleries. */
function appTsxRoutePaths(): string[] {
  const source = readFileSync(resolve(ROOT, "src/App.tsx"), "utf8");
  const paths = [...source.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/g)].map((m) => m[1]);
  const filtered = paths.filter((path) => path !== "*" && !path.startsWith("/dev/"));
  // Learn pages are mounted via LEARN_ROUTE_PATHS.map (no string path literals).
  if (source.includes("LEARN_ROUTE_PATHS.map")) {
    return [...new Set([...filtered, ...LEARN_ROUTE_PATHS])];
  }
  return filtered;
}

describe("appRoutePaths", () => {
  it("matches every production <Route path> in App.tsx (Worker 404s anything else)", () => {
    expect([...appTsxRoutePaths()].sort()).toEqual(
      [...APP_ROUTE_PATHS, ...APP_REDIRECT_ROUTE_PATHS].sort(),
    );
  });

  it("matches static and dynamic routes", () => {
    for (const path of ["/", "/join", "/premium", "/map", "/tutorial", "/admin/incidents"]) {
      expect(isKnownAppPath(path), path).toBe(true);
    }
    expect(isKnownAppPath("/presets/abc123/edit")).toBe(true);
    expect(isKnownAppPath("/admin/incidents/inc-1")).toBe(true);
  });

  it("tolerates a trailing slash and case like React Router", () => {
    expect(isKnownAppPath("/join/")).toBe(true);
    expect(isKnownAppPath("/Premium")).toBe(true);
  });

  it("rejects unknown paths, extra segments and DEV-only routes", () => {
    for (const path of [
      "/this-does-not-exist",
      "/join/extra",
      "/presets/abc/edit/more",
      "/presets//edit",
      "/dev/status-dock",
      "/api/unknown",
      "//",
    ]) {
      expect(isKnownAppPath(path), path).toBe(false);
    }
  });
});
