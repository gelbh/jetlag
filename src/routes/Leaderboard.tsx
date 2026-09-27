import { Anchor, Text } from "@mantine/core";
import { RequireUsername } from "../components/auth/RequireUsername";
import { LeaderboardBody } from "../components/leaderboard/LeaderboardBody";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import {
  isLeaderboardMockEnabled,
  setLeaderboardMockEnabled,
} from "@/services/profile/leaderboardMock";

export function Leaderboard() {
  const mockEnabled = isLeaderboardMockEnabled();

  return (
    <EntryRouteShell title="Leaderboard">
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
        <LeaderboardBody />
      ) : (
        <RequireUsername
          continuePath="/leaderboard"
          signInDescription="Sign in with a username to opt into leaderboards and view rankings."
        >
          <LeaderboardBody />
        </RequireUsername>
      )}
    </EntryRouteShell>
  );
}
