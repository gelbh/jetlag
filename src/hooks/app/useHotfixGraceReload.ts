import { useEffect, useRef, useState } from "react";
import { DEFAULT_HOTFIX_GRACE_SECONDS } from "@/services/firestore/appConfigRuntimeDefaults";
import { APP_VERSION } from "../../domain/device/changelog";
import {
  acknowledgeHotfixReload,
  hasHotfixReloadBeenAcknowledged,
  isReloadAckStorageAvailable,
} from "../../domain/device/updates/reloadAcknowledgements";
import { applyServiceWorkerUpdate } from "../../domain/device/updates/serviceWorkerRefresh";
import { compareAppVersions } from "../../domain/session/meta/sessionVersion";

export interface UseHotfixGraceReloadOptions {
  requiredMinAppVersion?: string | null;
  /** Grace countdown length; defaults to 30s. */
  graceSeconds?: number | null;
  clientVersion?: string;
  enabled?: boolean;
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
  const [attemptedVersion, setAttemptedVersion] = useState<string | null>(null);
  const reloadRef = useRef(reload);
  const reloadedForVersionRef = useRef<string | null>(null);

  const alreadyAttempted =
    typeof requiredMinAppVersion === "string" &&
    requiredMinAppVersion.length > 0 &&
    (attemptedVersion === requiredMinAppVersion ||
      hasHotfixReloadBeenAcknowledged(requiredMinAppVersion) ||
      !isReloadAckStorageAvailable());

  const targetVersion =
    needsUpdate && requiredMinAppVersion && !alreadyAttempted ? requiredMinAppVersion : null;

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
      setAttemptedVersion(requiredMinAppVersion);
      if (!acknowledgeHotfixReload(requiredMinAppVersion)) {
        return;
      }
      try {
        void Promise.resolve(reloadRef.current()).catch(() => {});
      } catch {}
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

  const countingDown = Boolean(targetVersion);
  return {
    active: countingDown,
    secondsRemaining: countingDown ? secondsRemaining : null,
    requiredMinAppVersion: needsUpdate ? requiredMinAppVersion : null,
  };
}
