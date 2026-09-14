import { useMemo, useState } from "react";
import { Box, Container, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { RequireUsername } from "@/components/auth/RequireUsername";
import {
  IosInsetGroup,
  IosSectionLabel,
} from "@/components/ui/apple/iosEntryChrome";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import type { LeaderboardRole } from "@/domain/game/leaderboard";
import { playerRoleLabel } from "@/domain/session/players/playerRole";

const ROLE_TABS: Array<{ value: LeaderboardRole; label: string }> = [
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "seeker", label: playerRoleLabel("seeker") },
];

const STATS_MOCK_STORAGE_KEY = "jl.stats.mock";

type MockStatCell = { label: string; value: string };

function isStatsMockEnabled(): boolean {
  try {
    return (
      import.meta.env.DEV &&
      localStorage.getItem(STATS_MOCK_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}

function mockCellsForRole(role: LeaderboardRole): MockStatCell[] {
  if (role === "hider") {
    return [
      { label: "Rounds", value: "14" },
      { label: "Wins", value: "6" },
      { label: "Hiding time", value: "18:40" },
      { label: "Questions", value: "31" },
    ];
  }
  return [
    { label: "Rounds", value: "17" },
    { label: "Wins", value: "8" },
    { label: "Seek time", value: "22:05" },
    { label: "Questions", value: "44" },
  ];
}

const segmentedStyles = {
  root: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
    border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
    borderRadius: 12,
    padding: 2,
  },
  label: {
    color: "var(--color-field-ink)",
    fontWeight: 510,
    fontSize: "0.8125rem",
    paddingInline: 8,
  },
  indicator: {
    backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
    borderRadius: 10,
  },
} as const;

function StatsBody({ roleTab }: { roleTab: LeaderboardRole }) {
  const mockEnabled = isStatsMockEnabled();
  const cells = useMemo(
    () => (mockEnabled ? mockCellsForRole(roleTab) : null),
    [mockEnabled, roleTab],
  );

  return (
    <Stack gap={14}>
      <IosSectionLabel>
        {`${playerRoleLabel(roleTab)} · All sizes`}
      </IosSectionLabel>

      {cells ? (
        <IosInsetGroup>
          <Box
            role="tabpanel"
            aria-label={`${playerRoleLabel(roleTab)} stats`}
            px="sm"
            py="md"
          >
            <Group gap={0} wrap="wrap">
              {cells.map((cell, index) => (
                <Stack
                  key={cell.label}
                  gap={4}
                  align="center"
                  style={{
                    flex: "1 1 45%",
                    minWidth: "40%",
                    paddingBlock: 10,
                    borderInlineStart:
                      index % 2 === 0
                        ? undefined
                        : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                  }}
                >
                  <Text
                    fw={700}
                    c="var(--color-field-ink)"
                    style={{
                      fontSize: "1.25rem",
                      letterSpacing: "-0.02em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {cell.value}
                  </Text>
                  <Text size="xs" c="var(--color-field-ink-muted)">
                    {cell.label}
                  </Text>
                </Stack>
              ))}
            </Group>
          </Box>
        </IosInsetGroup>
      ) : (
        <IosInsetGroup>
          <Box
            role="tabpanel"
            aria-label={`${playerRoleLabel(roleTab)} stats`}
            px="md"
            py="xl"
          >
            <Text
              size="sm"
              ta="center"
              c="var(--color-field-ink-muted)"
              style={{ lineHeight: 1.4, textWrap: "pretty" }}
            >
              No completed rounds yet. Finish a synced session as{" "}
              {playerRoleLabel(roleTab).toLowerCase()} to see distance, phase
              time, and question stats here.
            </Text>
          </Box>
        </IosInsetGroup>
      )}

      {mockEnabled ? (
        <Text size="xs" c="var(--color-signal)" px={4}>
          Mock stats on (`jl.stats.mock=1`).
        </Text>
      ) : null}
    </Stack>
  );
}

export function StatsMantine() {
  const [roleTab, setRoleTab] = useState<LeaderboardRole>("hider");
  const mockEnabled = isStatsMockEnabled();

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Stats" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        <Stack gap={18}>
          <Text
            size="sm"
            c="var(--color-field-ink-muted)"
            style={{ lineHeight: 1.4, textWrap: "pretty" }}
          >
            Personal round history and aggregates by role.
          </Text>

          <SegmentedControl
            fullWidth
            value={roleTab}
            onChange={(value) => setRoleTab(value as LeaderboardRole)}
            data={ROLE_TABS}
            aria-label="Stats role"
            styles={segmentedStyles}
          />

          {mockEnabled ? (
            <StatsBody roleTab={roleTab} />
          ) : (
            <RequireUsername
              chrome="ios"
              continuePath="/stats"
              signInDescription="Sign in with a username to save personal stats across sessions."
            >
              <StatsBody roleTab={roleTab} />
            </RequireUsername>
          )}
        </Stack>
      </Container>
    </EntryScreenLayout>
  );
}
