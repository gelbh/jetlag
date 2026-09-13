import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { RequireUsername } from "../components/auth/RequireUsername";
import { LeaderboardBoard } from "./LeaderboardBoard";

export function LeaderboardMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Home
        </Anchor>
        <Title order={1}>Leaderboard</Title>
        <Text c="dimmed">
          Opt-in ranked boards by game size and role. Username only, no account
          details.
        </Text>

        <RequireUsername
          continuePath="/leaderboard"
          signInDescription="Sign in with a username to opt into leaderboards and view rankings."
        >
          <div data-player-ux-world="survey">
            <LeaderboardBoard />
          </div>
        </RequireUsername>
      </Stack>
    </Container>
  );
}
