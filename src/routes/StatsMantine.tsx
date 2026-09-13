import { useState } from "react";
import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { RequireUsername } from "../components/auth/RequireUsername";
import { EmptyState } from "../components/ui/feedback/EmptyState";
import { SegmentControl } from "../components/ui/forms/SegmentControl";
import type { LeaderboardRole } from "../domain/game/leaderboard";
import { playerRoleLabel } from "../domain/session/players/playerRole";

const ROLE_TABS: Array<{ value: LeaderboardRole; label: string }> = [
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "seeker", label: playerRoleLabel("seeker") },
];

export function StatsMantine() {
  const [roleTab, setRoleTab] = useState<LeaderboardRole>("hider");

  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Home
        </Anchor>
        <Title order={1}>Stats</Title>
        <Text c="dimmed">
          Personal round history and aggregates by role.
        </Text>

        <RequireUsername continuePath="/stats">
          <div data-player-ux-world="survey">
            <Stack gap="md">
              <SegmentControl
                value={roleTab}
                options={ROLE_TABS}
                onChange={setRoleTab}
                aria-label="Stats role"
              />

              <div
                role="tabpanel"
                aria-label={`${playerRoleLabel(roleTab)} stats`}
              >
                <Text size="sm" tt="uppercase" fw={600} c="dimmed" mb="xs">
                  {playerRoleLabel(roleTab)} · All sizes
                </Text>
                <EmptyState>
                  No completed rounds yet. Finish a synced session as{" "}
                  {playerRoleLabel(roleTab).toLowerCase()} to see distance, phase
                  time, and question stats here.
                </EmptyState>
              </div>
            </Stack>
          </div>
        </RequireUsername>
      </Stack>
    </Container>
  );
}
