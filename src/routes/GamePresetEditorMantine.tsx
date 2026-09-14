import { Container } from "@mantine/core";
import { useParams } from "react-router-dom";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import { GamePresetEditorIosContent } from "./GamePresetEditorIosContent";

export function GamePresetEditorMantine() {
  const { id } = useParams();
  const title = id ? "Edit preset" : "New preset";

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title={title} backTo="/presets" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        data-player-ux-world="mantine"
      >
        <GamePresetEditorIosContent />
      </Container>
    </EntryScreenLayout>
  );
}
