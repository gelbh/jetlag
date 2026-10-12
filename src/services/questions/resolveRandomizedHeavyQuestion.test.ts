import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZERO_GAME_AREA } from "../../domain/geometry/core/gameAreaConvert";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import type { AnnotationRecord, TentaclePoi } from "../../domain/map/annotations";
import { tentacleSearchRadiusMetersForSession } from "../../domain/questions";
import type { SessionRulesInput } from "../../domain/session/rules";
import {
  type ResolveMatchingAnchorResult,
  resolveMatchingAnchor,
} from "../../hooks/tools/matching/resolveMatchingAnchor";
import { fetchTentaclePois } from "../geo/overpass/tentacleOverpass";
import {
  type HeavyResolveContext,
  resolveRandomizedMatching,
  resolveRandomizedTentacle,
} from "./resolveRandomizedHeavyQuestion";

vi.mock("../../hooks/tools/matching/resolveMatchingAnchor", () => ({
  resolveMatchingAnchor: vi.fn(),
}));
vi.mock("../geo/overpass/tentacleOverpass", () => ({
  fetchTentaclePois: vi.fn(),
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
});
