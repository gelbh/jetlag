import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Packs whose ATTRIBUTION documents Overpass coastline in gameplay must not ship
 * source:"none" (that hard-disables Overpass in coastline.ts).
 */
const OVERPASS_COASTLINE_PACKS = ["singapore", "amsterdam", "london", "sydney"] as const;

describe("coastline pack source vs Overpass", () => {
  it("does not ship source none for packs that rely on Overpass coastline", () => {
    for (const packId of OVERPASS_COASTLINE_PACKS) {
      const payload = JSON.parse(
        readFileSync(path.join(root, "public", "geo", packId, "coastline.json"), "utf8"),
      ) as { source: string };
      expect(payload.source, packId).not.toBe("none");
      expect(["stub", "overpass"]).toContain(payload.source);
    }
  });
});
