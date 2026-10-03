import { useCallback, useMemo, useState } from "react";
import { commitWrite } from "@/services/firestore/commitWrite";
import { buildTimeTrapRecord, type TimeTrapRecord } from "../../domain/expansion/timeTraps";
import type { GameArea } from "../../domain/map/annotations";
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import {
  isValidHidingStation,
  searchStations,
  type TransitStation,
} from "../../domain/session/hiding/hidingZone";
import { writeTimeTrap } from "../../services/firestore/firestoreSessionExtras";
import { fetchTransitStationsForHidingZoneViewport } from "../../services/geo/matching";
import { useLatestRequest } from "../forms/useLatestRequest";

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
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { beginRequest, isLatestRequest } = useLatestRequest();

  const filteredStations = useMemo(() => searchStations(query, stations), [query, stations]);

  const searchStationsInArea = useCallback(
    async (viewport: MapViewportBounds) => {
      if (!enabled) {
        return;
      }

      const requestId = beginRequest();
      setStationsLoading(true);
      setStationsError(null);

      try {
        const loaded = await fetchTransitStationsForHidingZoneViewport(viewport, gameArea);
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStations(loaded.filter((station) => isValidHidingStation(station, gameArea)));
      } catch (loadError) {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStationsError(
          loadError instanceof Error ? loadError.message : "Couldn't load stations.",
        );
      } finally {
        if (isLatestRequest(requestId)) {
          setStationsLoading(false);
        }
      }
    },
    [beginRequest, enabled, gameArea, isLatestRequest],
  );

  /** Returns whether the trap was placed (the write is queued, not yet acked). */
  const confirmTrap = useCallback((): boolean => {
    if (!selectedStation || existingTrap) {
      return false;
    }

    if (!isValidHidingStation(selectedStation, gameArea)) {
      setError("That station is outside the play area.");
      return false;
    }

    setError(null);

    // Fire-and-track: the trap listener picks up the local write at once (which
    // also hides this panel via existingTrap); rejections reach WriteFailureNotifier.
    const trap = buildTimeTrapRecord(sessionId, hiderUid, selectedStation);
    commitWrite("timetrap.place", () => writeTimeTrap(sessionId, trap));
    commitWrite("system.message", () =>
      postSystemMessage(
        `Time trap placed at ${selectedStation.name} (+${trap.bonusMinutes} min when passed through).`,
      ),
    );
    return true;
  }, [existingTrap, gameArea, hiderUid, postSystemMessage, selectedStation, sessionId]);

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
    error,
  };
}
