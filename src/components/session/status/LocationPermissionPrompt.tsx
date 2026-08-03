import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  confirmAndRequestLocationAccess,
  LOCATION_BLOCKED_MESSAGE,
  LOCATION_PERMISSION_REQUIRED_MESSAGE,
  queryGeolocationPermission,
  type GeolocationPermissionState,
} from "../../../services/core/location/geolocation";
import {
  getLocationPermissionUiSnapshot,
  subscribeLocationPermissionUi,
} from "../../../services/core/location/locationPermissionUi";
import { HudBanner } from "../../ui/hud/HudBanner";

const EMPTY_LOCATION_PERMISSION_UI = { demand: 0, confirmEpoch: 0 };

export function LocationPermissionPrompt() {
  const location = useLocation();
  const onMap = location.pathname === "/map";
  const ui = useSyncExternalStore(
    subscribeLocationPermissionUi,
    getLocationPermissionUiSnapshot,
    () => EMPTY_LOCATION_PERMISSION_UI,
  );
  const [permission, setPermission] =
    useState<GeolocationPermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [forceDenied, setForceDenied] = useState(false);

  const refreshPermission = useCallback(async () => {
    const next = await queryGeolocationPermission();
    setPermission(next);
  }, []);

  useEffect(() => {
    if (!onMap || ui.demand === 0) {
      return;
    }
    void refreshPermission();
  }, [onMap, refreshPermission, ui.confirmEpoch, ui.demand]);

  const denied = forceDenied || permission === "denied";
  const unavailable = permission === "unavailable";
  const confirmedLiveAccess = ui.confirmEpoch > 0 && !denied && !unavailable;

  if (
    !onMap ||
    ui.demand === 0 ||
    permission === null ||
    permission === "granted" ||
    confirmedLiveAccess
  ) {
    return null;
  }

  const title = denied
    ? "Location blocked"
    : unavailable
      ? "Location unavailable"
      : "Allow location";
  const body = denied
    ? LOCATION_BLOCKED_MESSAGE
    : unavailable
      ? "Geolocation is not available on this device."
      : `${LOCATION_PERMISSION_REQUIRED_MESSAGE} Your browser will ask next.`;

  const onAllow = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await confirmAndRequestLocationAccess({ highAccuracy: false });
      setForceDenied(false);
      await refreshPermission();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : LOCATION_BLOCKED_MESSAGE;
      setActionError(message);
      if (message === LOCATION_BLOCKED_MESSAGE) {
        setForceDenied(true);
      }
      await refreshPermission();
    } finally {
      setBusy(false);
    }
  };

  return (
    <HudBanner
      visible
      animated={false}
      className="jl-map-banner-top pointer-events-auto fixed inset-x-3 z-[var(--z-panel)]"
    >
      <div
        className="map-float-alert mx-auto max-w-xl border-2 border-highlight/40 bg-surface-deep px-3 py-3"
        role="dialog"
        aria-labelledby="location-permission-prompt-title"
        aria-describedby="location-permission-prompt-body"
      >
        <p
          id="location-permission-prompt-title"
          className="font-display text-xs font-semibold uppercase tracking-wide text-ink"
        >
          {title}
        </p>
        <p
          id="location-permission-prompt-body"
          className="mt-1 text-pretty text-sm leading-snug text-ink-secondary"
        >
          {body}
        </p>
        {actionError && !denied ? (
          <p className="mt-2 text-sm text-status-error">{actionError}</p>
        ) : null}
        {denied || unavailable ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || unavailable}
              onClick={() => {
                setForceDenied(false);
                void onAllow();
              }}
              className="btn-secondary min-h-10 flex-1 px-4 text-xs"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void onAllow();
              }}
              className="btn-primary min-h-10 flex-1 px-4 text-xs"
            >
              {busy ? "Requesting…" : "Allow location"}
            </button>
          </div>
        )}
      </div>
    </HudBanner>
  );
}
