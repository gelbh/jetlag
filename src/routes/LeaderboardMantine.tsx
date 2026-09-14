import { Anchor, Container, Text } from "@mantine/core";
import { RequireUsername } from "../components/auth/RequireUsername";
import { LeaderboardIosBody } from "../components/leaderboard/LeaderboardIosBody";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import {
  isLeaderboardMockEnabled,
  setLeaderboardMockEnabled,
} from "@/services/profile/leaderboardMock";

export function LeaderboardMantine() {
  const mockEnabled = isLeaderboardMockEnabled();

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Leaderboard" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        {mockEnabled ? (
          <Text
            size="xs"
            c="var(--color-signal)"
            mb="sm"
            px={4}
            style={{ lineHeight: 1.35 }}
          >
            Mock leaderboard on. You are{" "}
            <Text span fw={590} c="var(--color-field-ink)">
              you_local
            </Text>
            . Filter{" "}
            <Text span fw={590} c="var(--color-field-ink)">
              ally
            </Text>{" "}
            or open a row for the player sheet.{" "}
            <Anchor
              component="button"
              type="button"
              size="xs"
              c="var(--color-flag)"
              onClick={() => {
                setLeaderboardMockEnabled(false);
                window.location.reload();
              }}
            >
              Turn off mock
            </Anchor>
          </Text>
        ) : null}

        {mockEnabled ? (
          <LeaderboardIosBody />
        ) : (
          <RequireUsername
            chrome="ios"
            continuePath="/leaderboard"
            signInDescription="Sign in with a username to opt into leaderboards and view rankings."
          >
            <LeaderboardIosBody />
          </RequireUsername>
        )}
      </Container>
    </EntryScreenLayout>
  );
}
