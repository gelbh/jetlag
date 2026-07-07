import type { AnnotationRecord, GameArea, SessionRecord } from "../../domain/map/annotations";
import { LOCAL_SESSION_ID } from "../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "./dublinGameArea";

export { DUBLIN_CITY_GAME_AREA };

export function createTestGameArea(
  overrides: Partial<GameArea> = {},
): GameArea {
  return {
    ...DUBLIN_CITY_GAME_AREA,
    ...overrides,
  } as GameArea;
}

export function createTestSession(
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    id: LOCAL_SESSION_ID,
    code: "TEST",
    gameArea: createTestGameArea(),
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [],
    ...overrides,
  };
}

export function createTestRemoteSession(
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return createTestSession({
    id: "remote-session-1",
    code: "ABCD",
    memberUids: ["user-host"],
    hostUid: "user-host",
    tier: "free",
    ...overrides,
  });
}

export function createTestPinAnnotation(
  overrides: Partial<AnnotationRecord> = {},
): AnnotationRecord {
  return {
    id: "ann-pin-1",
    sessionId: LOCAL_SESSION_ID,
    type: "pin",
    status: "active",
    geometry: {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [-6.26, 53.35],
      },
    },
    metadata: {
      createdAt: "2026-01-01T00:00:00.000Z",
      label: "Test pin",
      color: "#ff0000",
    },
    ...overrides,
  };
}
