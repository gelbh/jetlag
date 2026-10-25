import type { Feature, LineString } from "geojson";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZERO_GAME_AREA } from "../../domain/geometry/core/gameAreaConvert";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, TentaclePoi } from "../../domain/map/annotations";
import {
  measuringMultiPlaceTargetLabel,
  tentacleSearchRadiusMetersForSession,
} from "../../domain/questions";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  type ResolveMatchingAnchorResult,
  resolveMatchingAnchor,
} from "../../hooks/tools/matching/resolveMatchingAnchor";
import {
  fetchMeasuringCoastlineContext,
  fetchMeasuringLinearContext,
} from "../../hooks/tools/measuringToolResolvers";
import type { AdminDivisionCounts } from "../geo/overpass/adminDivisionAvailability";
import { fetchMeasuringPlacesInArea } from "../geo/overpass/measuringPlaces";
import { fetchTentaclePois } from "../geo/overpass/tentacleOverpass";
import {
  type HeavyResolveContext,
  resolveRandomizedMatching,
  resolveRandomizedMeasuring,
  resolveRandomizedTentacle,
} from "./resolveRandomizedHeavyQuestion";

const preload = vi.hoisted(() => ({
  adminDivisionCounts: null as AdminDivisionCounts | null,
  categoryPresenceCounts: null as Record<string, number> | null,
}));

vi.mock("../../hooks/tools/matching/resolveMatchingAnchor", () => ({
  resolveMatchingAnchor: vi.fn(),
}));
vi.mock("../geo/overpass/tentacleOverpass", () => ({
  fetchTentaclePois: vi.fn(),
}));
vi.mock("../../hooks/tools/measuringToolResolvers", () => ({
  fetchMeasuringCoastlineContext: vi.fn(),
  fetchMeasuringLinearContext: vi.fn(),
}));
vi.mock("../geo/overpass/measuringPlaces", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../geo/overpass/measuringPlaces")>()),
  fetchMeasuringPlacesInArea: vi.fn(),
}));
vi.mock("../../state/preloadStore", () => ({
  usePreloadStore: { getState: () => preload },
}));

const anchor: LatLngTuple = [51.5, -0.1];
const cards = { cardDraw: 3, cardKeep: 1 };
const pin: AnnotationRecord = {
  id: "pin-1",
  sessionId: "s1",
  type: "pin",
  status: "active",
  geometry: {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [-0.11, 51.51] },
  },
  metadata: { poiCategory: "museum", label: "Annotated museum" },
} as unknown as AnnotationRecord;

function ctx(session: Partial<SessionRulesInput> = {}): HeavyResolveContext {
  return {
    session: { gameSize: "large", regionPackId: "london", ...session } as SessionRulesInput,
    annotations: [pin],
    gameArea: ZERO_GAME_AREA,
    distanceUnit: "metric",
  };
}

function anchorResult(overrides: Partial<ResolveMatchingAnchorResult> = {}) {
  return {
    features: [{ id: "f1", name: "Museum A", point: [51.501, -0.1] }],
    featureCount: 1,
    inPlayAreaFeatureCount: 1,
    nearestFeatureId: "f1",
    nearestFeatureName: "Museum A",
    nearestFeaturePoint: [51.501, -0.1],
    distanceMeters: 120,
    nearestOutsidePlayArea: false,
    nullAnswer: false,
    error: null,
    ...overrides,
  } as ResolveMatchingAnchorResult;
}

function poi(overrides: Partial<TentaclePoi> = {}): TentaclePoi {
  return { id: "p1", name: "Museum P", lat: 51.5, lng: -0.1, category: "museum", ...overrides };
}

beforeEach(() => {
  vi.mocked(resolveMatchingAnchor).mockReset();
  vi.mocked(fetchTentaclePois).mockReset();
  vi.mocked(fetchMeasuringCoastlineContext).mockReset();
  vi.mocked(fetchMeasuringLinearContext).mockReset();
  vi.mocked(fetchMeasuringPlacesInArea).mockReset();
  preload.adminDivisionCounts = null;
  preload.categoryPresenceCounts = null;
});

