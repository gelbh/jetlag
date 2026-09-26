import type {
  AnnotationRecord,
  GameArea,
  SessionRecord,
} from "../../domain/map/annotations";

export type ScenarioTag = "unit" | "e2e" | "manual" | "emulator";

export type ScenarioId = "dublin-local-map";

export type PlayerRole = "seeker" | "hider";

export interface ScenarioSessionSpec {
  id: string;
  code: string;
  gameArea: GameArea;
  createdAt: string;
  memberUids: string[];
  tier?: SessionRecord["tier"];
  gameSize?: SessionRecord["gameSize"];
  hidingPeriodMinutes?: number;
  memberRoles?: SessionRecord["memberRoles"];
  hostUid?: string;
  myRole?: PlayerRole;
}

export interface ScenarioMapSpec {
  keepScreenAwake: boolean;
  distanceUnit: "imperial" | "metric";
  mapStyle: "standard" | string;
  layerVisibility: Record<string, boolean>;
  lowPowerMode: boolean;
}

export interface ScenarioEmulatorSpec {
  usernames?: Array<{ uid: string; username: string }>;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  description: string;
  tags: ScenarioTag[];
  session: ScenarioSessionSpec;
  map?: ScenarioMapSpec;
  annotations?: AnnotationRecord[];
  emulator?: ScenarioEmulatorSpec;
  entryPath: string;
}
