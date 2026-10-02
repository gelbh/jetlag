import { Button, Group } from "@mantine/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import {
  confirmAndRequestLocationAccess,
  type GeolocationPermissionState,
  LOCATION_BLOCKED_MESSAGE,
  LOCATION_PERMISSION_REQUIRED_MESSAGE,
  queryGeolocationPermission,
  restoreLocationAccessIfPersisted,
} from "@/services/core/location/geolocation";
import {
  getLocationPermissionUiSnapshot,
  subscribeLocationPermissionUi,
} from "@/services/core/location/locationPermissionUi";
import { MapFloatSurface } from "../../ui/banners/MapFloatSurface";
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
  const [hydrating, setHydrating] = useState(() => onMap && ui.demand > 0);
  const [permission, setPermission] = useState<GeolocationPermissionState | null>(null);
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
    void (async () => {
      setHydrating(true);
      try {
        const restore = await restoreLocationAccessIfPersisted({
          highAccuracy: false,
        });
        if (cancelled) {
          return;
        }
        if (restore.status === "denied") {
          setForceDenied(true);
        }
        const next = await queryGeolocationPermission();
        if (!cancelled) {
          setPermission(next);
        }
      } finally {
        if (!cancelled) {
          setHydrating(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onMap, ui.demand]);

  const denied = forceDenied || permission === "denied";
  const unavailable = permission === "unavailable";
  const confirmedLiveAccess = ui.confirmEpoch > 0 && !denied && !unavailable;
  const visible =
    onMap &&
    ui.demand > 0 &&
    !hydrating &&
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
      const message = error instanceof Error ? error.message : LOCATION_BLOCKED_MESSAGE;
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
      className="pointer-events-auto fixed inset-x-3 top-[var(--map-banner-top)] z-[var(--z-panel)]"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="location-permission-prompt-title"
        aria-describedby="location-permission-prompt-body"
        className="mx-auto max-w-xl outline-none"
      >
        <MapFloatSurface tone="flag">
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
            <Group gap="sm" mt="sm" wrap="wrap">
              <Button
                type="button"
                variant="default"
                size="md"
                flex={1}
                disabled={busy || unavailable}
                onClick={() => {
                  setForceDenied(false);
                  void onAllow();
                }}
              >
                Try again
              </Button>
            </Group>
          ) : (
            <Group gap="sm" mt="sm" wrap="wrap">
              <Button
                type="button"
                variant="filled"
                size="md"
                flex={1}
                disabled={busy}
                onClick={() => {
                  void onAllow();
                }}
              >
                {busy ? "Requesting…" : "Allow location"}
              </Button>
            </Group>
          )}
        </MapFloatSurface>
      </div>
    </HudBanner>
  );
}
