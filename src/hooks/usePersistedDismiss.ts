import { useCallback, useState } from "react";

function readDismissed(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function usePersistedDismiss(storageKey: string) {
  const [dismissed, setDismissed] = useState(() => readDismissed(storageKey));

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // localStorage unavailable
    }
    setDismissed(true);
  }, [storageKey]);

  return { dismissed, dismiss };
}
