import { useCallback, useMemo, useRef, useState } from "react";
import { isEffectivelyOfflineNow } from "@/hooks/sync/isEffectivelyOfflineNow";
import { withTimeout } from "@/services/core/withTimeout";
import { commitWrite } from "@/services/firestore/commitWrite";
import { enqueueMoveTimerIntent } from "@/services/session/sessionIntents";
import { expandBoundingBox } from "../../domain/geometry/gameArea/gameAreaBounds";
import type { LatLngTuple } from "../../domain/geometry/gameArea/geometry";
import { isPointInGameArea } from "../../domain/geometry/gameArea/geometry";
import type { GameArea } from "../../domain/map/annotations";
import type { MapViewportBounds } from "../../domain/map/transitViewport";
import {
  buildHidingZoneCircle,
  dedupeTransitStations,
  type HidingZoneRecord,
  haversineMeters,
  MANUAL_STATION_ID,
  nearestStation,
  STATION_SNAP_METERS,
  searchStations,
  type TransitStation,
} from "../../domain/session/hiding/hidingZone";
import { isFirestorePermissionDenied } from "../../services/firestore/firestoreAnnotations";
import { writeHidingZone } from "../../services/firestore/firestoreSessionExtras";
import { fetchTransitStationsForHidingZoneViewport } from "../../services/geo/matching";
import { useLatestRequest } from "../forms/useLatestRequest";

const MOVE_MIN_DISTANCE_METERS = 50;
/** Half-width of the Overpass box searched around a map tap; the margin keeps the snap radius inside it. */
const TAP_SNAP_SEARCH_METERS = STATION_SNAP_METERS + 50;
/** Overpass retries can take minutes; past this the tap keeps its own point so Confirm stays usable. */
const TAP_SNAP_TIMEOUT_MS = 4000;
const MOVE_PLAYED_MESSAGE =
  "Move card played. Timer paused. Seekers must stay put. Hider is relocating.";

function zoneWriteErrorMessage(error: unknown): string {
  if (isFirestorePermissionDenied(error)) {
    return "Couldn't save. Rejoin the session as Hider and try again.";
  }
  return error instanceof Error ? error.message : "Couldn't save hiding zone.";
}

