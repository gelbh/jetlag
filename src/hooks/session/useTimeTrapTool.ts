import { useCallback, useMemo, useState } from "react";
import { useLatestRequest } from "../useLatestRequest";
import type { GameArea } from "../../domain/map/annotations";
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import {
  buildTimeTrapRecord,
  type TimeTrapRecord,
} from "../../domain/expansion/timeTraps";
import {
  isValidHidingStation,
  searchStations,
  type TransitStation,
} from "../../domain/session/hidingZone";
import { fetchTransitStationsForHidingZoneViewport } from "../../services/geo/matchingFeatures";
import { writeTimeTrap } from "../../services/firestore/firestoreSessionExtras";

interface UseTimeTrapToolParams {
  sessionId: string;
  hiderUid: string;
  gameArea: GameArea;
  existingTrap: TimeTrapRecord | null;
  enabled: boolean;
  postSystemMessage: (text: string) => Promise<void>;
}

export function useTimeTrapTool({
  sessionId,
  hiderUid,
  gameArea,
  existingTrap,
  enabled,
  postSystemMessage,
}: UseTimeTrapToolParams) {
  const [stations, setStations] = useState<TransitStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const filteredStations = useMemo(
    () => searchStations(query, stations),
    [query, stations],
  );

  const searchStationsInArea = useCallback(
    async (viewport: MapViewportBounds) => {
      if (!enabled) {
        return;
      }

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

        setStations(
          loaded.filter((station) => isValidHidingStation(station, gameArea)),
        );
      } catch (loadError) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStationsError(
          loadError instanceof Error
            ? loadError.message
            : "Couldn't load stations.",
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setStationsLoading(false);
        }
      }
    },
    [beginRequest, enabled, gameArea, isLatestRequest],
  );

  const confirmTrap = useCallback(async () => {
    if (!selectedStation || existingTrap) {
      return;
    }

    if (!isValidHidingStation(selectedStation, gameArea)) {
      setError("That station is outside the play area.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const trap = buildTimeTrapRecord(sessionId, hiderUid, selectedStation);
      await writeTimeTrap(sessionId, trap);
      await postSystemMessage(
        `Time trap placed at ${selectedStation.name} (+${trap.bonusMinutes} min when passed through).`,
      );
    } catch (writeError) {
      setError(
        writeError instanceof Error
          ? writeError.message
          : "Couldn't place the time trap.",
      );
    } finally {
      setSaving(false);
    }
  }, [
    existingTrap,
    gameArea,
    hiderUid,
    postSystemMessage,
    selectedStation,
    sessionId,
  ]);

  return {
    query,
    setQuery,
    stations: filteredStations,
    stationsLoading,
    stationsError,
    selectedStation,
    setSelectedStation,
    searchStationsInArea,
    confirmTrap,
    saving,
    error,
  };
}
