import { useEffect, useState } from "react";
import { Box, Stack, Text, Title } from "@mantine/core";
import { ToolStatusBlockMantine } from "@/components/session/status/ToolStatusBlockMantine";
import { SyncBlock } from "@/components/session/status/SyncBlock";
import { ScreenNav } from "@/components/ui/layout/ScreenNav";
import {
  PLAYER_UI_MANTINE_STORAGE_KEY,
  setPlayerUiMantineEnabled,
} from "@/hooks/feature/usePlayerUiMantine";
import {
  STATUS_DOCK_SCENARIOS,
  assertStatusDockScenarioIdsUnique,
  type StatusDockScenario,
} from "@/dev/statusDockScenarios";

assertStatusDockScenarioIdsUnique();

function ScenarioRow({ scenario }: { scenario: StatusDockScenario }) {
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const frameStyle = scenario.narrowFrame
    ? { width: 360, maxWidth: "100%" }
    : { width: "100%", maxWidth: 420 };

  return (
    <Box
      component="section"
      aria-label={scenario.title}
      style={{
        borderBottom: "1px solid oklch(from var(--color-rule) l c h / 0.55)",
        paddingBlock: "1.25rem",
      }}
    >
      <Stack gap={6} mb="sm">
        <Text fw={700} size="sm" style={{ color: "var(--color-field-ink)" }}>
          {scenario.title}
        </Text>
        <Text size="xs" style={{ color: "var(--color-field-ink-muted)" }}>
          {scenario.note}
          {scenario.narrowFrame ? " · framed at 360px" : null}
        </Text>
      </Stack>
      <Box
        style={{
          ...frameStyle,
          // Map-ish wash so frost reads like over MapLibre.
          background:
            "linear-gradient(160deg, oklch(0.42 0.04 230), oklch(0.28 0.03 200))",
          borderRadius: 16,
          padding: 12,
        }}
      >
        <ToolStatusBlockMantine
          sessionCode={scenario.sessionCode}
          playerRole={scenario.playerRole}
          activeTool="none"
          timerState={scenario.timerState}
          timerRunning={scenario.timerRunning}
          timerHasStarted={scenario.timerHasStarted}
          timerSyncing={scenario.timerSyncing}
          canStartGame={scenario.canStartGame}
          onStartGame={() => undefined}
          sessionRules={scenario.sessionRules}
          pendingQuestions={scenario.pendingQuestions}
          myUid={scenario.myUid}
          hostUid={scenario.hostUid}
          seekerLocations={scenario.seekerLocations}
          onCancelWalkingQuestion={() => undefined}
          timerMenuOpen={timerMenuOpen}
          onOpenTimerMenu={() => setTimerMenuOpen((open) => !open)}
          moveInProgress={scenario.moveInProgress}
          forceNarrow={scenario.narrowFrame}
          headerLeading={<ScreenNav variant="home" placement="inline" />}
          syncSlot={
            <SyncBlock
              syncStatus={scenario.syncStatus}
              queuedWrites={scenario.queuedWrites}
              message={scenario.syncMessage}
              placement="segment"
              compact={scenario.narrowFrame}
            />
          }
        />
      </Box>
    </Box>
  );
}

/**
 * Dev-only gallery of status-island states.
 * Open `/dev/status-dock` with Vite; ensures `jl.playerUi.mantine=1` for Sync segment.
 */
export function StatusDockGallery() {
  useEffect(() => {
    setPlayerUiMantineEnabled(true);
  }, []);

  return (
    <Box
      component="main"
      px="md"
      py="lg"
      maw={520}
      mx="auto"
      style={{ color: "var(--color-field-ink)" }}
    >
      <Stack gap={4} mb="lg">
        <Title order={2} size="h3">
          Status dock scenarios
        </Title>
        <Text size="sm" style={{ color: "var(--color-field-ink-muted)" }}>
          Mock fixtures for the Mantine top island. Flag set to{" "}
          <code>{PLAYER_UI_MANTINE_STORAGE_KEY}=1</code>. Resize the window under
          380px to exercise compact layout on non-framed rows.
        </Text>
      </Stack>
      {STATUS_DOCK_SCENARIOS.map((scenario) => (
        <ScenarioRow key={scenario.id} scenario={scenario} />
      ))}
    </Box>
  );
}
