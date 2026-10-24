import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isEffectivelyOfflineNow } from "@/hooks/sync/isEffectivelyOfflineNow";
import { isAbortError } from "@/services/core/network/anySignal";
import { createLoadTask, setNamedLoadTask } from "@/services/core/progress/loadTask";
import { HIDER_STATIONS_TASK } from "@/services/core/progress/namedTasks";
import { commitWrite } from "@/services/firestore/commitWrite";
import { overpassLoadFromTask } from "@/services/geo/overpass/overpassLoad";
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

/** History.state marker so Back can exit zone placement without leaving `/map`. */
export const ZONE_WIZARD_HISTORY_KEY = "jlZoneWizard";

const MOVE_MIN_DISTANCE_METERS = 50;
/** Half-width of the Overpass box searched around a map tap; the margin keeps the snap radius inside it. */
const TAP_SNAP_SEARCH_METERS = STATION_SNAP_METERS + 50;
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
  /** Board economy: discard Move (and hand) when the new zone is confirmed. */
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
  const wizardOpenRef = useRef(false);
  const moveModeRef = useRef(false);
  const historyPushedRef = useRef(false);

  const { beginRequest, cancelRequests, isLatestRequest, requestIdRef, requestSignal } =
    useLatestRequest();
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

  const pushZoneWizardHistory = useCallback(() => {
    if (historyPushedRef.current) {
      return;
    }
    const prev = window.history.state;
    const prevObj =
      prev && typeof prev === "object" ? (prev as Record<string, unknown>) : ({} as const);
    const prevIdx = typeof prevObj.idx === "number" ? prevObj.idx : 0;
    // Mint a new idx/key so React Router POP accounting does not see delta 0.
    window.history.pushState(
      {
        ...prevObj,
        idx: prevIdx + 1,
        key: `jlz-${Date.now().toString(36)}`,
        [ZONE_WIZARD_HISTORY_KEY]: true,
      },
      "",
    );
    historyPushedRef.current = true;
  }, []);

  const abandonZoneWizardHistory = useCallback(() => {
    if (!historyPushedRef.current) {
      return;
    }
    historyPushedRef.current = false;
    window.history.back();
  }, []);

  const searchStationsInArea = useCallback(
    async (viewport: MapViewportBounds) => {
      const requestId = beginRequest();
      setStationsLoading(true);
      setStationsError(null);

      const task = createLoadTask({ label: "Loading stations", signal: requestSignal() });
      setNamedLoadTask(HIDER_STATIONS_TASK, task);
      const applyStations = (loaded: TransitStation[]) => {
        if (!isLatestRequest(requestId) || loaded.length === 0) {
          return;
        }
        setStations(loaded);
        setStationsError(null);
        setSelectedStation((current) =>
          current && loaded.some((station) => station.id === current.id) ? current : null,
        );
      };

      try {
        // GTFS load is uncapped; Overpass is bounded inside the fetcher. onStations
        // still applies late Overpass hits after that Overpass timeout.
        const loaded = await fetchTransitStationsForHidingZoneViewport(viewport, gameArea, {
          onStations: applyStations,
          load: overpassLoadFromTask(task, {
            kind: "fetch",
            label: "Searching map data",
            historyKey: "overpass:stations",
          }),
        });
        task.complete();
        if (!isLatestRequest(requestId)) {
          return;
        }

        setStations(loaded);
        setSelectedStation((current) =>
          current && loaded.some((station) => station.id === current.id) ? current : null,
        );
      } catch (error) {
        if (isAbortError(error)) {
          task.cancel();
          return;
        }
        task.fail(error);
        if (isLatestRequest(requestId)) {
          setStationsError("Couldn't load transit stations for this area.");
        }
      } finally {
        if (isLatestRequest(requestId)) {
          setStationsLoading(false);
        }
      }
    },
    [beginRequest, gameArea, isLatestRequest, requestSignal],
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

  const applyWizardClosed = useCallback(
    (options: { resumeIfMove: boolean }) => {
      const wasMove = moveModeRef.current;
      wizardOpenRef.current = false;
      moveModeRef.current = false;
      setWizardOpen(false);
      setMoveMode(false);
      resetWizardDraft();
      if (options.resumeIfMove && wasMove) {
        resumeTimerForMove();
        // Best-effort: Confirm clears this flag; Cancel/Back must too or the
        // session stays stuck in “Moving” for seekers.
        if (existingZone && hiderUid) {
          moveAttemptRef.current = 0;
          commitWrite("zone.write", () =>
            writeHidingZone(sessionId, {
              ...existingZone,
              hiderUid,
              moveInProgress: false,
            }),
          );
        }
      }
    },
    [existingZone, hiderUid, resetWizardDraft, resumeTimerForMove, sessionId],
  );

  const openWizard = useCallback(() => {
    wizardOpenRef.current = true;
    setWizardOpen(true);
    resetWizardDraft();
    pushZoneWizardHistory();
  }, [pushZoneWizardHistory, resetWizardDraft]);

  const closeWizard = useCallback(() => {
    if (!wizardOpenRef.current) {
      return;
    }
    applyWizardClosed({ resumeIfMove: false });
    abandonZoneWizardHistory();
  }, [abandonZoneWizardHistory, applyWizardClosed]);

  /** Back / Cancel / dismiss: close placement and resume the timer when leaving a move. */
  const closeWizardFromUser = useCallback(() => {
    if (!wizardOpenRef.current) {
      return;
    }
    applyWizardClosed({ resumeIfMove: true });
    abandonZoneWizardHistory();
  }, [abandonZoneWizardHistory, applyWizardClosed]);

  useEffect(() => {
    const onPopState = () => {
      if (!wizardOpenRef.current) {
        return;
      }
      historyPushedRef.current = false;
      applyWizardClosed({ resumeIfMove: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [applyWizardClosed]);

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

  const startMove = useCallback(async () => {
    if (!existingZone || !writesEnabled || !hiderUid) {
      return;
    }

    const confirmed = window.confirm(
      "Play Move? Timer pauses and you must place a new zone (station or map).",
    );
    if (!confirmed) {
      return;
    }

    if (hasMoveCard && !hasMoveCard()) {
      window.alert("Board economy: you need a Move card in hand before relocating.");
      return;
    }

    moveModeRef.current = true;
    wizardOpenRef.current = true;
    setMoveMode(true);
    setWizardOpen(true);
    resetWizardDraft();
    pushZoneWizardHistory();

    try {
      await ensureWriteAccessIfOnline();
    } catch (nextError) {
      applyWizardClosed({ resumeIfMove: false });
      abandonZoneWizardHistory();
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
    zoneAcked.then(undefined, (nextError: unknown) => {
      if (moveAttemptRef.current !== attempt) {
        return;
      }
      // Compensate the pause so a rejected Move cannot leave the timer stopped.
      moveAttemptRef.current = 0;
      resumeTimerForMove();
      applyWizardClosed({ resumeIfMove: false });
      abandonZoneWizardHistory();
      setError(zoneWriteErrorMessage(nextError));
    });
  }, [
    abandonZoneWizardHistory,
    applyWizardClosed,
    ensureWriteAccessIfOnline,
    existingZone,
    hasMoveCard,
    hiderUid,
    pauseTimerForMove,
    postSystemMessage,
    pushZoneWizardHistory,
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
        const cacheNearby = (loaded: TransitStation[]) => {
          if (loaded.length > 0 && isLatestRequest(stationsEpoch)) {
            setStations((current) => dedupeTransitStations([...current, ...loaded]));
          }
        };
        const nearby = await fetchTransitStationsForHidingZoneViewport(
          expandBoundingBox(
            { south: point[0], north: point[0], west: point[1], east: point[1] },
            TAP_SNAP_SEARCH_METERS,
          ),
          gameArea,
          { onStations: cacheNearby },
        ).catch((): TransitStation[] => []);
        cacheNearby(nearby);
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

    // Manual placement: draft center is the single source for ring + Confirm.
    // Snap success keeps manualCenter on the station; timeout/offline leave the tap.
    if (manualMode && manualCenter) {
      center = manualCenter;
      if (selectedStation) {
        stationId = selectedStation.id;
        stationName = selectedStation.name;
      } else {
        stationId = MANUAL_STATION_ID;
        stationName = "";
      }
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

      const wasMove = moveMode;
      // Confirm already wrote moveInProgress: false; do not re-enter the
      // cancel path (which would republish the pre-move zone).
      applyWizardClosed({ resumeIfMove: false });
      if (wasMove) {
        resumeTimerForMove();
        // Discard Move only after a successful relocate so Cancel/Back cannot burn it.
        if (consumeMoveCard) {
          commitWrite("economy.update", consumeMoveCard);
        }
      }
      abandonZoneWizardHistory();
    } catch (nextError) {
      setError(zoneWriteErrorMessage(nextError));
    }
    setSaving(false);
  }, [
    abandonZoneWizardHistory,
    applyWizardClosed,
    consumeMoveCard,
    ensureWriteAccessIfOnline,
    existingZone,
    hiderUid,
    manualCenter,
    manualMode,
    moveMode,
    radiusMeters,
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
    closeWizardFromUser,
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
