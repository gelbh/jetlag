import { describe, expect, it, vi } from "vitest";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon } from "geojson";
import type { GameArea, TentaclePoi } from "../../map/annotations";
import { milesToMeters } from "../../map/distance";
import {
  clearVoronoiCellCacheForTests,
  getCachedVoronoiCellsAsync,
  tentacleSitesFingerprint,
} from "../voronoi/voronoiCellCache";
import { voronoiCellSiteId } from "../voronoi/voronoiCellSiteId";
import {
  buildTentacleEliminationRegion,
  buildTentaclePoiAnswerEliminationRegion,
  clearTentacleEliminationCacheForTests,
  tentacleEliminationJsonForAnswer,
} from "./tentacleGeometry";
import { resolveVoronoiCellPoiId } from "../voronoi/voronoiCellSiteId";
import * as persistSlim from "../progressive/persistSlim";
import { MEASURING_PERSIST_OVER_BUDGET_MESSAGE } from "../measuring/measuringGeometryBudgets";
import { TENTACLE_POI_OVER_BUDGET_MESSAGE } from "./tentacleGeometryBudgets";
import exysHospitalTentacle from "./fixtures/exysHospitalTentacle.json";
import { TENTACLE_POI_MAX } from "./tentacleGeometryBudgets";

const oneMileMeters = milesToMeters(1);
const POLYGON_OR_MULTIPOLYGON = /Polygon|MultiPolygon/;

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

const westMuseum: TentaclePoi = {
  id: "west",
  name: "West",
  lat: 51.45,
  lng: -0.18,
  category: "museum",
};

const eastMuseum: TentaclePoi = {
  id: "east",
  name: "East",
  lat: 51.45,
  lng: -0.12,
  category: "museum",
};

