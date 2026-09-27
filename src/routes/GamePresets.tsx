import { Stack, Text } from "@mantine/core";
import { useParams } from "react-router-dom";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import { GamePresetListBody } from "./GamePresetListBody";
import { GamePresetEditorContent } from "./GamePresetEditorContent";

export function GamePresetList() {
  return (
    <EntryRouteShell title="Custom games">
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
    </EntryRouteShell>
  );
}

export function GamePresetEditor() {
  const { id } = useParams();
  const title = id ? "Edit preset" : "New preset";

  return (
    <EntryRouteShell title={title} backTo="/presets">
      <GamePresetEditorContent />
    </EntryRouteShell>
  );
}
