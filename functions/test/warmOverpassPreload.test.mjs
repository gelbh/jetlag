import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildWarmPreloadQueries,
  handleSessionWarmPreloadWrite,
} from "../warmOverpassPreload.mjs";

describe("warmOverpassPreload", () => {
  it("builds coastline, landmass, and measuring warm queries", () => {
    const queries = buildWarmPreloadQueries({
      south: 40.74,
      west: -74.01,
      north: 40.77,
      east: -73.97,
    });

    assert.equal(queries.length, 5);
    assert.match(queries[0], /natural"="coastline"/);
    assert.match(queries[1], /natural"="water"/);
    assert.match(queries[2], /leisure"="park"/);
  });

  it("skips warm preload for free sessions", async () => {
    const result = await handleSessionWarmPreloadWrite({
      data: {
        before: { data: () => undefined },
        after: {
          data: () => ({
            tier: "free",
            gameArea: { south: 40.74, west: -74.01, north: 40.77, east: -73.97 },
          }),
        },
      },
    });

    assert.equal(result.skipped, true);
  });

  it("skips warm preload when game area is unchanged", async () => {
    const gameArea = { south: 40.74, west: -74.01, north: 40.77, east: -73.97 };
    const result = await handleSessionWarmPreloadWrite({
      data: {
        before: { data: () => ({ tier: "premium", gameArea }) },
        after: { data: () => ({ tier: "premium", gameArea }) },
      },
    });

    assert.equal(result.skipped, true);
  });
});
