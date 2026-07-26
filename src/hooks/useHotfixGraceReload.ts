import { useEffect, useRef, useState } from "react";
import { APP_VERSION } from "../domain/device/changelog";
import {
  acknowledgeHotfixReload,
  hasHotfixReloadBeenAcknowledged,
} from "../domain/device/reloadAcknowledgements";
import { applyServiceWorkerUpdate } from "../domain/device/serviceWorkerRefresh";
import { compareAppVersions } from "../domain/session/sessionVersion";
import { DEFAULT_HOTFIX_GRACE_SECONDS } from "../services/firestore/firestoreIncidents";

export interface UseHotfixGraceReloadOptions {
  /** Required minimum app version from session and/or `appConfig/runtime`. */
  requiredMinAppVersion?: string | null;
  /** Grace countdown length; defaults to 30s. */
  graceSeconds?: number | null;
  /** Client version under test; defaults to `APP_VERSION`. */
  clientVersion?: string;
  /** When false, never arm the countdown. */
  enabled?: boolean;
  /**
   * Injectable reload for tests. Defaults to SW update + hard reload fallback
   * (via {@link applyServiceWorkerUpdate}).
   */
  reload?: () => void | Promise<void>;
}

export interface UseHotfixGraceReloadResult {
  active: boolean;
  secondsRemaining: number | null;
  requiredMinAppVersion: string | null;
}

function defaultReload(): Promise<void> {
  return applyServiceWorkerUpdate(undefined);
}

function resolveGraceSeconds(value: number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value);
  }
  return DEFAULT_HOTFIX_GRACE_SECONDS;
}

/**
 * When `requiredMinAppVersion` is greater than the running client version,
 * counts down then forces a refresh so the hotfix build is picked up.
 */
export function useHotfixGraceReload(
  options: UseHotfixGraceReloadOptions,
): UseHotfixGraceReloadResult {
  const {
    requiredMinAppVersion = null,
    graceSeconds = DEFAULT_HOTFIX_GRACE_SECONDS,
    clientVersion = APP_VERSION,
    enabled = true,
    reload = defaultReload,
  } = options;

  const needsUpdate =
    enabled &&
    typeof requiredMinAppVersion === "string" &&
    requiredMinAppVersion.length > 0 &&
    compareAppVersions(clientVersion, requiredMinAppVersion) < 0;

  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [armedVersion, setArmedVersion] = useState<string | null>(null);
  const reloadRef = useRef(reload);
  const reloadedForVersionRef = useRef<string | null>(null);

  const targetVersion =
    needsUpdate && requiredMinAppVersion ? requiredMinAppVersion : null;

  if (targetVersion !== armedVersion) {
    setArmedVersion(targetVersion);
    if (targetVersion) {
      const totalSeconds = resolveGraceSeconds(graceSeconds);
      setSecondsRemaining(totalSeconds <= 0 ? 0 : totalSeconds);
    } else {
      setSecondsRemaining(null);
    }
  }

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    if (!needsUpdate || !requiredMinAppVersion) {
      return;
    }

    if (
      reloadedForVersionRef.current === requiredMinAppVersion ||
      hasHotfixReloadBeenAcknowledged(requiredMinAppVersion)
    ) {
      reloadedForVersionRef.current = requiredMinAppVersion;
      return;
    }

    const fireReload = () => {
      if (reloadedForVersionRef.current === requiredMinAppVersion) {
        return;
      }
      reloadedForVersionRef.current = requiredMinAppVersion;
      acknowledgeHotfixReload(requiredMinAppVersion);
      void Promise.resolve(reloadRef.current());
    };

    const totalSeconds = resolveGraceSeconds(graceSeconds);
    if (totalSeconds <= 0) {
      fireReload();
      return;
    }

    const startedAt = Date.now();
    const tick = () => {
      const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        window.clearInterval(intervalId);
        fireReload();
      }
    };

    const intervalId = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [needsUpdate, requiredMinAppVersion, graceSeconds]);

  return {
    active: needsUpdate,
    secondsRemaining: needsUpdate ? secondsRemaining : null,
    requiredMinAppVersion: needsUpdate ? requiredMinAppVersion : null,
  };
}
