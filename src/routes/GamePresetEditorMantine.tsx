import { Anchor, Container, Stack } from "@mantine/core";
import { Link } from "react-router-dom";
import { GamePresetEditorContent } from "./GamePresetEditorContent";

export function GamePresetEditorMantine() {
  return (
    <Container size="sm" py="xl" data-player-ux-world="mantine">
      <Stack gap="md">
        <Anchor component={Link} to="/presets" size="sm">
          Back
        </Anchor>
        {/* Survey root wraps form controls + framing map island (Create pattern). */}
        <div data-player-ux-world="survey" className="flex flex-col gap-4">
          <GamePresetEditorContent />
        </div>
      </Stack>
    </Container>
  );
}
