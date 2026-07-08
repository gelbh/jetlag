import { useCallback, useMemo, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import type { GameArea } from "../../domain/map/annotations";
import type { LatLngTuple } from "../../domain/geometry/geometry";
import { isPointInGameArea } from "../../domain/geometry/geometry";
import {
  buildHidingZoneCircle,
  haversineMeters,
  MANUAL_STATION_ID,
  nearestStation,
  searchStations,
  type HidingZoneRecord,
  type TransitStation,
} from "../../domain/session/hidingZone";
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import { isFirestorePermissionDenied } from "../../services/firestore/firestoreAnnotations";
import { fetchTransitStationsForHidingZoneViewport } from "../../services/geo/matchingFeatures";
import { writeHidingZone } from "../../services/firestore/firestoreSessionExtras";

const MOVE_MIN_DISTANCE_METERS = 50;

interface UseHiderZoneToolParams {
  sessionId: string;
  hiderUid: string;
  gameArea: GameArea;
  radiusMeters: number;
  existingZone: HidingZoneRecord | null;
  postSystemMessage: (text: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  ensureWriteAccess?: () => Promise<void>;
  writesEnabled?: boolean;
}

export function useHiderZoneTool({
  sessionId,
  hiderUid,
  gameArea,
  radiusMeters,
  existingZone,
  postSystemMessage,
  pauseTimer,
  resumeTimer,
  ensureWriteAccess,
  writesEnabled = true,
}: UseHiderZoneToolParams) {
  const [stations, setStations] = useState<TransitStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(
    null,
  );
  const [manualMode, setManualMode] = useState(false);
  const [manualCenter, setManualCenter] = useState<LatLngTuple | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetWizardDraft = useCallback(() => {
    setSelectedStation(null);
    setManualCenter(null);
    setManualMode(false);
    setQuery("");
    setError(null);
    setStations([]);
    setStationsError(null);
  }, []);

  const { beginRequest, isLatestRequest } = useLatestRequest();

  const searchStationsInArea = useCallback(
    async (viewport: MapViewportBounds) => {
      const requestId = beginRequest();
      setStationsLoading(true);
      setStationsError(null);

      try {
        const loaded = await fetchTransitStationsForHidingZoneViewport(
          viewport,
          gameArea,
        );
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStations(loaded);
        setSelectedStation((current) =>
          current && loaded.some((station) => station.id === current.id)
            ? current
            : null,
        );
      } catch {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStationsError("Couldn't load transit stations for this area.");
      } finally {
        if (isLatestRequest(requestId)) {
          setStationsLoading(false);
        }
      }
    },
    [beginRequest, gameArea, isLatestRequest],
  );

  const filteredStations = useMemo(
    () => searchStations(query, stations),
    [query, stations],
  );

  const previewCircle = useMemo(() => {
    if (manualMode && manualCenter) {
      return buildHidingZoneCircle(manualCenter, radiusMeters);
    }

    if (!selectedStation) {
      return null;
    }

    return buildHidingZoneCircle(
      [selectedStation.lat, selectedStation.lng],
      radiusMeters,
    );
  }, [manualCenter, manualMode, radiusMeters, selectedStation]);

  const hasPlacement = manualMode
    ? manualCenter !== null
    : selectedStation !== null;

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    resetWizardDraft();
  }, [resetWizardDraft]);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    resetWizardDraft();
  }, [resetWizardDraft]);

  const startMove = useCallback(async () => {
    if (!existingZone || !writesEnabled || !hiderUid) {
      return;
    }

    const confirmed = window.confirm(
      "Play Move? Timer pauses and you must pick a new station.",
    );
    if (!confirmed) {
      return;
    }

    pauseTimer();
    setMoveMode(true);
    setWizardOpen(true);
    resetWizardDraft();

    try {
      await ensureWriteAccess?.();
      await postSystemMessage(
        "Move card played. Timer paused. Seekers must stay put. Hider is relocating.",
      );
      await writeHidingZone(sessionId, {
        ...existingZone,
        hiderUid,
        moveInProgress: true,
      });
    } catch (nextError) {
      setMoveMode(false);
      setWizardOpen(false);
      setError(
        isFirestorePermissionDenied(nextError)
          ? "Couldn't save. Rejoin the session as Hider and try again."
          : nextError instanceof Error
            ? nextError.message
            : "Couldn't save hiding zone.",
      );
    }
  }, [
    ensureWriteAccess,
    existingZone,
    hiderUid,
    pauseTimer,
    postSystemMessage,
    resetWizardDraft,
    sessionId,
    writesEnabled,
  ]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!wizardOpen) {
        return false;
      }

      if (manualMode) {
        if (!isPointInGameArea(point, gameArea)) {
          setError("That point is outside the play area.");
          return false;
        }

        setManualCenter(point);
        setSelectedStation(null);
        setError(null);
        return true;
      }

      const station = nearestStation(point, stations);
      if (!station) {
        setError("No transit station here. Search or move closer to a stop.");
        return false;
      }

      setSelectedStation(station);
      setManualCenter(null);
      setError(null);
      return true;
    },
    [gameArea, manualMode, stations, wizardOpen],
  );

  const confirmZone = useCallback(async () => {
    if (!writesEnabled || !hiderUid) {
      setError("Sign in and rejoin the session as Hider, then try again.");
      return;
    }

    let center: LatLngTuple | null = null;
    let stationId = "";
    let stationName = "";

    if (manualMode && manualCenter) {
      center = manualCenter;
      stationId = MANUAL_STATION_ID;
      stationName = "";
    } else if (selectedStation) {
      center = [selectedStation.lat, selectedStation.lng];
      stationId = selectedStation.id;
      stationName = selectedStation.name;
    }

    if (!center) {
      setError(
        manualMode
          ? "Tap the map inside the play area to place your zone."
          : "Pick a transit station first.",
      );
      return;
    }

    if (
      moveMode &&
      existingZone &&
      haversineMeters(center, [
        existingZone.center.lat,
        existingZone.center.lng,
      ]) < MOVE_MIN_DISTANCE_METERS
    ) {
      setError("Move requires a different location.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await ensureWriteAccess?.();
      const circle = buildHidingZoneCircle(center, radiusMeters);
      const confirmedAt = new Date().toISOString();
      const zone: HidingZoneRecord = {
        hiderUid,
        sessionId,
        stationId,
        stationName,
        center: { lat: center[0], lng: center[1] },
        radiusMeters,
        geometryJson: JSON.stringify(circle.geometry),
        status: "confirmed",
        confirmedAt,
        moveInProgress: false,
        originalStation:
          moveMode && existingZone
            ? {
                name: existingZone.stationName,
                center: existingZone.center,
              }
            : existingZone?.originalStation,
        previousStations:
          moveMode && existingZone
            ? [
                ...(existingZone.previousStations ?? []),
                {
                  name: existingZone.stationName,
                  center: existingZone.center,
                  movedAt: confirmedAt,
                },
              ]
            : existingZone?.previousStations,
      };

      await writeHidingZone(sessionId, zone);

      if (moveMode) {
        resumeTimer();
      }

      setMoveMode(false);
      setWizardOpen(false);
      resetWizardDraft();
    } catch (nextError) {
      setError(
        isFirestorePermissionDenied(nextError)
          ? "Couldn't save. Rejoin the session as Hider and try again."
          : nextError instanceof Error
            ? nextError.message
            : "Couldn't save hiding zone.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    ensureWriteAccess,
    existingZone,
    hiderUid,
    manualCenter,
    manualMode,
    moveMode,
    postSystemMessage,
    radiusMeters,
    resetWizardDraft,
    resumeTimer,
    selectedStation,
    sessionId,
    writesEnabled,
  ]);

  const setManualModeEnabled = useCallback((enabled: boolean) => {
    setManualMode(enabled);
    setSelectedStation(null);
    setManualCenter(null);
    setError(null);
  }, []);

  return {
    stations,
    stationsLoading,
    stationsError,
    filteredStations,
    query,
    setQuery,
    selectedStation,
    setSelectedStation: (station: TransitStation) => {
      setManualMode(false);
      setManualCenter(null);
      setSelectedStation(station);
      setError(null);
    },
    manualMode,
    setManualModeEnabled,
    manualCenter,
    previewCircle,
    wizardOpen,
    openWizard,
    closeWizard,
    startMove,
    moveMode,
    confirmZone,
    saving,
    error,
    handleMapClick,
    searchStationsInArea,
    hasZone: Boolean(existingZone),
    hasPlacement,
    locked: Boolean(existingZone) && !wizardOpen,
    writesEnabled,
  };
}
