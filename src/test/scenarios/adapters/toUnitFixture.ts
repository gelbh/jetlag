import type { AnnotationRecord, SessionRecord } from "../../../domain/map/annotations";
import { getScenario } from "../catalog";
import type { PlayerRole, ScenarioDefinition, ScenarioId, ScenarioSessionSpec } from "../types";

export type UnitFixtureOverrides = Partial<SessionRecord> & {
  myRole?: PlayerRole;
  annotations?: AnnotationRecord[];
};

export interface UnitFixture {
  session: SessionRecord;
  annotations: AnnotationRecord[];
  myRole: PlayerRole;
}

function resolveScenario(scenarioOrId: ScenarioId | ScenarioDefinition): ScenarioDefinition {
  return typeof scenarioOrId === "string" ? getScenario(scenarioOrId) : scenarioOrId;
}

function sessionFromSpec(spec: ScenarioSessionSpec): SessionRecord {
  // myRole is scenario metadata, not a SessionRecord field
  const { myRole, ...session } = spec;
  void myRole;
  return session;
}

export function toUnitFixture(
  scenarioOrId: ScenarioId | ScenarioDefinition,
  overrides: UnitFixtureOverrides = {},
): UnitFixture {
  const scenario = resolveScenario(scenarioOrId);
  const { myRole: overrideRole, annotations: overrideAnnotations, ...sessionOverrides } = overrides;
  const session = {
    ...sessionFromSpec(scenario.session),
    ...sessionOverrides,
  };
  return {
    session,
    annotations: overrideAnnotations ?? scenario.annotations ?? [],
    myRole: overrideRole ?? scenario.session.myRole ?? "seeker",
  };
}
