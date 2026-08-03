import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  confirmAndRequestLocationAccess,
  getLocationPermissionUiSnapshot,
  LOCATION_BLOCKED_MESSAGE,
  LOCATION_PERMISSION_REQUIRED_MESSAGE,
  queryGeolocationPermission,
  subscribeLocationPermissionUi,
  type GeolocationPermissionState,
} from "../../../services/core/location/geolocation";
import { HudBanner } from "../../ui/hud/HudBanner";

function isMapPath(pathname: string): boolean {
  return pathname === "/map" || pathname === "/hider" || pathname.startsWith("/map/");
}

export function LocationPermissionPrompt() {
  const location = useLocation();
  const onMap = isMapPath(location.pathname);
  const ui = useSyncExternalStore(
    subscribeLocationPermissionUi,
    getLocationPermissionUiSnapshot,
    () => ({ demand: 0, confirmEpoch: 0 }),
  );
  const [permission, setPermission] =
    useState<GeolocationPermissionState>("prompt");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

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

  if (!onMap || ui.demand === 0 || permission === "granted") {
    return null;
  }

  const denied = permission === "denied";
  const unavailable = permission === "unavailable";
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
      await refreshPermission();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : LOCATION_BLOCKED_MESSAGE,
      );
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
        {actionError ? (
          <p className="mt-2 text-sm text-status-error">{actionError}</p>
        ) : null}
        {denied || unavailable ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || unavailable}
              onClick={() => {
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
