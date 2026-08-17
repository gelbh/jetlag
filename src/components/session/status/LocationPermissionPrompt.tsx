import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  confirmAndRequestLocationAccess,
  LOCATION_BLOCKED_MESSAGE,
  LOCATION_PERMISSION_REQUIRED_MESSAGE,
  queryGeolocationPermission,
  type GeolocationPermissionState,
} from "@/services/core/location/geolocation";
import {
  getLocationPermissionUiSnapshot,
  subscribeLocationPermissionUi,
} from "@/services/core/location/locationPermissionUi";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const focusedForDemandRef = useRef(0);

  useEffect(() => {
    if (!onMap || ui.demand === 0) {
      return;
    }

    let cancelled = false;
    void queryGeolocationPermission().then((next) => {
      if (!cancelled) {
        setPermission(next);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [onMap, ui.confirmEpoch, ui.demand]);

  const denied = forceDenied || permission === "denied";
  const unavailable = permission === "unavailable";
  const confirmedLiveAccess = ui.confirmEpoch > 0 && !denied && !unavailable;
  const visible =
    onMap &&
    ui.demand > 0 &&
    permission !== null &&
    permission !== "granted" &&
    !confirmedLiveAccess;

  useEffect(() => {
    if (!visible || focusedForDemandRef.current === ui.demand) {
      return;
    }
    focusedForDemandRef.current = ui.demand;
    dialogRef.current?.focus();
  }, [ui.demand, visible]);

  if (!visible) {
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
      const next = await queryGeolocationPermission();
      setPermission(next);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : LOCATION_BLOCKED_MESSAGE;
      setActionError(message);
      if (message === LOCATION_BLOCKED_MESSAGE) {
        setForceDenied(true);
      }
      const next = await queryGeolocationPermission();
      setPermission(next);
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
        ref={dialogRef}
        tabIndex={-1}
        className="map-float-alert mx-auto max-w-xl border border-flag/40 bg-canvas px-3 py-3 text-field-ink outline-none"
        role="dialog"
        aria-labelledby="location-permission-prompt-title"
        aria-describedby="location-permission-prompt-body"
      >
        <p
          id="location-permission-prompt-title"
          className="font-display text-xs font-semibold tracking-wide text-field-ink"
        >
          {title}
        </p>
        <p
          id="location-permission-prompt-body"
          className="mt-1 text-pretty text-sm leading-snug text-field-ink-muted"
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
