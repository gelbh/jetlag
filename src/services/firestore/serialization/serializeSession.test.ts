import { describe, expect, it } from "vitest";
import { BUNDLED_REGION_PACK_GEO_REVISION } from "@/domain/regions/regionPack";
import { DEFAULT_CASTLE_SIEGE_DIALS } from "@/domain/session/castleSiege/dials";
import {
  buildHidingZoneDocument,
  buildSessionDocument,
  deserializeSessionFromFirestore,
  sessionRulesPatchToFirestore,
} from "./serializeSession";
import {
  assertNoNestedArrays,
  deserializeGameAreaFromFirestore,
  serializeGameAreaForFirestore,
} from "./shared";

const sampleGameArea = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-6.3, 53.3],
      [-6.2, 53.3],
      [-6.2, 53.4],
      [-6.3, 53.4],
      [-6.3, 53.3],
    ],
  ],
};

describe("serializeSession", () => {
  it("stores game areas with bounds and geometry json", () => {
    const serialized = serializeGameAreaForFirestore(sampleGameArea);

    expect(serialized).toEqual({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
      geometryJson: JSON.stringify(sampleGameArea),
    });
    expect(serialized).not.toHaveProperty("coordinates");
  });

  it("omits geometryJson when serializeGameAreaForFirestore requests pack play-area mode", () => {
    const serialized = serializeGameAreaForFirestore(sampleGameArea, { omitGeometryJson: true });

    expect(serialized).toEqual({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
    });
    expect(serialized).not.toHaveProperty("geometryJson");
  });

  it("omits gameArea.geometryJson on Firestore create when regionPackId is set", () => {
    const payload = buildSessionDocument(
      "AUS1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      undefined,
      "seeker",
      "large",
      {
        regionPackId: "australia",
        playAreaFromPack: true,
        bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
      },
    );

    const gameArea = payload.gameArea as { geometryJson?: string; south: number };
    expect(gameArea.south).toBe(53.3);
    expect(gameArea).not.toHaveProperty("geometryJson");
    expect(payload.playAreaFromPack).toBe(true);
  });

  it("keeps gameArea.geometryJson when playAreaFromPack is false", () => {
    const payload = buildSessionDocument(
      "FREE",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      undefined,
      "seeker",
      "medium",
      {
        regionPackId: "australia",
        playAreaFromPack: false,
      },
    );

    const gameArea = payload.gameArea as { geometryJson?: string };
    expect(gameArea.geometryJson).toBe(JSON.stringify(sampleGameArea));
  });

  it("reconstructs game areas from stored geometry json", () => {
    const restored = deserializeGameAreaFromFirestore({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
      geometryJson: JSON.stringify(sampleGameArea),
    });

    expect(restored).toEqual(sampleGameArea);
  });

  it("falls back to stored bounds when geometry json is missing", () => {
    const restored = deserializeGameAreaFromFirestore({
      south: 53.3,
      west: -6.3,
      north: 53.4,
      east: -6.2,
    });

    expect(restored.type).toBe("Polygon");
    expect(restored.coordinates[0][0]).toEqual([-6.3, 53.3]);
    expect(restored.coordinates[0]).toHaveLength(5);
  });

  it("builds a Firestore-safe session document", () => {
    const payload = buildSessionDocument(
      "ABCD",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "dublin",
    );

    expect(() => assertNoNestedArrays(payload)).not.toThrow();
    expect(payload.gameArea).not.toHaveProperty("coordinates");
    expect(payload.memberUids).toEqual(["host-uid"]);
    expect(payload.status).toBe("active");
    expect(payload.lastActiveAt).toBe("2026-05-14T00:00:00.000Z");
    expect(payload.tier).toBe("free");
  });

  it("stores premium tier on session documents", () => {
    const payload = buildSessionDocument(
      "ABCD",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "premium",
    );

    expect(payload.tier).toBe("premium");
  });

  it("writes sorted mode array and omits all", () => {
    const omitted = buildSessionDocument(
      "ALL1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "sydney",
      "seeker",
      "medium",
      {},
      undefined,
      undefined,
      { transitStationFilter: "all" },
    );
    expect(omitted).not.toHaveProperty("transitStationFilter");
    expect(omitted.transitMetroId).toBe("sydney");

    const multi = buildSessionDocument(
      "MUL1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "sydney",
      "seeker",
      "medium",
      {},
      undefined,
      undefined,
      { transitStationFilter: ["tram", "metro"] },
    );
    expect(multi.transitStationFilter).toEqual(["metro", "tram"]);

    const restoredOmitted = deserializeSessionFromFirestore("sess-2", {
      ...omitted,
      code: "ALL1",
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
    });
    expect(restoredOmitted.transitStationFilter).toBe("all");
  });

  it("dual-writes single mode as legacy string and restores both shapes", () => {
    const withMetro = buildSessionDocument(
      "MET1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "sydney",
      "seeker",
      "medium",
      {},
      undefined,
      undefined,
      { transitStationFilter: ["metro"] },
    );
    expect(withMetro.transitStationFilter).toBe("metro");

    const restoredFromWire = deserializeSessionFromFirestore("sess-1", {
      ...withMetro,
      code: "MET1",
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
    });
    expect(restoredFromWire.transitStationFilter).toEqual(["metro"]);

    const restoredFromLegacy = deserializeSessionFromFirestore("sess-1b", {
      ...withMetro,
      code: "MET1",
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      transitStationFilter: "metro",
    });
    expect(restoredFromLegacy.transitStationFilter).toEqual(["metro"]);
  });

  it("recovers empty and unknown filter arrays on deserialize", () => {
    const base = buildSessionDocument(
      "BAD1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "sydney",
      "seeker",
      "medium",
      {},
    );

    expect(
      deserializeSessionFromFirestore("sess-empty", {
        ...base,
        code: "BAD1",
        hostUid: "host-uid",
        createdAt: "2026-05-14T00:00:00.000Z",
        transitStationFilter: [],
      }).transitStationFilter,
    ).toBe("all");

    expect(
      deserializeSessionFromFirestore("sess-partial", {
        ...base,
        code: "BAD1",
        hostUid: "host-uid",
        createdAt: "2026-05-14T00:00:00.000Z",
        transitStationFilter: ["metro", "spaceship"],
      }).transitStationFilter,
    ).toEqual(["metro"]);
  });

  it("accepts funicular as dual-written string", () => {
    const multi = buildSessionDocument(
      "FUN1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      "sydney",
      "seeker",
      "medium",
      {},
      undefined,
      undefined,
      { transitStationFilter: ["funicular"] },
    );
    expect(multi.transitStationFilter).toBe("funicular");

    const restored = deserializeSessionFromFirestore("sess-fun", {
      ...multi,
      code: "FUN1",
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
    });
    expect(restored.transitStationFilter).toEqual(["funicular"]);
  });

  it("omits pack customMatchingAreas from Firestore create payload when regionPackId is set", () => {
    const payload = buildSessionDocument(
      "AUS1",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      undefined,
      "seeker",
      "large",
      {
        regionPackId: "australia",
        regionPackSubregionId: "nsw",
        bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
        customMatchingAreas: {
          8: '{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"stateId":"nsw"},"geometry":null}]}',
          9: '{"type":"FeatureCollection","features":[]}',
        },
      },
    );

    expect(payload.regionPackId).toBe("australia");
    expect(payload.regionPackSubregionId).toBe("nsw");
    expect(payload.bundledGeoRevision).toBe(BUNDLED_REGION_PACK_GEO_REVISION);
    expect(payload).not.toHaveProperty("customMatchingAreas");
  });

  it("keeps customMatchingAreas on Firestore payload when regionPackId is absent", () => {
    const areas = { 8: '{"type":"FeatureCollection","features":[]}' };
    const payload = buildSessionDocument(
      "CUST",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      undefined,
      "seeker",
      "medium",
      { customMatchingAreas: areas },
    );

    expect(payload.customMatchingAreas).toEqual(areas);
  });

  it("omits pack customMatchingAreas from rules update payloads", () => {
    const firestore = sessionRulesPatchToFirestore({
      regionPackId: "australia",
      bundledGeoRevision: BUNDLED_REGION_PACK_GEO_REVISION,
      customMatchingAreas: { 8: '{"type":"FeatureCollection","features":[]}' },
    });

    expect(firestore.regionPackId).toBe("australia");
    expect(firestore.bundledGeoRevision).toBe(BUNDLED_REGION_PACK_GEO_REVISION);
    expect(firestore).not.toHaveProperty("customMatchingAreas");
  });

  it("deserializes session tier with free default", () => {
    const session = deserializeSessionFromFirestore("session-1", {
      code: "ABCD",
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      status: "active",
    });

    expect(session.tier).toBe("free");
  });

  it("round-trips regionPackSubregionId on session documents", () => {
    const session = deserializeSessionFromFirestore("session-pack", {
      code: "NYC1",
      gameArea: {
        south: 40.5,
        west: -74.1,
        north: 40.9,
        east: -73.7,
      },
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      status: "active",
      regionPackId: "nyc",
      regionPackSubregionId: "manhattan",
    });

    expect(session.regionPackId).toBe("nyc");
    expect(session.regionPackSubregionId).toBe("manhattan");
  });

  it("deserializes ended sessions without a code field", () => {
    const session = deserializeSessionFromFirestore("session-ended", {
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      endedAt: "2026-05-15T00:00:00.000Z",
      status: "ended",
    });

    expect(session.code).toBe("");
    expect(session.status).toBe("ended");
  });

  it("omits undefined hiding zone fields from Firestore payloads", () => {
    const payload = buildHidingZoneDocument({
      hiderUid: "hider-1",
      sessionId: "session-1",
      stationId: "station-1",
      stationName: "Test Station",
      center: { lat: 53.35, lng: -6.26 },
      radiusMeters: 400,
      geometryJson: '{"type":"Polygon","coordinates":[]}',
      status: "confirmed",
      confirmedAt: "2026-05-14T00:00:00.000Z",
    });

    expect(payload).not.toHaveProperty("originalStation");
    expect(payload).not.toHaveProperty("previousStations");
    expect(payload).not.toHaveProperty("moveInProgress");
    expect(() => assertNoNestedArrays(payload)).not.toThrow();
  });

  it("preserves observer member roles when deserializing sessions", () => {
    const restored = deserializeSessionFromFirestore("session-1", {
      code: "ABCD",
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-1",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-1", "admin-1"],
      memberRoles: {
        "host-1": "seeker",
        "admin-1": "observer",
      },
      gameSize: "medium",
      hidingZoneRadiusMeters: 402,
      tier: "free",
      status: "active",
      timerAccumulatedMs: 0,
    });

    expect(restored.memberRoles).toEqual({
      "host-1": "seeker",
      "admin-1": "observer",
    });
  });

  it("preserves admin member roles when deserializing sessions", () => {
    const restored = deserializeSessionFromFirestore("session-1", {
      code: "ABCD",
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-1",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-1", "admin-1"],
      memberRoles: {
        "host-1": "seeker",
        "admin-1": "admin",
      },
      gameSize: "medium",
      hidingZoneRadiusMeters: 402,
      tier: "free",
      status: "active",
      timerAccumulatedMs: 0,
    });

    expect(restored.memberRoles).toEqual({
      "host-1": "seeker",
      "admin-1": "admin",
    });
  });

  it("deserializes found-hider session fields", () => {
    const restored = deserializeSessionFromFirestore("session-1", {
      code: "ABCD",
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      hostUid: "host-1",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-1"],
      gameSize: "medium",
      hidingZoneRadiusMeters: 402,
      tier: "free",
      status: "active",
      timerAccumulatedMs: 0,
      foundRequestedAt: "2026-05-14T01:00:00.000Z",
      foundRequestedByUid: "seeker-1",
      foundConfirmedAt: "2026-05-14T01:05:00.000Z",
      foundConfirmedByUid: "hider-1",
      gameOutcome: "found",
      gameResultId: "result-1",
      roundNumber: 2,
    });

    expect(restored.foundRequestedByUid).toBe("seeker-1");
    expect(restored.foundConfirmedByUid).toBe("hider-1");
    expect(restored.gameOutcome).toBe("found");
    expect(restored.gameResultId).toBe("result-1");
    expect(restored.roundNumber).toBe(2);
  });

  it("round-trips castleSiege session fields", () => {
    const payload = buildSessionDocument(
      "CS01",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
      "free",
      undefined,
      "observer",
      "medium",
      {},
      "imperial",
      undefined,
      {
        mode: "castleSiege",
        castleSiegeRoles: { "host-uid": "teamA" },
        seriesLength: 3,
        setupMode: "pregame",
        dials: DEFAULT_CASTLE_SIEGE_DIALS,
      },
    );

    expect(payload).toMatchObject({
      mode: "castleSiege",
      memberRoles: { "host-uid": "observer" },
      castleSiegeRoles: { "host-uid": "teamA" },
      seriesLength: 3,
      gameIndex: 1,
      score: { teamA: 0, teamB: 0 },
      setupMode: "pregame",
      dials: DEFAULT_CASTLE_SIEGE_DIALS,
    });

    const restored = deserializeSessionFromFirestore("session-cs", {
      ...payload,
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
      },
      border: {
        geometryJson: JSON.stringify({
          type: "LineString",
          coordinates: [
            [-6.3, 53.3],
            [-6.2, 53.4],
          ],
        }),
      },
      coinAssignment: { teamA: "left", teamB: "right" },
    });

    expect(restored.mode).toBe("castleSiege");
    expect(restored.castleSiegeRoles).toEqual({ "host-uid": "teamA" });
    expect(restored.seriesLength).toBe(3);
    expect(restored.gameIndex).toBe(1);
    expect(restored.score).toEqual({ teamA: 0, teamB: 0 });
    expect(restored.setupMode).toBe("pregame");
    expect(restored.dials).toEqual(DEFAULT_CASTLE_SIEGE_DIALS);
    expect(restored.border?.type).toBe("LineString");
    expect(restored.coinAssignment).toEqual({ teamA: "left", teamB: "right" });
    expect(restored.memberRoles).toEqual({ "host-uid": "observer" });
  });

  it("deserializes castleSiege roleGates team leaders", () => {
    const restored = deserializeSessionFromFirestore("session-cs-gates", {
      code: "CS02",
      hostUid: "host-uid",
      createdAt: "2026-05-14T00:00:00.000Z",
      memberUids: ["host-uid"],
      memberRoles: { "host-uid": "observer" },
      mode: "castleSiege",
      roleGates: {
        version: 1,
        leaders: { teamB: "host-uid" },
      },
      gameArea: {
        south: 53.3,
        west: -6.3,
        north: 53.4,
        east: -6.2,
        geometryJson: JSON.stringify(sampleGameArea),
      },
    });

    expect(restored.roleGates).toEqual({
      version: 1,
      leaders: { teamB: "host-uid" },
    });
  });

  it("omits castleSiege fields from classic session documents", () => {
    const payload = buildSessionDocument(
      "ABCD",
      sampleGameArea,
      "host-uid",
      "2026-05-14T00:00:00.000Z",
    );

    expect(payload).not.toHaveProperty("mode");
    expect(payload).not.toHaveProperty("castleSiegeRoles");
    expect(payload).not.toHaveProperty("seriesLength");
    expect(payload).not.toHaveProperty("gameIndex");
    expect(payload).not.toHaveProperty("score");
    expect(payload).not.toHaveProperty("seriesOutcome");
    expect(payload).not.toHaveProperty("setupMode");
    expect(payload).not.toHaveProperty("dials");
    expect(payload).not.toHaveProperty("arena");
  });
});
