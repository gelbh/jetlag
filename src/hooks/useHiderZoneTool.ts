import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameArea } from "../domain/annotations";
import { hidingZoneRadiusMeters } from "../domain/gameSize";
import type { GameSize } from "../domain/gameSize";
import type { LatLngTuple } from "../domain/geometry";
import {
  buildHidingZoneCircle,
  nearestStation,
  searchStations,
  type HidingZoneRecord,
  type TransitStation,
} from "../domain/hidingZone";
import { fetchTransitStationsForHidingZone } from "../services/matchingFeatures";
import { writeHidingZone } from "../services/firestoreSessionExtras";

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
  const [wizardOpen, setWizardOpen] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!selectedStation) {
      return null;
    }

    return buildHidingZoneCircle(
      [selectedStation.lat, selectedStation.lng],
      radiusMeters,
    );
  }, [radiusMeters, selectedStation]);

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    setSelectedStation(null);
    setQuery("");
    setError(null);
  }, []);

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
    setSelectedStation(null);
    await postSystemMessage(
      "Move card played — timer paused. Seekers must stay put. Hider is relocating.",
    );
    await writeHidingZone(sessionId, {
      ...existingZone,
      moveInProgress: true,
    });
  }, [existingZone, pauseTimer, postSystemMessage, sessionId]);

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!wizardOpen) {
        return false;
      }

      const station = nearestStation(point, stations);
      if (!station) {
        setError("No transit station here — search or move closer to a stop.");
        return false;
      }

      setSelectedStation(station);
      setError(null);
      return true;
    },
    [stations, wizardOpen],
  );

  const confirmZone = useCallback(async () => {
    if (!selectedStation) {
      setError("Pick a transit station first.");
      return;
    }

    if (
      moveMode &&
      existingZone &&
      selectedStation.id === existingZone.stationId
    ) {
      setError("Move requires a different station.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const circle = buildHidingZoneCircle(
        [selectedStation.lat, selectedStation.lng],
        radiusMeters,
      );
      const confirmedAt = new Date().toISOString();
      const zone: HidingZoneRecord = {
        hiderUid,
        sessionId,
        stationId: selectedStation.id,
        stationName: selectedStation.name,
        center: { lat: selectedStation.lat, lng: selectedStation.lng },
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
          ? `Hider relocated to ${selectedStation.name}. Original station: ${existingZone.stationName}.`
          : `Hider confirmed zone at ${selectedStation.name}.`,
      );

      if (moveMode) {
        resumeTimer();
      }

      setMoveMode(false);
      setWizardOpen(false);
      setSelectedStation(null);
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
    moveMode,
    postSystemMessage,
    radiusMeters,
    resumeTimer,
    selectedStation,
    sessionId,
  ]);

  return {
    stationsLoading,
    stationsError,
    filteredStations,
    query,
    setQuery,
    selectedStation,
    setSelectedStation,
    previewCircle,
    wizardOpen,
    openWizard,
    closeWizard: () => setWizardOpen(false),
    startMove,
    moveMode,
    confirmZone,
    saving,
    error,
    handleMapClick,
    hasZone: Boolean(existingZone),
    locked: Boolean(existingZone) && !wizardOpen,
  };
}
