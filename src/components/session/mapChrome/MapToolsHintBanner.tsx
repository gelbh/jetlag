import { useState } from "react";
import { Box, Button, Text } from "@mantine/core";
import { HudBanner } from "../../ui/hud/HudBanner";
import {
  iosCompactGrayStyles,
  iosMapChromeSurfaceStyles,
} from "@/components/ui/apple/iosEntryChrome";

const STORAGE_KEY = "jetlag.mapToolsHintDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface MapToolsHintBannerProps {
  hidden?: boolean;
}

export function MapToolsHintBanner({ hidden = false }: MapToolsHintBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);
  const visible = !hidden && !dismissed;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setDismissed(true);
  };

  return (
    <HudBanner
      visible={visible}
      onDismiss={dismiss}
      className="pointer-events-none fixed inset-x-0 bottom-[var(--map-panel-bottom)] z-[var(--z-banner)] px-3"
    >
      <Box
        className="pointer-events-auto mx-auto flex max-w-md items-start gap-3 px-3 py-2.5"
        style={{
          ...iosMapChromeSurfaceStyles,
          borderRadius: 14,
        }}
      >
        <Text
          size="sm"
          style={{
            flex: 1,
            lineHeight: 1.4,
            color: "var(--color-field-ink-muted)",
            textWrap: "pretty",
          }}
        >
          Question asks open as map HUD chrome (cue · chips/catalog · primed
          send). Zone and pin live under{" "}
          <Text
            span
            fw={600}
            style={{ color: "var(--color-field-ink)" }}
          >
            Draw
          </Text>
          .
        </Text>
        <Button
          type="button"
          size="compact-sm"
          onClick={dismiss}
          styles={iosCompactGrayStyles}
        >
          Close
        </Button>
      </Box>
    </HudBanner>
  );
}
