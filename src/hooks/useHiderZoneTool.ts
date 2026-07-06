import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameArea } from "../domain/annotations";
import { hidingZoneRadiusMeters } from "../domain/gameSize";
import type { GameSize } from "../domain/gameSize";
import type { LatLngTuple } from "../domain/geometry";
import { isPointInGameArea } from "../domain/geometry";
import {
  buildHidingZoneCircle,
  haversineMeters,
  MANUAL_STATION_ID,
  nearestStation,
  searchStations,
  type HidingZoneRecord,
  type TransitStation,
} from "../domain/hidingZone";
import { fetchTransitStationsForHidingZone } from "../services/matchingFeatures";
import { writeHidingZone } from "../services/firestoreSessionExtras";

const MOVE_MIN_DISTANCE_METERS = 50;

interface UseHiderZoneToolParams {
  sessionId: string;
  hiderUid: string;
  gameArea: GameArea;
  gameSize: GameSize;
  existingZone: HidingZoneRecord | null;
  postSystemMessage: (text: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
}

export function useHiderZoneTool({
  sessionId,
  hiderUid,
  gameArea,
  gameSize,
  existingZone,
  postSystemMessage,
  pauseTimer,
  resumeTimer,
}: UseHiderZoneToolParams) {
  const radiusMeters = hidingZoneRadiusMeters(gameSize);
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
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setStationsLoading(true);
      setStationsError(null);

      try {
        const loaded = await fetchTransitStationsForHidingZone(gameArea);
        if (!cancelled) {
          setStations(loaded);
        }
      } catch {
        if (!cancelled) {
          setStationsError("Couldn't load transit stations for this area.");
        }
      } finally {
        if (!cancelled) {
          setStationsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [gameArea]);

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
    if (!existingZone) {
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
    await postSystemMessage(
      "Move card played — timer paused. Seekers must stay put. Hider is relocating.",
    );
    await writeHidingZone(sessionId, {
      ...existingZone,
      moveInProgress: true,
    });
  }, [existingZone, pauseTimer, postSystemMessage, resetWizardDraft, sessionId]);

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
        setError("No transit station here — search or move closer to a stop.");
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
      await postSystemMessage(
        moveMode && existingZone
          ? existingZone.stationName
            ? `Hider relocated from ${existingZone.stationName}.`
            : "Hider relocated to a new zone."
          : stationName
            ? `Hider confirmed zone at ${stationName}.`
            : "Hider confirmed hiding zone.",
      );

      if (moveMode) {
        resumeTimer();
      }

      setMoveMode(false);
      setWizardOpen(false);
      resetWizardDraft();
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't save hiding zone.",
      );
    } finally {
      setSaving(false);
    }
  }, [
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
  ]);

  const setManualModeEnabled = useCallback((enabled: boolean) => {
    setManualMode(enabled);
    setSelectedStation(null);
    setManualCenter(null);
    setError(null);
  }, []);

  return {
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
    hasZone: Boolean(existingZone),
    hasPlacement,
    locked: Boolean(existingZone) && !wizardOpen,
  };
}
