import { useEffect } from "react";

interface WakeLockSentinel {
  release: () => Promise<void>;
}

type NavigatorWithWakeLock = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinel>;
  };
};

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const navigatorWithWakeLock = navigator as NavigatorWithWakeLock;
    if (!navigatorWithWakeLock.wakeLock) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const requestWakeLock = async () => {
      try {
        sentinel = await navigatorWithWakeLock.wakeLock!.request("screen");
      } catch {
        sentinel = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !cancelled) {
        void requestWakeLock();
      }
    };

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, [enabled]);
}