describe("resolveRandomizedMatching", () => {
  it("builds the pending payload at the passed anchor with the session fetch options", async () => {
    vi.mocked(resolveMatchingAnchor).mockResolvedValue(anchorResult());

    const built = await resolveRandomizedMatching(anchor, "museum", cards, ctx());

    expect(built?.placement.metadata.matchingAnchor).toEqual({ lat: 51.5, lng: -0.1 });
    expect(built?.placement.metadata.matchingCategory).toBe("museum");
    expect(built?.placement.metadata.matchingNearestFeatureId).toBe("f1");
    expect(built?.cardDraw).toBe(3);
    expect(built?.cardKeep).toBe(1);
    const call = vi.mocked(resolveMatchingAnchor).mock.calls[0]![0];
    expect(call.seekerPoint).toEqual(anchor);
    expect(call.onEnrich).toBeUndefined();
    expect(call.matchingFetchOptions.regionPackId).toBe("london");
    expect(call.matchingFetchOptions.poiPins?.map((p) => p.id)).toEqual(["pin-1"]);
  });

  it("returns null when the resolve reports an error", async () => {
    vi.mocked(resolveMatchingAnchor).mockResolvedValue(
      anchorResult({ error: "This matching category is not available yet." }),
    );

    expect(await resolveRandomizedMatching(anchor, "museum", cards, ctx())).toBeNull();
  });

  it("returns null for a null answer with zero features", async () => {
    vi.mocked(resolveMatchingAnchor).mockResolvedValue(
      anchorResult({
        features: [],
        featureCount: 0,
        nullAnswer: true,
        nearestFeatureId: null,
        nearestFeatureName: null,
        nearestFeaturePoint: null,
      }),
    );

    expect(await resolveRandomizedMatching(anchor, "museum", cards, ctx())).toBeNull();
  });

  it("returns null without resolving when probe count is 0", async () => {
    preload.categoryPresenceCounts = { museum: 0 };

    expect(await resolveRandomizedMatching(anchor, "museum", cards, ctx())).toBeNull();
    expect(resolveMatchingAnchor).not.toHaveBeenCalled();
  });
});

describe("resolveRandomizedTentacle", () => {
  it("builds the pending payload from confirmed POIs at the session radius", async () => {
    vi.mocked(fetchTentaclePois).mockResolvedValue([
      poi(),
      poi({ id: "p2", confirmStatus: "provisional" }),
    ]);
    const context = ctx();

    const built = await resolveRandomizedTentacle(anchor, "museum", cards, context);

    const radius = tentacleSearchRadiusMetersForSession(context.session, "museum");
    expect(built?.placement.metadata.radiusMeters).toBe(radius);
    expect(built?.placement.metadata.tentacleCategoryId).toBe("museum");
    expect(built?.replyOptions.map((option) => option.id)).toEqual(["p1", "out-of-reach"]);
    expect(built?.cardDraw).toBe(3);
    const [center, fetchedRadius, categoryId, options] =
      vi.mocked(fetchTentaclePois).mock.calls[0]!;
    expect(center).toEqual(anchor);
    expect(fetchedRadius).toBe(radius);
    expect(categoryId).toBe("museum");
    expect(options?.regionPackId).toBe("london");
    expect(options?.customLocationPins?.map((p) => p.id)).toEqual(["pin-1"]);
    expect(options?.onEnrich).toBeUndefined();
  });

  it("returns null when no confirmed POIs come back", async () => {
    vi.mocked(fetchTentaclePois).mockResolvedValue([poi({ confirmStatus: "provisional" })]);

    expect(await resolveRandomizedTentacle(anchor, "museum", cards, ctx())).toBeNull();
  });

  it("returns null when the POI fetch rejects", async () => {
    vi.mocked(fetchTentaclePois).mockRejectedValue(new Error("overpass down"));

    expect(await resolveRandomizedTentacle(anchor, "museum", cards, ctx())).toBeNull();
  });

  it("returns null without fetching for a category unavailable in the session", async () => {
    expect(
      await resolveRandomizedTentacle(anchor, "museum", cards, ctx({ tentaclesEnabled: false })),
    ).toBeNull();
    expect(fetchTentaclePois).not.toHaveBeenCalled();
  });

  it("returns null without fetching when probe count is 0", async () => {
    preload.categoryPresenceCounts = { museum: 0 };

    expect(await resolveRandomizedTentacle(anchor, "museum", cards, ctx())).toBeNull();
    expect(fetchTentaclePois).not.toHaveBeenCalled();
  });
});

const segment: Feature<LineString> = {
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates: [
      [-0.2, 51.4],
      [-0.1, 51.4],
    ],
  },
};

function regionInput(built: Awaited<ReturnType<typeof resolveRandomizedMeasuring>>) {
  return JSON.parse(built?.placement.metadata.measuringRegionInputJson as string);
}

