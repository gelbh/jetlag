import { Anchor, Container, Text } from "@mantine/core";
import { RequireUsername } from "../components/auth/RequireUsername";
import { FriendsIosBody } from "../components/friends/FriendsIosBody";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import {
  isFriendsMockEnabled,
  resetFriendsMock,
} from "@/services/profile/friendsMock";

export function FriendsMantine() {
  const mockEnabled = isFriendsMockEnabled();

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Friends" />
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
            Mock friends data on. Search{" "}
            <Text span fw={590} c="var(--color-field-ink)">
              bo
            </Text>{" "}
            for results. Friend sheet invites use session{" "}
            <Text span fw={590} c="var(--color-field-ink)">
              PLAY
            </Text>
            .{" "}
            <Anchor
              component="button"
              type="button"
              size="xs"
              c="var(--color-flag)"
              onClick={() => {
                resetFriendsMock();
                window.location.reload();
              }}
            >
              Reset seed
            </Anchor>
          </Text>
        ) : null}

        {mockEnabled ? (
          <FriendsIosBody />
        ) : (
          <RequireUsername
            chrome="ios"
            continuePath="/friends"
            signInDescription="Sign in to add friends and see their stats on friends leaderboards."
          >
            <FriendsIosBody />
          </RequireUsername>
        )}
      </Container>
    </EntryScreenLayout>
  );
}
