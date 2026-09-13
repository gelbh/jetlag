import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { RequireUsername } from "../components/auth/RequireUsername";
import { FriendsPanel } from "../components/friends/FriendsPanel";

export function FriendsMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Home
        </Anchor>
        <Title order={1}>Friends</Title>
        <Text c="dimmed">
          Search by username, send requests, and keep your crew together.
        </Text>

        <RequireUsername
          continuePath="/friends"
          signInDescription="Sign in to add friends and see their stats on friends leaderboards."
        >
          <div data-player-ux-world="survey">
            <FriendsPanel />
          </div>
        </RequireUsername>
      </Stack>
    </Container>
  );
}
