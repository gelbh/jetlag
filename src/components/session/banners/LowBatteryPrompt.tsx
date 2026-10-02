import { Button, Group } from "@mantine/core";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  dismissLowBatteryPromptForSession,
  readLowBatteryPromptDismissed,
  shouldOfferLowPowerMode,
} from "@/domain/device/power/batteryPrompt";
import { useBatteryStatus } from "@/hooks/location/useBatteryStatus";
import { useMapStore } from "@/state/mapStore";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";
import { HudBanner } from "../../ui/hud/HudBanner";

export function LowBatteryPrompt() {
  const location = useLocation();
  const onMap = location.pathname === "/map";
  const battery = useBatteryStatus();
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const [dismissed, setDismissed] = useState(readLowBatteryPromptDismissed);

  if (!onMap) {
    return null;
  }

  const visible = shouldOfferLowPowerMode({
    supported: battery.supported,
    level: battery.level,
    charging: battery.charging,
    lowPowerMode,
    dismissed,
  });

  if (!visible || battery.level === null) {
    return null;
  }

  const percent = Math.round(battery.level * 100);

  const dismiss = () => {
    dismissLowBatteryPromptForSession();
    setDismissed(true);
  };

  const enableLowPowerMode = () => {
    setLowPowerMode(true);
    dismissLowBatteryPromptForSession();
    setDismissed(true);
  };

  return (
    <HudBanner
      visible
      animated={false}
      className="pointer-events-auto fixed inset-x-3 top-[var(--map-banner-top)] z-[var(--z-panel)]"
    >
      <MapFloatSurface
        tone="warn"
        role="dialog"
        aria-labelledby="low-battery-prompt-title"
        aria-describedby="low-battery-prompt-body"
        className="mx-auto max-w-xl"
      >
        <p
          id="low-battery-prompt-title"
          className="font-display text-xs font-semibold uppercase tracking-wide"
        >
          Battery low ({percent}%)
        </p>
        <p
          id="low-battery-prompt-body"
          className="mt-1 text-pretty text-sm leading-snug text-ink-secondary"
        >
          Switch to low power mode to reduce GPS polling, live transit, and background downloads
          while keeping core game sync.
        </p>
        <Group gap="sm" mt="sm" wrap="wrap">
          <Button type="button" variant="filled" size="md" flex={1} onClick={enableLowPowerMode}>
            Enable low power
          </Button>
          <Button type="button" variant="default" size="md" flex={1} onClick={dismiss}>
            Not now
          </Button>
        </Group>
      </MapFloatSurface>
    </HudBanner>
  );
}
