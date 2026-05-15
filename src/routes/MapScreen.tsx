import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Polygon } from "react-leaflet";
import { AnnotationLayer } from "../components/map/AnnotationLayer";
import { GeometryEditLayer } from "../components/map/GeometryEditLayer";
import { GameAreaMask } from "../components/map/GameAreaMask";
import { MapView } from "../components/map/MapView";
import { ToolDraftLayer } from "../components/map/ToolDraftLayer";
import { TransitControls } from "../components/map/TransitControls";
import { TransitLayer } from "../components/map/TransitLayer";
import { UserLocationLayer } from "../components/map/UserLocationLayer";
import { MapModeChip } from "../components/session/MapModeChip";
import { MapSettingsSheet } from "../components/session/MapSettingsSheet";
import { SessionLog } from "../components/session/SessionLog";
import { SyncStatusBanner } from "../components/session/SyncStatusBanner";
import { AnnotationEditSheet } from "../components/tools/AnnotationEditSheet";
import { ToolDock } from "../components/tools/ToolDock";
import { PopupCloseButton } from "../components/ui/PopupCloseButton";
import { useMatchingTool } from "../hooks/tools/useMatchingTool";
import { useMeasuringTool } from "../hooks/tools/useMeasuringTool";
import { useRadarTool } from "../hooks/tools/useRadarTool";
import { useTentacleTool } from "../hooks/tools/useTentacleTool";
import { usePinTool } from "../hooks/tools/usePinTool";
import { useZoneTool } from "../hooks/tools/useZoneTool";
import { useThermometerTool } from "../hooks/tools/useThermometerTool";
import { useMapGeometryEdit } from "../hooks/map-screen/useMapGeometryEdit";
import { useMapSessionChrome } from "../hooks/map-screen/useMapSessionChrome";
import { useMapToolInteraction } from "../hooks/map-screen/useMapToolInteraction";
import {
  findLastRedoableAnnotation,
  findLastUndoableAnnotation,
  mapToolPlacingLabel,
} from "../domain/mapTools";
import {
  fallbackGameArea,
  gameAreaCenter,
  gameAreaToBoundsExpression,
  isPointInGameArea,
  type LatLngTuple,
} from "../domain/geometry";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { useAnnotations } from "../hooks/useAnnotations";
import { useGameTimer } from "../hooks/useGameTimer";
import { useGeolocation } from "../hooks/useGeolocation";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { useSessionSync } from "../hooks/useSessionSync";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { useTransitLayer } from "../hooks/useTransitLayer";
import { useWakeLock } from "../hooks/useWakeLock";
import { ensureRemoteSessionWriteAccess } from "../services/firestoreAnnotations";
import {
  ensureAnonymousUser,
  isFirebaseConfigured,
} from "../services/firebase";
import {
  getTransitMetro,
  metroSupportsLiveVehicles,
} from "../services/transitCatalog";
import {
  useAnnotationStore,
  useMapStore,
  useSessionStore,
  type MapTool,
} from "../state/sessionStore";

