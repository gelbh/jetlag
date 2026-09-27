import type { ScenarioDefinition, ScenarioId, ScenarioTag } from "./types";
import { DUBLIN_LOCAL_MAP_SCENARIO } from "./worlds/dublin-local-map";

export { DUBLIN_LOCAL_MAP_SCENARIO };

const SCENARIOS: Record<ScenarioId, ScenarioDefinition> = {
  "dublin-local-map": DUBLIN_LOCAL_MAP_SCENARIO,
};

export function getScenario(id: ScenarioId): ScenarioDefinition {
  const scenario = SCENARIOS[id];
  if (!scenario) {
    throw new Error(`Unknown scenario id: ${id}`);
  }
  return scenario;
}

export function listScenarios(filter?: {
  tag?: ScenarioTag;
}): ScenarioDefinition[] {
  const all = Object.values(SCENARIOS);
  if (!filter?.tag) {
    return all;
  }
  return all.filter((scenario) => scenario.tags.includes(filter.tag!));
}
