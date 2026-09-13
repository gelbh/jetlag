import { Anchor, Container, Stack, Text, Title } from "@mantine/core";
import { Link } from "react-router-dom";
import { GamePresetListContent } from "./GamePresetListContent";

export function GamePresetListMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/" size="sm">
          Back
        </Anchor>
        <Title order={1}>Custom games</Title>
        <Text c="dimmed">
          Saved templates pre-fill create session. Game area can be added when
          hosting.
        </Text>
        <div data-player-ux-world="survey" className="flex flex-col gap-4">
          <GamePresetListContent />
        </div>
      </Stack>
    </Container>
  );
}
