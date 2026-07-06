export const LOW_BATTERY_LEVEL = 0.2;
export const LOW_BATTERY_RECOVERY_LEVEL = 0.25;

const DISMISS_SESSION_KEY = "jetlag.lowBatteryPromptDismissed";

export function readLowBatteryPromptDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissLowBatteryPromptForSession(): void {
  try {
    sessionStorage.setItem(DISMISS_SESSION_KEY, "1");
  } catch {
    // sessionStorage unavailable
  }
}

export function clearLowBatteryPromptDismissal(): void {
  try {
    sessionStorage.removeItem(DISMISS_SESSION_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

export function shouldOfferLowPowerMode(input: {
  supported: boolean;
  level: number | null;
  charging: boolean | null;
  lowPowerMode: boolean;
  dismissed: boolean;
}): boolean {
  if (!input.supported || input.lowPowerMode || input.dismissed) {
    return false;
  }

  if (input.level === null || input.charging === null) {
    return false;
  }

  return !input.charging && input.level <= LOW_BATTERY_LEVEL;
}
