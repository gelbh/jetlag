import { Button, Stack, Text, Title } from "@mantine/core";
import { useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ScreenNav } from "@/components/ui/layout/ScreenNav";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import { toEmulatorSeed } from "@/test/scenarios/adapters/toEmulatorSeed";
import { toLocalStorageSeed } from "@/test/scenarios/adapters/toLocalStorageSeed";
import { getScenario, listScenarios } from "@/test/scenarios/catalog";
import { isDevScenariosEnabled } from "@/test/scenarios/devGate";
import type { ScenarioId } from "@/test/scenarios/types";

export function DevScenarios() {
  const navigate = useNavigate();
  const enabled = isDevScenariosEnabled({
    dev: import.meta.env.DEV,
    emulator: clientEnvUsesFirebaseEmulator(),
  });

  const applyScenario = useCallback(
    async (id: ScenarioId) => {
      const scenario = getScenario(id);
      const seed = toLocalStorageSeed(id);
      localStorage.setItem("jetlag-session", seed.sessionBlob);
      localStorage.setItem("jetlag-map", seed.mapBlob);
      localStorage.setItem("jetlag-annotations", seed.annotationsBlob);
      if (seed.clearTimer) {
        localStorage.removeItem("jetlag-timer");
      }
      if (scenario.tags.includes("emulator") && clientEnvUsesFirebaseEmulator()) {
        await toEmulatorSeed(id);
      }
      navigate(scenario.entryPath);
    },
    [navigate],
  );

  if (!enabled) {
    return <Navigate to="/" replace />;
  }

  const scenarios = listScenarios({ tag: "manual" });

  return (
    <Stack gap="md" p="md" maw={480} mx="auto">
      <ScreenNav backTo="/" placement="inline" />
      <Title order={2}>Dev scenarios</Title>
      <Text size="sm" c="dimmed">
        Apply a named world into localStorage, then open its entry path.
      </Text>
      <Stack gap="sm">
        {scenarios.map((scenario) => (
          <Button
            key={scenario.id}
            variant="light"
            onClick={() => {
              void applyScenario(scenario.id);
            }}
          >
            {scenario.title}
          </Button>
        ))}
      </Stack>
    </Stack>
  );
}
