import { getScenario } from "../catalog";
import type {
  PlayerRole,
  ScenarioDefinition,
  ScenarioId,
  ScenarioMapSpec,
  ScenarioSessionSpec,
} from "../types";

export interface LocalStorageSeedOverrides {
  code?: string;
  myRole?: PlayerRole;
  gameSize?: ScenarioSessionSpec["gameSize"];
  sessionId?: string;
  hidingPeriodMinutes?: number;
  memberRoles?: ScenarioSessionSpec["memberRoles"];
}

export interface LocalStorageSeed {
  sessionBlob: string;
  mapBlob: string;
  annotationsBlob: string;
  clearTimer: true;
}

const DEFAULT_MAP: ScenarioMapSpec = {
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
};

function resolveScenario(scenarioOrId: ScenarioId | ScenarioDefinition): ScenarioDefinition {
  return typeof scenarioOrId === "string" ? getScenario(scenarioOrId) : scenarioOrId;
}

export function toLocalStorageSeed(
  scenarioOrId: ScenarioId | ScenarioDefinition,
  overrides: LocalStorageSeedOverrides = {},
): LocalStorageSeed {
  const scenario = resolveScenario(scenarioOrId);
  const { myRole: specRole, ...baseSession } = scenario.session;
  const sessionState = {
    ...baseSession,
    id: overrides.sessionId ?? baseSession.id,
    code: overrides.code ?? baseSession.code,
    gameSize: overrides.gameSize ?? baseSession.gameSize,
    ...(overrides.hidingPeriodMinutes !== undefined
      ? { hidingPeriodMinutes: overrides.hidingPeriodMinutes }
      : {}),
    ...(overrides.memberRoles ? { memberRoles: overrides.memberRoles } : {}),
  };
  const myRole = overrides.myRole ?? specRole ?? "seeker";
  const mapState = scenario.map ?? DEFAULT_MAP;

  return {
    sessionBlob: JSON.stringify({
      state: {
        session: sessionState,
        myRole,
        myUid: null,
      },
      version: 0,
    }),
    mapBlob: JSON.stringify({
      state: mapState,
      version: 0,
    }),
    annotationsBlob: JSON.stringify({
      state: { annotations: scenario.annotations ?? [] },
      version: 0,
    }),
    clearTimer: true,
  };
}
