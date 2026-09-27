import { LOCAL_SESSION_ID } from "../../../domain/map/annotations";
import { DUBLIN_CITY_GAME_AREA } from "../../fixtures/dublinGameArea";
import type { ScenarioDefinition } from "../types";

export const DUBLIN_LOCAL_MAP_SCENARIO: ScenarioDefinition = {
  id: "dublin-local-map",
  title: "Dublin local map",
  description:
    "Canonical local Dublin city play area with a seeded seeker session for unit, e2e, and manual map work.",
  tags: ["unit", "e2e", "manual"],
  session: {
    id: LOCAL_SESSION_ID,
    code: "TEST",
    gameArea: DUBLIN_CITY_GAME_AREA,
    createdAt: "2026-01-01T00:00:00.000Z",
    memberUids: [],
    tier: "free",
    gameSize: "medium",
    myRole: "seeker",
  },
  map: {
    keepScreenAwake: false,
    distanceUnit: "imperial",
    mapStyle: "standard",
    layerVisibility: {
      radar: true,
      thermometer: true,
      measuring: true,
      matching: true,
      zone: true,
      pin: true,
      tentacle: true,
      transit: true,
    },
    lowPowerMode: true,
  },
  annotations: [],
  entryPath: "/map",
};
