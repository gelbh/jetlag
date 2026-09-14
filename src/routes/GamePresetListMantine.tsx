import { Container, Stack, Text } from "@mantine/core";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { GamePresetListIosBody } from "./GamePresetListIosBody";

export function GamePresetListMantine() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Custom games" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        <Stack gap={22}>
          <Text
            c="var(--color-field-ink-muted)"
            size="sm"
            style={{ lineHeight: 1.35, textWrap: "pretty", maxWidth: "22rem" }}
          >
            Saved templates pre-fill create session. Game area can be added when
            hosting.
          </Text>
          <GamePresetListIosBody />
        </Stack>
      </Container>
    </EntryScreenLayout>
  );
}
