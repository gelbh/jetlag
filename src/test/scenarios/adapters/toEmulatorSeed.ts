import { getScenario } from "../catalog";
import type { ScenarioDefinition, ScenarioId } from "../types";
import { seedUsernameProfileDocs } from "./seedUsernameProfileDocs";

function resolveScenario(
  scenarioOrId: ScenarioId | ScenarioDefinition,
): ScenarioDefinition {
  return typeof scenarioOrId === "string"
    ? getScenario(scenarioOrId)
    : scenarioOrId;
}

/**
 * Seeds optional emulator username/profile docs for a scenario.
 * No-op when the scenario has no `emulator.usernames`.
 */
export async function toEmulatorSeed(
  scenarioOrId: ScenarioId | ScenarioDefinition,
): Promise<void> {
  const scenario = resolveScenario(scenarioOrId);
  const usernames = scenario.emulator?.usernames;
  if (!usernames?.length) {
    return;
  }
  for (const entry of usernames) {
    await seedUsernameProfileDocs(entry.uid, entry.username);
  }
}
