import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import * as overpassClient from "../../core/overpass/overpassClient";
import {
  buildPlayAreaCategoryPresenceQuery,
  probePlayAreaCategoryCounts,
} from "./playAreaCategoryPresenceProbe";

const sampleBounds = {
  south: 51.4,
  west: -0.2,
  north: 51.5,
  east: -0.1,
};

const sampleGameArea: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

describe("buildPlayAreaCategoryPresenceQuery", () => {
  it("emits one nwr statement and out count per category (not a single union count)", () => {
    const ql = buildPlayAreaCategoryPresenceQuery(sampleBounds, [
      { id: "zoo", selectors: ['["tourism"="zoo"]'] },
      { id: "hsr", selectors: ['["railway"="rail"]["highspeed"="yes"]'] },
    ]);

    const outCountMatches = ql.match(/out count;/g) ?? [];
    expect(outCountMatches.length).toBeGreaterThanOrEqual(2);
    expect(ql).toContain("[out:json][timeout:25];");
    expect(ql).toContain('nwr["tourism"="zoo"](51.4,-0.2,51.5,-0.1);');
    expect(ql).toContain('nwr["railway"="rail"]["highspeed"="yes"](51.4,-0.2,51.5,-0.1);');
    expect(ql).not.toMatch(/\(\s*nwr[\s\S]*nwr[\s\S]*\);\s*out count;/);
  });

  it("skips specs with empty selectors", () => {
    const ql = buildPlayAreaCategoryPresenceQuery(sampleBounds, [
      { id: "empty", selectors: [] },
      { id: "zoo", selectors: ["[tourism=zoo]"] },
      { id: "also-empty", selectors: [] },
    ]);

    expect(ql.match(/out count;/g)?.length).toBe(1);
    expect(ql).toContain("nwr[tourism=zoo](");
    expect(ql).not.toContain("empty");
  });

  it("concatenates catalog-style selectors onto nwr", () => {
    const ql = buildPlayAreaCategoryPresenceQuery(sampleBounds, [
      { id: "airport", selectors: ["[aeroway=aerodrome][iata]"] },
    ]);

    expect(ql).toContain("nwr[aeroway=aerodrome][iata](51.4,-0.2,51.5,-0.1);");
  });
});

describe("probePlayAreaCategoryCounts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls queryOverpass once and maps count elements in order to ids", async () => {
    const queryOverpass = vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "count",
          id: 0,
          tags: { nodes: "1", ways: "2", relations: "0", total: "3" },
        },
        {
          type: "count",
          id: 0,
          tags: { total: 7 },
        },
      ],
    });

    const counts = await probePlayAreaCategoryCounts(sampleGameArea, [
      { id: "zoo", selectors: ["[tourism=zoo]"] },
      { id: "museum", selectors: ["[tourism=museum]"] },
    ]);

    expect(queryOverpass).toHaveBeenCalledTimes(1);
    const ql = String(queryOverpass.mock.calls[0]?.[0] ?? "");
    expect(ql.match(/out count;/g)?.length).toBeGreaterThanOrEqual(2);
    expect(counts).toEqual({ zoo: 3, museum: 7 });
  });

  it("skips empty-selector specs and does not invent zeros for them", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "count",
          id: 0,
          tags: { total: "4" },
        },
      ],
    });

    const counts = await probePlayAreaCategoryCounts(sampleGameArea, [
      { id: "empty", selectors: [] },
      { id: "zoo", selectors: ["[tourism=zoo]"] },
    ]);

    expect(counts).toEqual({ zoo: 4 });
    expect(counts).not.toHaveProperty("empty");
  });

  it("fails when count elements are incomplete (no false zeros)", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "count",
          id: 0,
          tags: { total: "1" },
        },
      ],
    });

    await expect(
      probePlayAreaCategoryCounts(sampleGameArea, [
        { id: "zoo", selectors: ["[tourism=zoo]"] },
        { id: "museum", selectors: ["[tourism=museum]"] },
      ]),
    ).rejects.toThrow(/incomplete|count/i);

    await expect(
      probePlayAreaCategoryCounts(sampleGameArea, [
        { id: "zoo", selectors: ["[tourism=zoo]"] },
        { id: "museum", selectors: ["[tourism=museum]"] },
      ]),
    ).rejects.not.toEqual(
      expect.objectContaining({
        zoo: 1,
        museum: 0,
      }),
    );
  });

  it("fails soft when Overpass remark indicates timeout or runtime error", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      remark: 'runtime error: Query timed out in "query" at line 3 after 25 seconds.',
      elements: [],
    });

    await expect(
      probePlayAreaCategoryCounts(sampleGameArea, [{ id: "zoo", selectors: ["[tourism=zoo]"] }]),
    ).rejects.toThrow(/timeout|runtime/i);
  });

  it("falls back to nodes+ways+relations when tags.total is missing", async () => {
    vi.spyOn(overpassClient, "queryOverpass").mockResolvedValue({
      elements: [
        {
          type: "count",
          id: 0,
          tags: { nodes: "2", ways: "3", relations: "1" },
        },
      ],
    });

    const counts = await probePlayAreaCategoryCounts(sampleGameArea, [
      { id: "zoo", selectors: ["[tourism=zoo]"] },
    ]);

    expect(counts).toEqual({ zoo: 6 });
  });
});
