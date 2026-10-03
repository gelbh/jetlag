import { toLocalStorageSeed } from "./adapters/toLocalStorageSeed";
import { getScenario, listScenarios } from "./catalog";
import { formatClearSeedRecipeLines } from "./seedStorage";
import type { ScenarioId } from "./types";

export type WorldIo = {
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
};

function printUsage(write: (line: string) => void): void {
  write(`Usage:
  npm run world -- list
  npm run world -- apply <scenarioId>
  npm run world -- reset`);
}

/** Headless Wave 6 catalog CLI: list / apply / reset (no React/Playwright). */
export function runWorld(
  argv: string[],
  { stdout = console.log, stderr = console.error }: WorldIo = {},
): number {
  const [command, scenarioId] = argv;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printUsage(stdout);
    return 0;
  }

  if (command === "reset") {
    stdout("Clear scenario seed keys only (browser console or DevTools):");
    for (const line of formatClearSeedRecipeLines()) {
      stdout(line);
    }
    stdout("");
    stdout("Does not wipe unrelated storage. Safe when no prior apply.");
    return 0;
  }

  if (command === "list") {
    for (const scenario of listScenarios()) {
      stdout(`${scenario.id}\t${scenario.title}\t${scenario.tags.join(",")}`);
    }
    return 0;
  }

  if (command === "apply") {
    if (!scenarioId) {
      stderr("Missing scenario id.");
      printUsage(stderr);
      return 1;
    }
    try {
      getScenario(scenarioId as ScenarioId);
    } catch {
      const known = listScenarios()
        .map((s) => s.id)
        .join(", ");
      stderr(`Unknown scenario id: ${scenarioId}`);
      stderr(`Known ids: ${known || "(none)"}`);
      return 1;
    }
    const seed = toLocalStorageSeed(scenarioId as ScenarioId);
    stdout(JSON.stringify(seed, null, 2));
    return 0;
  }

  stderr(`Unknown command: ${command}`);
  printUsage(stderr);
  return 1;
}
