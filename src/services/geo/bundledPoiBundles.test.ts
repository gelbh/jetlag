import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(import.meta.dirname, "../../..");

describe("bundled POI bundles", () => {
  it("keeps Portland Maine parks wikidata-only and under the small-preset cap", () => {
    const payload = JSON.parse(
      readFileSync(
        resolve(ROOT, "public/geo/portland-maine/poi/park.json"),
        "utf8",
      ),
    );

    expect(payload.source).toBe("wikidata");
    expect(payload.places.length).toBeLessThanOrEqual(25);
    expect(
      payload.places.some((place: { id: string }) =>
        place.id.startsWith("pme:openspace:"),
      ),
    ).toBe(false);
  });
});