interface UseHiderZoneToolParams {
  sessionId: string;
  hiderUid: string;
  gameArea: GameArea;
  radiusMeters: number;
  existingZone: HidingZoneRecord | null;
  postSystemMessage: (text: string) => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  /** Host can write timer via client rules; non-host queues a server-applied intent. */
  canControlTimer?: boolean;
  ensureWriteAccess?: () => Promise<void>;
  writesEnabled?: boolean;
  mapPickEnabled?: boolean;
  /** Board economy: require a Move card in hand before starting relocate. */
  hasMoveCard?: () => boolean;
  /** Board economy: discard Move (and hand) when the relocate is queued. */
  consumeMoveCard?: () => Promise<void>;
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
  canControlTimer = true,
  ensureWriteAccess,
  writesEnabled = true,
  mapPickEnabled = false,
  hasMoveCard,
  consumeMoveCard,
}: UseHiderZoneToolParams) {
  const [stations, setStations] = useState<TransitStation[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);
  const [stationsError, setStationsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<TransitStation | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [methodChosen, setMethodChosen] = useState(false);
  const [manualCenter, setManualCenter] = useState<LatLngTuple | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [moveMode, setMoveMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Bumped per Play Move and cleared on confirm, so a late rejection only rolls back the live attempt. */
  const moveAttemptRef = useRef(0);

  const { beginRequest, cancelRequests, isLatestRequest, requestIdRef } = useLatestRequest();
  const {
    beginRequest: beginSnapRequest,
    cancelRequests: cancelSnapRequests,
    isLatestRequest: isLatestSnapRequest,
  } = useLatestRequest();

  const resetWizardDraft = useCallback(() => {
    cancelRequests();
    cancelSnapRequests();
    setStationsLoading(false);
    setSnapping(false);
    setSelectedStation(null);
    setManualCenter(null);
    setManualMode(false);
    setMethodChosen(false);
    setQuery("");
    setError(null);
    setStations([]);
    setStationsError(null);
  }, [cancelRequests, cancelSnapRequests]);

  const searchStationsInArea = useCallback(
    async (viewport: MapViewportBounds) => {
      const requestId = beginRequest();
      setStationsLoading(true);
      setStationsError(null);

      try {
        const loaded = await fetchTransitStationsForHidingZoneViewport(viewport, gameArea);
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStations(loaded);
        setSelectedStation((current) =>
          current && loaded.some((station) => station.id === current.id) ? current : null,
        );
      } catch {
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStationsError("Couldn't load transit stations for this area.");
      }

      if (isLatestRequest(requestId)) {
        setStationsLoading(false);
      }
    },
    [beginRequest, gameArea, isLatestRequest],
  );

  const filteredStations = useMemo(() => searchStations(query, stations), [query, stations]);

  const previewCircle = useMemo(() => {
    if (manualMode && manualCenter) {
      return buildHidingZoneCircle(manualCenter, radiusMeters);
    }

    if (!selectedStation) {
      return null;
    }

    return buildHidingZoneCircle([selectedStation.lat, selectedStation.lng], radiusMeters);
  }, [manualCenter, manualMode, radiusMeters, selectedStation]);

  const hasPlacement = manualMode ? manualCenter !== null : selectedStation !== null;

  const openWizard = useCallback(() => {
    setWizardOpen(true);
    resetWizardDraft();
  }, [resetWizardDraft]);

  const closeWizard = useCallback(() => {
    setWizardOpen(false);
    resetWizardDraft();
  }, [resetWizardDraft]);

  /**
   * Membership heal reads from the server, so it only runs when reachable.
   * Offline, rules re-check access when Firestore replays the queued writes and
   * any rejection surfaces through the write ledger.
   */
  const ensureWriteAccessIfOnline = useCallback(async () => {
    if (!ensureWriteAccess || isEffectivelyOfflineNow()) {
      return;
    }
    await ensureWriteAccess();
  }, [ensureWriteAccess]);

  const pauseTimerForMove = useCallback(() => {
    if (canControlTimer) {
      pauseTimer();
      return;
    }
    enqueueMoveTimerIntent(sessionId, hiderUid, "pause");
  }, [canControlTimer, hiderUid, pauseTimer, sessionId]);

  const resumeTimerForMove = useCallback(() => {
    if (canControlTimer) {
      resumeTimer();
      return;
    }
    enqueueMoveTimerIntent(sessionId, hiderUid, "resume");
  }, [canControlTimer, hiderUid, resumeTimer, sessionId]);

  const startMove = useCallback(async () => {
    if (!existingZone || !writesEnabled || !hiderUid) {
      return;
    }

    const confirmed = window.confirm("Play Move? Timer pauses and you must pick a new station.");
    if (!confirmed) {
      return;
    }

    if (hasMoveCard && !hasMoveCard()) {
      window.alert("Board economy: you need a Move card in hand before relocating.");
      return;
    }

    setMoveMode(true);
    setWizardOpen(true);
    resetWizardDraft();

    try {
      await ensureWriteAccessIfOnline();
    } catch (nextError) {
      setMoveMode(false);
      setWizardOpen(false);
      setError(zoneWriteErrorMessage(nextError));
      return;
    }

    // Fire-and-track: each write commits to the local cache now and replays on
    // reconnect, so Play Move works in a dead zone. Nothing awaits server acks;
    // rejections also land in the write ledger (WriteFailureNotifier).
    const attempt = moveAttemptRef.current + 1;
    moveAttemptRef.current = attempt;
    pauseTimerForMove();
    commitWrite("system.message", () => postSystemMessage(MOVE_PLAYED_MESSAGE));
    const { acknowledged: zoneAcked } = commitWrite("zone.write", () =>
      writeHidingZone(sessionId, {
        ...existingZone,
        hiderUid,
        moveInProgress: true,
      }),
    );
    zoneAcked.then(
      () => {
        // Discard the Move card only once the relocate is accepted (as before).
        if (consumeMoveCard) {
          commitWrite("economy.update", consumeMoveCard);
        }
      },
      (nextError: unknown) => {
        if (moveAttemptRef.current !== attempt) {
          return;
        }
        // Compensate the pause so a rejected Move cannot leave the timer stopped.
        moveAttemptRef.current = 0;
        resumeTimerForMove();
        setMoveMode(false);
        setWizardOpen(false);
        setError(zoneWriteErrorMessage(nextError));
      },
    );
  }, [
    consumeMoveCard,
    ensureWriteAccessIfOnline,
    existingZone,
    hasMoveCard,
    hiderUid,
    pauseTimerForMove,
    postSystemMessage,
    resetWizardDraft,
    resumeTimerForMove,
    sessionId,
    writesEnabled,
  ]);

  /** Nothing loaded nearby is the common case in Tap map mode, so look stations up around the tap. */
  const snapTapToNearestStation = useCallback(
    async (point: LatLngTuple) => {
      const requestId = beginSnapRequest();
      const stationsEpoch = requestIdRef.current;

      let station = nearestStation(point, stations);
      if (!station && !isEffectivelyOfflineNow()) {
        setSnapping(true);
        const lookup = fetchTransitStationsForHidingZoneViewport(
          expandBoundingBox(
            { south: point[0], north: point[0], west: point[1], east: point[1] },
            TAP_SNAP_SEARCH_METERS,
          ),
          gameArea,
        ).then(
          (nearby) => {
            // Cache even late results so the next nearby tap resolves without Overpass.
            if (nearby.length > 0 && isLatestRequest(stationsEpoch)) {
              setStations((current) => dedupeTransitStations([...current, ...nearby]));
            }
            return nearby;
          },
          (): TransitStation[] => [],
        );
        const nearby = await withTimeout(lookup, TAP_SNAP_TIMEOUT_MS).catch(
          (): TransitStation[] => [],
        );
        station = nearestStation(point, nearby);
      }

      if (!isLatestSnapRequest(requestId)) {
        return;
      }
      setSnapping(false);
      if (station) {
        setManualCenter([station.lat, station.lng]);
        setSelectedStation(station);
      }
    },
    [beginSnapRequest, gameArea, isLatestRequest, isLatestSnapRequest, requestIdRef, stations],
  );

  const handleMapClick = useCallback(
    (point: LatLngTuple) => {
      if (!wizardOpen) {
        return false;
      }

      if (!mapPickEnabled) {
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
        void snapTapToNearestStation(point);
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
    [gameArea, manualMode, mapPickEnabled, snapTapToNearestStation, stations, wizardOpen],
  );

  const confirmZone = useCallback(async () => {
    if (!writesEnabled || !hiderUid) {
      setError("Sign in and rejoin the session as Hider, then try again.");
      return;
    }

    if (snapping) {
      return;
    }

    let center: LatLngTuple | null = null;
    let stationId = "";
    let stationName = "";

    if (manualMode && manualCenter && !selectedStation) {
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
      haversineMeters(center, [existingZone.center.lat, existingZone.center.lng]) <
        MOVE_MIN_DISTANCE_METERS
    ) {
      setError("Move requires a different location.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await ensureWriteAccessIfOnline();
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

      commitWrite("zone.write", () => writeHidingZone(sessionId, zone));
      moveAttemptRef.current = 0;

      setMoveMode(false);
      setWizardOpen(false);
      resetWizardDraft();

      if (moveMode) {
        resumeTimerForMove();
      }
    } catch (nextError) {
      setError(zoneWriteErrorMessage(nextError));
    }
    setSaving(false);
  }, [
    ensureWriteAccessIfOnline,
    existingZone,
    hiderUid,
    manualCenter,
    manualMode,
    moveMode,
    radiusMeters,
    resetWizardDraft,
    resumeTimerForMove,
    selectedStation,
    sessionId,
    snapping,
    writesEnabled,
  ]);

  const choosePlacementMethod = useCallback(
    (manual: boolean) => {
      cancelRequests();
      cancelSnapRequests();
      setStationsLoading(false);
      setSnapping(false);
      setManualMode(manual);
      setMethodChosen(true);
      setSelectedStation(null);
      setManualCenter(null);
      setError(null);
    },
    [cancelRequests, cancelSnapRequests],
  );

  const clearStationSelection = useCallback(() => {
    setSelectedStation(null);
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
    methodChosen,
    choosePlacementMethod,
    clearStationSelection,
    manualCenter,
    snapping,
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
