import { useEffect, useState } from "react";

export const PLAYER_UI_MANTINE_STORAGE_KEY = "jl.playerUi.mantine";
const CHANGE_EVENT = "jl:player-ui-mantine";

export function isPlayerUiMantineEnabled(): boolean {
  try {
    return localStorage.getItem(PLAYER_UI_MANTINE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPlayerUiMantineEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(PLAYER_UI_MANTINE_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(PLAYER_UI_MANTINE_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function usePlayerUiMantine(): boolean {
  const [enabled, setEnabled] = useState(isPlayerUiMantineEnabled);

  useEffect(() => {
    const sync = () => setEnabled(isPlayerUiMantineEnabled());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return enabled;
}