describe("tentacleGeometry", () => {
  it("resolves poiId from cached voronoi cells used in elimination", async () => {
    clearVoronoiCellCacheForTests();
    clearTentacleEliminationCacheForTests();
    const pois = [westMuseum, eastMuseum];
    const cells = await getCachedVoronoiCellsAsync(
      tentacleSitesFingerprint(pois),
      pois.map((poi) => ({
        lng: poi.lng,
        lat: poi.lat,
        properties: { poiId: poi.id },
      })),
    );

    const siteIds = cells.features.map((cell) =>
      voronoiCellSiteId(cell, ["poiId"]),
    );

    expect(siteIds).toContain("west");
    expect(siteIds).toContain("east");
    expect(new Set(siteIds.filter(Boolean)).size).toBe(2);
  });

  it("returns null when fewer than two POIs", async () => {
    expect(
      await buildTentacleEliminationRegion(
        [51.45, -0.15],
        oneMileMeters,
        [westMuseum],
        "west",
        sampleGameArea,
      ),
    ).toBeNull();
  });


  it("single POI answer shades only the exterior of the search disk", async () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = await buildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum],
      "west",
      sampleGameArea,
    );

    expect(region).not.toBeNull();

    const outsideDisk = turfPoint([-0.19, 51.45]);
    const insideDisk = turfPoint([-0.151, 51.45]);

    expect(booleanPointInPolygon(outsideDisk, region!)).toBe(true);
    expect(booleanPointInPolygon(insideDisk, region!)).toBe(false);
  });

  it("tentacleEliminationJsonForAnswer serializes single-POI exterior shading", async () => {
    const json = await tentacleEliminationJsonForAnswer({
      anchor: [51.45, -0.15],
      radiusMeters: oneMileMeters,
      pois: [westMuseum],
      answeredPoiId: "west",
      outOfReach: false,
      gameArea: sampleGameArea,
    });

    expect(json).toBeDefined();
    expect(JSON.parse(json!)).toMatchObject({
      geometry: { type: expect.stringMatching(POLYGON_OR_MULTIPOLYGON) },
    });
  });

  it("multi-POI answer combines exterior and inner Voronoi shading", async () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = await buildTentaclePoiAnswerEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum, eastMuseum],
      "east",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(region?.geometry.type).toMatch(POLYGON_OR_MULTIPOLYGON);

    const outsideDisk = turfPoint([-0.19, 51.45]);
    const wrongCellInsideDisk = turfPoint([-0.165, 51.45]);
    const nearAnsweredPoi = turfPoint([-0.135, 51.45]);

    expect(booleanPointInPolygon(outsideDisk, region!)).toBe(true);
    expect(booleanPointInPolygon(wrongCellInsideDisk, region!)).toBe(true);
    expect(booleanPointInPolygon(nearAnsweredPoi, region!)).toBe(false);
  });

  it("Voronoi cells inside the answer radius nearer to another POI than the answer", async () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = await buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum, eastMuseum],
      "east",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    expect(region?.geometry.type).toMatch(/Polygon|MultiPolygon/);
    const westOfBisectorInsideMile = turfPoint([-0.165, 51.45]);
    const eastOfBisectorInsideMile = turfPoint([-0.135, 51.45]);
    expect(booleanPointInPolygon(westOfBisectorInsideMile, region!)).toBe(true);
    expect(booleanPointInPolygon(eastOfBisectorInsideMile, region!)).toBe(
      false,
    );
  });

  it("shades the search disk except near the answered poi", async () => {
    const anchor: [number, number] = [51.45, -0.15];
    const region = await buildTentacleEliminationRegion(
      anchor,
      oneMileMeters,
      [westMuseum, eastMuseum],
      "east",
      sampleGameArea,
    );

    expect(region).not.toBeNull();
    const nearAnsweredPoi = turfPoint([-0.125, 51.45]);
    const farFromAnsweredPoi = turfPoint([-0.165, 51.45]);
    expect(booleanPointInPolygon(nearAnsweredPoi, region!)).toBe(false);
    expect(booleanPointInPolygon(farFromAnsweredPoi, region!)).toBe(true);
  });

  it("tentacleEliminationJsonForAnswer is undefined when out of reach", async () => {
    expect(
      await tentacleEliminationJsonForAnswer({
        anchor: [51.45, -0.15],
        radiusMeters: oneMileMeters,
        pois: [westMuseum, eastMuseum],
        answeredPoiId: "east",
        outOfReach: true,
        gameArea: sampleGameArea,
      }),
    ).toBeUndefined();
  });

  it("7+ POI answers produce distinct inner-disk shading per selection", async () => {
    clearVoronoiCellCacheForTests();
    clearTentacleEliminationCacheForTests();

    const anchor: [number, number] = [51.45, -0.15];
    const sevenPois: TentaclePoi[] = Array.from({ length: 7 }, (_, index) => ({
      id: `poi-${index}`,
      name: `Museum ${index}`,
      lat: 51.45 + (index - 3) * 0.002,
      lng: -0.15 + (index - 3) * 0.003,
      category: "museum",
    }));

    const fingerprint = tentacleSitesFingerprint(sevenPois);
    const cells = await getCachedVoronoiCellsAsync(
      fingerprint,
      sevenPois.map((poi) => ({
        lng: poi.lng,
        lat: poi.lat,
        properties: { poiId: poi.id },
      })),
    );

    const resolvedIds = cells.features.map((cell) =>
      resolveVoronoiCellPoiId(cell, sevenPois, ["poiId"]),
    );
    expect(new Set(resolvedIds.filter(Boolean)).size).toBe(7);

    const regionsByAnswer = new Map<string, Feature<Polygon | MultiPolygon>>();
    for (const poi of sevenPois) {
      const region = await buildTentacleEliminationRegion(
        anchor,
        oneMileMeters,
        sevenPois,
        poi.id,
        sampleGameArea,
      );
      expect(region).not.toBeNull();
      regionsByAnswer.set(poi.id, region!);
    }

    for (const answered of sevenPois) {
      const region = regionsByAnswer.get(answered.id)!;
      const nearAnswered = turfPoint([answered.lng, answered.lat]);
      expect(booleanPointInPolygon(nearAnswered, region)).toBe(false);

      for (const other of sevenPois) {
        if (other.id === answered.id) continue;
        const nearOther = turfPoint([other.lng, other.lat]);
        expect(booleanPointInPolygon(nearOther, region)).toBe(true);
      }
    }
  });

  it("EXYS 24-hospital tentacle resolves elim shade with answered site clear", async () => {
    // Live pending a4ad8efe-90d3-46cb-a803-b37ef2e307e2 / session EXYS (stuck answered, no shade).
    clearVoronoiCellCacheForTests();
    clearTentacleEliminationCacheForTests();

    const pois = exysHospitalTentacle.pois as TentaclePoi[];
    const dublinGameArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-6.4, 53.2],
          [-6.1, 53.2],
          [-6.1, 53.5],
          [-6.4, 53.5],
          [-6.4, 53.2],
        ],
      ],
    };
    const anchor: [number, number] = [
      exysHospitalTentacle.center.lat,
      exysHospitalTentacle.center.lng,
    ];
    const answeredId = exysHospitalTentacle.answerPoiId;
    const answered = pois.find((poi) => poi.id === answeredId);
    expect(answered).toBeDefined();

    const json = await tentacleEliminationJsonForAnswer({
      anchor,
      radiusMeters: exysHospitalTentacle.radiusMeters,
      pois,
      answeredPoiId: answeredId,
      outOfReach: false,
      gameArea: dublinGameArea,
    });

    expect(json).toBeDefined();
    const region = JSON.parse(json!) as Feature<Polygon | MultiPolygon>;
    expect(region.geometry.type).toMatch(POLYGON_OR_MULTIPOLYGON);

    const answeredPoint = turfPoint([answered!.lng, answered!.lat]);
    expect(booleanPointInPolygon(answeredPoint, region)).toBe(false);
  });

  it("returns elim JSON for POI lists above the former 64 cap", async () => {
    const overBudget: TentaclePoi[] = Array.from(
      { length: TENTACLE_POI_MAX + 1 },
      (_, index) => ({
        id: `poi-${index}`,
        name: `POI ${index}`,
        lat: 51.45 + index * 0.0001,
        lng: -0.15 + index * 0.0001,
        category: "museum",
      }),
    );

    await expect(
      tentacleEliminationJsonForAnswer({
        anchor: [51.45, -0.15],
        radiusMeters: oneMileMeters,
        pois: overBudget,
        answeredPoiId: "poi-0",
        outOfReach: false,
        gameArea: sampleGameArea,
      }),
    ).resolves.not.toBeUndefined();
  });

  it("persist-slim failure does not use the POI refuse copy", async () => {
    const slimSpy = vi
      .spyOn(persistSlim, "persistSlimPolygonFeature")
      .mockReturnValue({
        ok: false,
        message: MEASURING_PERSIST_OVER_BUDGET_MESSAGE,
      });

    const json = await tentacleEliminationJsonForAnswer({
      anchor: [51.45, -0.15],
      radiusMeters: oneMileMeters,
      pois: [
        {
          id: "poi-0",
          name: "POI 0",
          lat: 51.45,
          lng: -0.15,
          category: "museum",
        },
        {
          id: "poi-1",
          name: "POI 1",
          lat: 51.46,
          lng: -0.14,
          category: "museum",
        },
      ],
      answeredPoiId: "poi-0",
      outOfReach: false,
      gameArea: sampleGameArea,
    });

    expect(json).toBeUndefined();
    expect(slimSpy).toHaveBeenCalled();
    expect(MEASURING_PERSIST_OVER_BUDGET_MESSAGE).not.toBe(
      TENTACLE_POI_OVER_BUDGET_MESSAGE,
    );
    slimSpy.mockRestore();
  });

  it("Dublin-like 8-POI grid: answered site stays clear, every other site is shaded", async () => {
    clearVoronoiCellCacheForTests();
    clearTentacleEliminationCacheForTests();

    const gridSpacing = 0.003;
    const gridOrigin = { lat: 53.35, lng: -6.26 };
    const gridPois: TentaclePoi[] = Array.from({ length: 8 }, (_, index) => {
      const row = Math.floor(index / 4);
      const col = index % 4;
      return {
        id: `grid-${index}`,
        name: `Grid POI ${index}`,
        lat: gridOrigin.lat + row * gridSpacing,
        lng: gridOrigin.lng + col * gridSpacing,
        category: "museum",
      };
    });

    const gridGameArea: GameArea = {
      type: "Polygon",
      coordinates: [
        [
          [-6.4, 53.2],
          [-6.1, 53.2],
          [-6.1, 53.5],
          [-6.4, 53.5],
          [-6.4, 53.2],
        ],
      ],
    };

    const anchor: [number, number] = [
      gridOrigin.lat + 0.5 * gridSpacing,
      gridOrigin.lng + 1.5 * gridSpacing,
    ];

    for (const answered of gridPois) {
      const region = await buildTentacleEliminationRegion(
        anchor,
        oneMileMeters,
        gridPois,
        answered.id,
        gridGameArea,
      );

      expect(region, `no region for ${answered.id}`).not.toBeNull();

      const answeredPoint = turfPoint([answered.lng, answered.lat]);
      expect(
        booleanPointInPolygon(answeredPoint, region!),
        `${answered.id} should stay clear of its own elimination region`,
      ).toBe(false);

      for (const other of gridPois) {
        if (other.id === answered.id) continue;
        const otherPoint = turfPoint([other.lng, other.lat]);
        expect(
          booleanPointInPolygon(otherPoint, region!),
          `${other.id} should be shaded when ${answered.id} is answered`,
        ).toBe(true);
      }
    }
  });
});