describe("resolveRandomizedMeasuring", () => {
  it("builds a coastline payload from the coast fetch", async () => {
    vi.mocked(fetchMeasuringCoastlineContext).mockResolvedValue({
      ok: true,
      coastPoint: [51.4, -0.15],
      distanceMeters: 11_000,
      segments: [segment],
    });

    const built = await resolveRandomizedMeasuring(anchor, "coastline", cards, ctx());

    const metadata = built?.placement.metadata;
    expect(metadata?.measuringSubject).toBe("coastline");
    expect(metadata?.measuringLocationCategory).toBeUndefined();
    expect(metadata?.measuringDistanceMeters).toBe(11_000);
    expect(metadata?.measuringAnchor).toEqual({ lat: 51.5, lng: -0.1 });
    expect(metadata?.measuringCoastPoint).toEqual({ lat: 51.4, lng: -0.15 });
    expect(metadata?.measuringPlacesJson).toBeUndefined();
    expect(regionInput(built).measuringCoastSegments).toEqual([segment]);
    expect(regionInput(built).usesAllPlacesInArea).toBe(false);
    expect(built?.cardDraw).toBe(3);
    expect(built?.cardKeep).toBe(1);
    const [point, , options] = vi.mocked(fetchMeasuringCoastlineContext).mock.calls[0]!;
    expect(point).toEqual(anchor);
    expect(options).toEqual({ regionPackId: "london" });
  });

  it("returns null for a coastline result with zero segments", async () => {
    vi.mocked(fetchMeasuringCoastlineContext).mockResolvedValue({
      ok: true,
      coastPoint: [51.4, -0.15],
      distanceMeters: 11_000,
      segments: [],
    });

    expect(await resolveRandomizedMeasuring(anchor, "coastline", cards, ctx())).toBeNull();
  });

  it("returns null when the coastline fetch reports not ok", async () => {
    vi.mocked(fetchMeasuringCoastlineContext).mockResolvedValue({ ok: false, message: "none" });

    expect(await resolveRandomizedMeasuring(anchor, "coastline", cards, ctx())).toBeNull();
  });

  it("returns null when the coastline fetch rejects", async () => {
    vi.mocked(fetchMeasuringCoastlineContext).mockRejectedValue(new Error("overpass down"));

    expect(await resolveRandomizedMeasuring(anchor, "coastline", cards, ctx())).toBeNull();
  });

  it("builds a linear payload with the line segments as coast segments", async () => {
    vi.mocked(fetchMeasuringLinearContext).mockResolvedValue({
      ok: true,
      point: [51.45, -0.12],
      distanceMeters: 5_000,
      segments: [segment],
    });
    // Tokyo keeps high_speed_rail_line off the play-area denylist.
    const tokyo = ctx({ regionPackId: "tokyo" });

    const built = await resolveRandomizedMeasuring(anchor, "high_speed_rail_line", cards, tokyo);

    const metadata = built?.placement.metadata;
    expect(metadata?.measuringSubject).toBe("location");
    expect(metadata?.measuringLocationCategory).toBe("high_speed_rail_line");
    expect(metadata?.measuringDistanceMeters).toBe(5_000);
    expect(metadata?.measuringCoastPoint).toEqual({ lat: 51.45, lng: -0.12 });
    expect(metadata?.measuringTargetName).toBeUndefined();
    expect(metadata?.measuringPlacesJson).toBeUndefined();
    expect(regionInput(built).measuringCoastSegments).toEqual([segment]);
    expect(regionInput(built).usesAllPlacesInArea).toBe(false);
    const [point, , subject, category, , , regionPackId] = vi.mocked(fetchMeasuringLinearContext)
      .mock.calls[0]!;
    expect(point).toEqual(anchor);
    expect(subject).toBe("location");
    expect(category).toBe("high_speed_rail_line");
    expect(regionPackId).toBe("tokyo");
  });

  it("returns null when the linear fetch reports not ok", async () => {
    vi.mocked(fetchMeasuringLinearContext).mockResolvedValue({ ok: false, message: "none" });

    expect(
      await resolveRandomizedMeasuring(
        anchor,
        "high_speed_rail_line",
        cards,
        ctx({ regionPackId: "tokyo" }),
      ),
    ).toBeNull();
  });

  it("returns null when the linear fetch rejects", async () => {
    vi.mocked(fetchMeasuringLinearContext).mockRejectedValue(new Error("overpass down"));

    expect(
      await resolveRandomizedMeasuring(
        anchor,
        "high_speed_rail_line",
        cards,
        ctx({ regionPackId: "tokyo" }),
      ),
    ).toBeNull();
  });

  it("builds an all-places payload with the annotated pins merged in", async () => {
    vi.mocked(fetchMeasuringPlacesInArea).mockResolvedValue([
      { id: "m1", name: "Museum A", point: [51.49, -0.1] },
    ]);

    const built = await resolveRandomizedMeasuring(anchor, "museum", cards, ctx());

    const metadata = built?.placement.metadata;
    expect(metadata?.measuringLocationCategory).toBe("museum");
    expect(metadata?.measuringCoastPoint).toEqual({ lat: 51.49, lng: -0.1 });
    expect(metadata?.measuringTargetName).toBe(measuringMultiPlaceTargetLabel(2, "museum"));
    expect(
      JSON.parse(metadata?.measuringPlacesJson as string).map((p: { id: string }) => p.id),
    ).toEqual(["m1", "pin-1"]);
    expect(regionInput(built).usesAllPlacesInArea).toBe(true);
    expect(regionInput(built).measuringPlaces).toEqual([]);
    const [, category, , regionPackId, options] = vi.mocked(fetchMeasuringPlacesInArea).mock
      .calls[0]!;
    expect(category).toBe("museum");
    expect(regionPackId).toBe("london");
    expect(options).toEqual({ subregionId: undefined });
  });

  it("passes regionPackSubregionId through to measuring place fetch", async () => {
    vi.mocked(fetchMeasuringPlacesInArea).mockResolvedValue([
      { id: "m1", name: "Museum A", point: [51.49, -0.1] },
    ]);

    await resolveRandomizedMeasuring(
      anchor,
      "museum",
      cards,
      ctx({ regionPackId: "australia", regionPackSubregionId: "nsw" }),
    );

    const [, , , regionPackId, options] = vi.mocked(fetchMeasuringPlacesInArea).mock.calls[0]!;
    expect(regionPackId).toBe("australia");
    expect(options).toEqual({ subregionId: "nsw" });
  });

  it("returns null when no places or pins exist", async () => {
    vi.mocked(fetchMeasuringPlacesInArea).mockResolvedValue([]);

    expect(
      await resolveRandomizedMeasuring(anchor, "museum", cards, { ...ctx(), annotations: [] }),
    ).toBeNull();
  });

  it("returns null when the places fetch rejects", async () => {
    vi.mocked(fetchMeasuringPlacesInArea).mockRejectedValue(new Error("overpass down"));

    expect(await resolveRandomizedMeasuring(anchor, "museum", cards, ctx())).toBeNull();
  });

  it("returns null without fetching for an admin border while counts are unknown", async () => {
    expect(await resolveRandomizedMeasuring(anchor, "admin1_border", cards, ctx())).toBeNull();
    expect(fetchMeasuringLinearContext).not.toHaveBeenCalled();
  });

  it("returns null without fetching for a denylisted measuring kind", async () => {
    expect(
      await resolveRandomizedMeasuring(
        anchor,
        "high_speed_rail_line",
        cards,
        ctx({ regionPackId: "dublin" }),
      ),
    ).toBeNull();
    expect(fetchMeasuringLinearContext).not.toHaveBeenCalled();
  });

  it("returns null without fetching when probe count is 0", async () => {
    preload.categoryPresenceCounts = { museum: 0 };

    expect(await resolveRandomizedMeasuring(anchor, "museum", cards, ctx())).toBeNull();
    expect(fetchMeasuringPlacesInArea).not.toHaveBeenCalled();
  });

  it("routes an available admin border through the linear fetch", async () => {
    preload.adminDivisionCounts = {
      admin_division_1: 5,
      admin_division_2: 5,
      admin_division_3: 5,
      admin_division_4: 5,
    };
    vi.mocked(fetchMeasuringLinearContext).mockResolvedValue({
      ok: true,
      point: [51.45, -0.12],
      distanceMeters: 2_000,
      segments: [segment],
    });
    const base = ctx();

    const built = await resolveRandomizedMeasuring(anchor, "admin1_border", cards, {
      ...base,
      session: { ...base.session, regionPackId: undefined },
    });

    expect(built?.placement.metadata.measuringLocationCategory).toBe("admin1_border");
    const [, , subject, category] = vi.mocked(fetchMeasuringLinearContext).mock.calls[0]!;
    expect(subject).toBe("location");
    expect(category).toBe("admin1_border");
  });

  it.each(["sea_level", "custom_place", "custom:x", "custom_geo:x"] as const)(
    "returns null without fetching for %s",
    async (kind) => {
      expect(await resolveRandomizedMeasuring(anchor, kind, cards, ctx())).toBeNull();
      expect(fetchMeasuringCoastlineContext).not.toHaveBeenCalled();
      expect(fetchMeasuringLinearContext).not.toHaveBeenCalled();
      expect(fetchMeasuringPlacesInArea).not.toHaveBeenCalled();
    },
  );
});
