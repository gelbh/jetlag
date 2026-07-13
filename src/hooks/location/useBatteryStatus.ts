import { useEffect, useState } from "react";
import {
  LOW_BATTERY_RECOVERY_LEVEL,
  clearLowBatteryPromptDismissal,
} from "../../domain/device/batteryPrompt";

function supportsBatteryEvents(
  battery: BatteryManagerLike,
): battery is BatteryManagerLike {
  return (
    typeof battery.addEventListener === "function" &&
    typeof battery.removeEventListener === "function"
  );
}

interface BatteryManagerLike {
  level: number;
  charging: boolean;
  addEventListener: (
    type: "levelchange" | "chargingchange",
    listener: () => void,
  ) => void;
  removeEventListener: (
    type: "levelchange" | "chargingchange",
    listener: () => void,
  ) => void;
}

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>;
};

export interface BatteryStatus {
  supported: boolean;
  level: number | null;
  charging: boolean | null;
}

const INITIAL_STATUS: BatteryStatus = {
  supported: false,
  level: null,
  charging: null,
};

export function useBatteryStatus(): BatteryStatus {
  const [status, setStatus] = useState<BatteryStatus>(INITIAL_STATUS);

  useEffect(() => {
    const navigatorWithBattery = navigator as NavigatorWithBattery;
    if (!navigatorWithBattery.getBattery) {
      return;
    }

    let cancelled = false;
    let battery: BatteryManagerLike | null = null;

    const publish = (next: BatteryManagerLike) => {
      if (cancelled) {
        return;
      }

      if (next.charging || next.level >= LOW_BATTERY_RECOVERY_LEVEL) {
        clearLowBatteryPromptDismissal();
      }

      setStatus({
        supported: true,
        level: next.level,
        charging: next.charging,
      });
    };

    const handleChange = () => {
      if (battery) {
        publish(battery);
      }
    };

    void navigatorWithBattery.getBattery()?.then((nextBattery) => {
      if (cancelled || !nextBattery) {
        return;
      }

      battery = nextBattery;
      publish(nextBattery);

      if (!supportsBatteryEvents(nextBattery)) {
        return;
      }

      nextBattery.addEventListener("levelchange", handleChange);
      nextBattery.addEventListener("chargingchange", handleChange);
    }).catch(() => {
      /* Battery API unavailable or rejected */
    });

    return () => {
      cancelled = true;
      if (battery && supportsBatteryEvents(battery)) {
        battery.removeEventListener("levelchange", handleChange);
        battery.removeEventListener("chargingchange", handleChange);
      }
    };
  }, []);

  return status;
}
