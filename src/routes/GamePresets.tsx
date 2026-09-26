import { Container, Stack, Text } from "@mantine/core";
import { useParams } from "react-router-dom";
import { EntryHeader } from "@/components/ui/entry/EntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { GamePresetListBody } from "./GamePresetListBody";
import { GamePresetEditorContent } from "./GamePresetEditorContent";

export function GamePresetList() {
  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title="Custom games" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
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
          <GamePresetListBody />
        </Stack>
      </Container>
    </EntryScreenLayout>
  );
}

export function GamePresetEditor() {
  const { id } = useParams();
  const title = id ? "Edit preset" : "New preset";

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <EntryHeader title={title} backTo="/presets" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
      >
        <GamePresetEditorContent />
      </Container>
    </EntryScreenLayout>
  );
}