export function MapScreen() {
  const session = useSessionStore((state) => state.session);
  const setSession = useSessionStore((state) => state.setSession);
  const setLastSyncError = useSessionStore((state) => state.setLastSyncError);
  const pendingWrites = useSessionStore((state) => state.pendingWrites);
  const activeTool = useMapStore((state) => state.activeTool);
  const setActiveTool = useMapStore((state) => state.setActiveTool);
  const transitEnabled = useMapStore((state) => state.transitEnabled);
  const transitLiveEnabled = useMapStore((state) => state.transitLiveEnabled);
  const transitRouteFilter = useMapStore((state) => state.transitRouteFilter);
  const setTransitEnabled = useMapStore((state) => state.setTransitEnabled);
  const setTransitLiveEnabled = useMapStore(
    (state) => state.setTransitLiveEnabled,
  );
  const setTransitRouteFilter = useMapStore(
    (state) => state.setTransitRouteFilter,
  );
  const showCurrentLocation = useMapStore((state) => state.showCurrentLocation);
  const setShowCurrentLocation = useMapStore(
    (state) => state.setShowCurrentLocation,
  );
  const distanceUnit = useMapStore((state) => state.distanceUnit);
  const setDistanceUnit = useMapStore((state) => state.setDistanceUnit);
  const allAnnotations = useAnnotationStore((state) => state.annotations);
  const sessionId = session?.id;
  const annotations = useMemo(
    () =>
      allAnnotations.filter((annotation) => annotation.sessionId === sessionId),
    [allAnnotations, sessionId],
  );
  const undoTargetTool = activeTool !== "none" ? activeTool : undefined;
  const redoAnnotationIds = useAnnotationStore(
    (state) => state.redoAnnotationIds,
  );
  const canUndoLastTool = useMemo(
    () =>
      sessionId
        ? findLastUndoableAnnotation(
            allAnnotations,
            sessionId,
            undoTargetTool,
          ) !== null
        : false,
    [allAnnotations, sessionId, undoTargetTool],
  );
  const canRedoLastTool = useMemo(
    () =>
      sessionId
        ? findLastRedoableAnnotation(
            allAnnotations,
            sessionId,
            redoAnnotationIds,
            undoTargetTool,
          ) !== null
        : false,
    [allAnnotations, redoAnnotationIds, sessionId, undoTargetTool],
  );
  const clearAnnotationPulse = useAnnotationStore(
    (state) => state.clearAnnotationPulse,
  );
  const pulsingAnnotationIds = useAnnotationStore(
    (state) => state.pulsingAnnotationIds,
  );
  const selectedAnnotationId = useAnnotationStore(
    (state) => state.selectedAnnotationId,
  );
  const setSelectedAnnotationId = useAnnotationStore(
    (state) => state.setSelectedAnnotationId,
  );
  const layerVisibility = useMapStore((state) => state.layerVisibility);
  const keepScreenAwake = useMapStore((state) => state.keepScreenAwake);
  const setKeepScreenAwake = useMapStore((state) => state.setKeepScreenAwake);
  const setLayerVisibility = useMapStore((state) => state.setLayerVisibility);
  const {
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undoLastAnnotation,
    redoLastAnnotation,
    clearAllAnnotations,
  } = useAnnotations();
  const { refresh, loading: gpsLoading, error: gpsError } = useGeolocation();
  const { reading: liveLocation, error: liveLocationError } =
    useLiveLocation(showCurrentLocation);
  const timer = useGameTimer();
  const mapShellRef = useRef<HTMLDivElement>(null);
  const exportLegendRef = useRef<HTMLDivElement>(null);
  const syncStatus = useSyncStatus();
  useWakeLock(keepScreenAwake);

  const [logOpen, setLogOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [awaitingPlacement, setAwaitingPlacement] = useState(false);
  const [sessionChromeOpen, setSessionChromeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);

  const finishPlacement = useCallback(() => {
    setActiveTool("none");
    setAwaitingPlacement(false);
  }, [setActiveTool]);

  const ensurePointInGameArea = useCallback(
    (point: LatLngTuple) => {
      if (!session?.gameArea || isPointInGameArea(point, session.gameArea)) {
        return true;
      }

      setMapError("That point is outside the play area.");
      return false;
    },
    [session],
  );

  const armPlacement = useCallback(() => {
    setAwaitingPlacement(true);
    setMapError(null);
  }, []);

  const toolGameArea = fallbackGameArea(session?.gameArea);

  const radarTool = useRadarTool({
    active: activeTool === "radar",
    annotations,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    setMapError,
    mapError,
    gpsLoading,
    gpsError,
    awaitingPlacement,
    setAwaitingPlacement,
    refreshGps: refresh,
    ensurePointInGameArea,
    armPlacement,
  });
  const thermometerTool = useThermometerTool({
    active: activeTool === "thermometer",
    annotations,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    setMapError,
  });
  const matchingTool = useMatchingTool({
    active: activeTool === "matching",
    annotations,
    gameArea: toolGameArea,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    gpsLoading,
    gpsError,
    mapError,
    refreshGps: refresh,
    ensurePointInGameArea,
  });
  const measuringTool = useMeasuringTool({
    active: activeTool === "measuring",
    annotations,
    gameArea: toolGameArea,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    gpsLoading,
    gpsError,
    mapError,
    setMapError,
    refreshGps: refresh,
    ensurePointInGameArea,
  });
  const tentacleTool = useTentacleTool({
    active: activeTool === "tentacle",
    annotations,
    gameArea: toolGameArea,
    createAnnotation,
    distanceUnit,
    finishPlacement,
    setMapError,
    mapError,
    gpsLoading,
    gpsError,
    awaitingPlacement,
    setAwaitingPlacement,
    refreshGps: refresh,
    ensurePointInGameArea,
    armPlacement,
  });
  const pinTool = usePinTool({
    active: activeTool === "pin",
    createAnnotation,
    finishPlacement,
  });
  const zoneTool = useZoneTool({
    active: activeTool === "zone",
    createAnnotation,
    finishPlacement,
  });

  const {
    geometryEditAnnotation,
    geometryDraft,
    startGeometryEdit,
    cancelGeometryEdit,
    saveGeometryEdit,
    handleGeometryEditClick,
  } = useMapGeometryEdit({
    annotations,
    gameArea: toolGameArea,
    ensurePointInGameArea,
    setMapError,
    updateAnnotation,
  });

  const transitMetro = getTransitMetro(session?.transitMetroId);
  const transitLiveSupported = metroSupportsLiveVehicles(transitMetro ?? null);
  const isHost = Boolean(
    session?.hostUid && currentUid && session.hostUid === currentUid,
  );
  const {
    staticData: transitStaticData,
    liveData: transitLiveData,
    loadingStatic: transitLoadingStatic,
    loadingLive: transitLoadingLive,
    error: transitError,
  } = useTransitLayer({
    gameArea: fallbackGameArea(session?.gameArea),
    metroId: session?.transitMetroId,
    enabled: transitEnabled && Boolean(session?.gameArea),
    liveEnabled: transitLiveEnabled,
    routeFilter: transitRouteFilter,
  });

  useSessionSync();

  useEffect(() => {
    if (
      !session ||
      session.id === LOCAL_SESSION_ID ||
      !isFirebaseConfigured()
    ) {
      return;
    }

    void (async () => {
      try {
        const user = await ensureAnonymousUser();
        setCurrentUid(user.uid);
        const activeSession = await ensureRemoteSessionWriteAccess(
          session,
          user.uid,
        );

        if (
          activeSession.id !== session.id ||
          activeSession.memberUids.join(",") !== session.memberUids.join(",")
        ) {
          setSession(activeSession);
        }
      } catch (error) {
        setLastSyncError(
          error instanceof Error
            ? error.message
            : "Unable to access this session.",
        );
      }
    })();
  }, [session, setLastSyncError, setSession]);

  useEffect(() => {
    if (!transitLiveSupported && transitLiveEnabled) {
      setTransitLiveEnabled(false);
    }
  }, [transitLiveSupported, transitLiveEnabled, setTransitLiveEnabled]);

  useEffect(() => {
    if (pulsingAnnotationIds.length === 0) {
      return;
    }

    const timeouts = pulsingAnnotationIds.map((id) =>
      window.setTimeout(() => clearAnnotationPulse(id), 1200),
    );

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [clearAnnotationPulse, pulsingAnnotationIds]);

  useEffect(() => {
    if (!selectedAnnotationId) {
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- clear placement when an annotation is selected */
    setActiveTool("none");
    setAwaitingPlacement(false);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [selectedAnnotationId, setActiveTool]);

  const center = useMemo<LatLngTuple>(() => {
    if (!session?.gameArea) {
      return [51.505, -0.09];
    }

    return gameAreaCenter(session.gameArea);
  }, [session]);

  const mapFocusBounds = useMemo(() => {
    if (!session?.gameArea) {
      return null;
    }

    return gameAreaToBoundsExpression(session.gameArea);
  }, [session]);

  const selectedAnnotation = useMemo(
    () =>
      annotations.find(
        (annotation) => annotation.id === selectedAnnotationId,
      ) ?? null,
    [annotations, selectedAnnotationId],
  );

  const { handleMapClick } = useMapToolInteraction({
    activeTool,
    ensurePointInGameArea,
    handleGeometryEditClick,
    geometryEditActive: Boolean(geometryEditAnnotation && geometryDraft),
    setSelectedAnnotationId,
    radarTool,
    thermometerTool,
    measuringTool,
    matchingTool,
    tentacleTool,
    pinTool,
    zoneTool,
  });

  const { handleClearMap, handleResetBoard, handleEndSession, exportMap } =
    useMapSessionChrome({
      session,
      isHost,
      annotations,
      mapShellRef,
      exportLegendRef,
      clearAllAnnotations,
      setSelectedAnnotationId,
      setSettingsOpen,
    });

  if (!session?.gameArea) {
    return <Navigate to="/create" replace />;
  }

  const placementCrosshair =
    zoneTool.placementCrosshair ||
    awaitingPlacement ||
    pinTool.placementCrosshair ||
    radarTool.placementCrosshair ||
    thermometerTool.placementCrosshair ||
    matchingTool.placementCrosshair ||
    measuringTool.placementCrosshair ||
    tentacleTool.placementCrosshair;

  const handleSelectTool = (tool: MapTool) => {
    measuringTool.resetDraft();
    matchingTool.resetDraft();
    thermometerTool.resetDraft();
    radarTool.resetDraft();
    tentacleTool.resetDraft();
    pinTool.resetDraft();
    zoneTool.resetDraft();
    setSelectedAnnotationId(null);
    setAwaitingPlacement(false);
    setActiveTool(tool);
  };

  const handleUndoLastAnnotation = () => {
    setSelectedAnnotationId(null);
    void undoLastAnnotation(undoTargetTool);
  };

  const handleRedoLastAnnotation = () => {
    setSelectedAnnotationId(null);
    void redoLastAnnotation(undoTargetTool);
  };

  const renderPanel = () => {
    switch (activeTool) {
      case "radar":
        return radarTool.panel;
      case "zone":
        return zoneTool.panel;
      case "thermometer":
        return thermometerTool.panel;
      case "matching":
        return matchingTool.panel;
      case "measuring":
        return measuringTool.panel;
      case "pin":
        return pinTool.panel;
      case "tentacle":
        return tentacleTool.panel;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[100dvh] h-full">
      <div ref={mapShellRef} className="absolute inset-0">
        <MapView
          key={session.id}
          mapKey={session.id}
          center={center}
          zoom={12}
          focusBounds={mapFocusBounds}
          onMapClick={handleMapClick}
          className={
            placementCrosshair ? "map-crosshair h-full w-full" : "h-full w-full"
          }
        >
          <GameAreaMask gameArea={session.gameArea} />
          {transitEnabled && layerVisibility.transit ? (
            <TransitLayer
              staticData={transitStaticData}
              liveData={transitLiveData}
            />
          ) : null}
          {showCurrentLocation ? (
            <UserLocationLayer reading={liveLocation} />
          ) : null}
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            selectedAnnotationId={selectedAnnotationId}
            layerVisibility={layerVisibility}
          />
          {geometryEditAnnotation && geometryDraft ? (
            <GeometryEditLayer
              annotation={geometryEditAnnotation}
              draftGeometry={geometryDraft}
              gameArea={toolGameArea}
            />
          ) : null}
          <ToolDraftLayer
            activeTool={activeTool}
            radarCenter={radarTool.draft.radarCenter}
            radarRadiusMeters={radarTool.draft.radarRadius}
            pinPoint={pinTool.draft.pinPoint}
            tentacleCenter={tentacleTool.draft.tentacleCenter}
            tentacleSearchRadiusMeters={
              tentacleTool.draft.tentacleSearchRadiusMeters
            }
            tentacleAnswerRadiusMeters={
              tentacleTool.draft.tentacleAnswerRadiusMeters
            }
            tentacleDraftPois={tentacleTool.draft.tentaclePois}
            tentacleDraftSelectedPoiId={
              tentacleTool.draft.tentacleSelectedPoiId
            }
            tentacleDraftOutOfReach={tentacleTool.draft.tentacleOutOfReach}
            tentacleEliminationPreview={
              tentacleTool.draft.tentacleEliminationPreview
            }
            thermoA={thermometerTool.draft.thermoA}
            thermoB={thermometerTool.draft.thermoB}
            thermoAnswer={thermometerTool.draft.thermometerAnswer}
            gameArea={session.gameArea}
            measuringSeekerPoint={measuringTool.draft.measuringSeekerPoint}
            measuringTargetPoint={measuringTool.draft.measuringTargetPoint}
            measuringPlacePoints={measuringTool.draft.measuringPlaces.map(
              (place) => place.point,
            )}
            measuringSiteRadiusMeters={
              measuringTool.draft.measuringDistanceMeters
            }
            measuringBoundaryPreview={
              measuringTool.draft.measuringBoundaryPreview
            }
            measuringEliminationPreview={
              measuringTool.draft.measuringEliminationPreview
            }
            matchingSeekerPoint={matchingTool.draft.matchingSeekerPoint}
            matchingNearestFeaturePoint={
              matchingTool.draft.matchingNearestFeaturePoint
            }
            matchingBoundaryPreview={matchingTool.draft.matchingBoundaryPreview}
            matchingEliminationPreview={
              matchingTool.draft.matchingEliminationPreview
            }
            zoneVertices={zoneTool.draft.zoneVertices}
          />
          {zoneTool.draft.zoneVertices.length > 0 ? (
            <Polygon
              positions={zoneTool.draft.zoneVertices}
              pathOptions={{
                color: "#a855f7",
                dashArray: "6 6",
                fillOpacity: 0.15,
              }}
            />
          ) : null}
        </MapView>
        <div
          ref={exportLegendRef}
          className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-slate-950/90 px-4 py-3 text-xs text-slate-200"
        >
          <p className="font-semibold">Session {session.code}</p>
          <p className="mt-1">
            Legend: radar, thermometer, zone, pin, tentacle overlays
          </p>
        </div>
      </div>

      <MapModeChip activeTool={activeTool} />
      <SyncStatusBanner
        status={syncStatus.status}
        queuedWrites={syncStatus.queuedWrites}
        message={syncStatus.remoteUpdateNotice ?? syncStatus.lastSyncError}
      />

      {geometryEditAnnotation && geometryDraft ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom)+0.5rem)] z-[1002] px-3">
          <div className="mx-auto flex max-w-xl gap-2 rounded-3xl border border-slate-700 bg-slate-950/95 p-3 backdrop-blur">
            <button
              type="button"
              onClick={() => void saveGeometryEdit()}
              className="min-h-12 flex-1 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950"
            >
              Save shape
            </button>
            <button
              type="button"
              onClick={cancelGeometryEdit}
              className="min-h-12 flex-1 rounded-xl bg-slate-800 px-3 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-stretch justify-between gap-2">
          <Link
            to="/"
            className="flex min-h-12 min-w-12 self-start items-center justify-center rounded-xl bg-slate-900/90 px-3 text-lg backdrop-blur"
            aria-label="Home"
          >
            <span aria-hidden="true">🏠</span>
          </Link>
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={() => setSessionChromeOpen((open) => !open)}
              className="hidden min-h-12 rounded-xl bg-slate-900/90 px-4 text-sm font-medium text-slate-100 backdrop-blur md:inline-flex"
              aria-expanded={sessionChromeOpen}
            >
              {sessionChromeOpen ? "Hide" : "Session"}
            </button>
            <div className="flex flex-col gap-2 md:hidden">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-slate-900/90 px-3 text-lg text-slate-100 backdrop-blur"
                aria-label="Open settings"
              >
                <span aria-hidden="true">⚙️</span>
              </button>
              <button
                type="button"
                onClick={handleUndoLastAnnotation}
                disabled={!canUndoLastTool}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-slate-900/90 px-3 text-slate-100 backdrop-blur disabled:opacity-40"
                aria-label={
                  undoTargetTool
                    ? `Undo last ${mapToolPlacingLabel(undoTargetTool)}`
                    : "Undo last tool"
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 10h11a4 4 0 0 1 0 8H9" />
                  <path d="M7 6 3 10l4 4" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRedoLastAnnotation}
                disabled={!canRedoLastTool}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-slate-900/90 px-3 text-slate-100 backdrop-blur disabled:opacity-40"
                aria-label={
                  undoTargetTool
                    ? `Redo last ${mapToolPlacingLabel(undoTargetTool)}`
                    : "Redo last tool"
                }
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 10H10a4 4 0 0 0 0 8h5" />
                  <path d="m17 6 4 4-4 4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {sessionChromeOpen ? (
          <div className="pointer-events-auto mt-2 hidden space-y-2 md:block">
            {pendingWrites > 0 ? (
              <p className="rounded-xl bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
                {pendingWrites} pending sync
              </p>
            ) : null}
            <TransitControls
              enabled={transitEnabled}
              liveEnabled={transitLiveEnabled}
              liveSupported={transitLiveSupported}
              routeFilter={transitRouteFilter}
              metroLabel={transitMetro?.label ?? null}
              loadingStatic={transitLoadingStatic}
              loadingLive={transitLoadingLive}
              stopCount={transitStaticData?.stops.length ?? 0}
              routeCount={transitStaticData?.routes.length ?? 0}
              vehicleCount={transitLiveData?.vehicles.length ?? 0}
              lastUpdated={
                transitLiveData?.fetchedAt ?? transitStaticData?.fetchedAt
              }
              error={transitError}
              onToggleEnabled={() => setTransitEnabled(!transitEnabled)}
              onToggleLive={() => setTransitLiveEnabled(!transitLiveEnabled)}
              onRouteFilterChange={setTransitRouteFilter}
            />
          </div>
        ) : null}
      </div>

      <MapSettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pendingWrites={pendingWrites}
        showCurrentLocation={showCurrentLocation}
        onShowCurrentLocationChange={setShowCurrentLocation}
        keepScreenAwake={keepScreenAwake}
        onKeepScreenAwakeChange={setKeepScreenAwake}
        layerVisibility={layerVisibility}
        onLayerVisibilityChange={setLayerVisibility}
        distanceUnit={distanceUnit}
        onDistanceUnitChange={setDistanceUnit}
        locationError={liveLocationError}
        timerRunning={timer.running}
        timerHasStarted={timer.hasStarted}
        timerLabel={timer.formattedElapsed}
        onTimerStart={timer.start}
        onTimerPause={timer.pause}
        onTimerReset={timer.reset}
        transitEnabled={transitEnabled}
        transitLiveEnabled={transitLiveEnabled}
        transitLiveSupported={transitLiveSupported}
        transitRouteFilter={transitRouteFilter}
        metroLabel={transitMetro?.label ?? null}
        loadingStatic={transitLoadingStatic}
        loadingLive={transitLoadingLive}
        stopCount={transitStaticData?.stops.length ?? 0}
        routeCount={transitStaticData?.routes.length ?? 0}
        vehicleCount={transitLiveData?.vehicles.length ?? 0}
        lastUpdated={transitLiveData?.fetchedAt ?? transitStaticData?.fetchedAt}
        transitError={transitError}
        onToggleTransit={() => setTransitEnabled(!transitEnabled)}
        onToggleLiveTransit={() => setTransitLiveEnabled(!transitLiveEnabled)}
        onTransitRouteFilterChange={setTransitRouteFilter}
        onOpenLog={() => {
          setSettingsOpen(false);
          setLogOpen(true);
        }}
        onClearMap={handleClearMap}
        onExport={() => {
          setSettingsOpen(false);
          void exportMap();
        }}
        isHost={isHost}
        onResetBoard={handleResetBoard}
        onEndSession={() => void handleEndSession()}
        sessionCode={session.code}
        remoteSession={session.id !== LOCAL_SESSION_ID}
      />

      {activeTool !== "none" && !selectedAnnotation ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(var(--dock-height)+env(safe-area-inset-bottom)+0.5rem)] z-[1000] px-3">
          <div className="relative mx-auto max-h-[min(42dvh,420px)] max-w-xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-700 bg-slate-950/95 p-4 pt-10 backdrop-blur">
            <PopupCloseButton
              label={`Close ${mapToolPlacingLabel(activeTool)}`}
              onClick={() => handleSelectTool("none")}
            />
            {renderPanel()}
          </div>
        </div>
      ) : null}

      {selectedAnnotation ? (
        <AnnotationEditSheet
          annotation={selectedAnnotation}
          gameArea={session.gameArea}
          onClose={() => setSelectedAnnotationId(null)}
          onSave={(annotation) => {
            void updateAnnotation(annotation);
            setSelectedAnnotationId(null);
          }}
          onDelete={(id) => {
            void deleteAnnotation(id);
            setSelectedAnnotationId(null);
          }}
          onEditOnMap={() => startGeometryEdit(selectedAnnotation.id)}
        />
      ) : null}

      <ToolDock
        activeTool={activeTool}
        timerLabel={timer.formattedElapsed}
        timerRunning={timer.running}
        timerHasStarted={timer.hasStarted}
        onTimerStart={timer.start}
        onTimerPause={timer.pause}
        onTimerReset={timer.reset}
        onSelect={handleSelectTool}
      />

      <SessionLog
        open={logOpen}
        annotations={annotations}
        onClose={() => setLogOpen(false)}
        onDelete={(id) => void deleteAnnotation(id)}
        onEdit={(id) => {
          setLogOpen(false);
          setActiveTool("none");
          setAwaitingPlacement(false);
          setSelectedAnnotationId(id);
        }}
      />
    </div>
  );
}
