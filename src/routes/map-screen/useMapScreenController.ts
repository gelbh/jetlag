import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  askHudCameraPaddingPx,
  isAskHudOwnedTool,
  MAP_FIRST_CAMERA_BOTTOM_PX,
  MAP_FIRST_CAMERA_TOP_PX,
} from "../../domain/ask/askHudModes";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  PANEL_PEEK_HEIGHT_PX,
} from "../../domain/device/motion/motionTokens";
import { isQuestionDockTool } from "../../domain/map/mapTools";
import {
  PANEL_PADDING_EXTRA_PX,
  type PlacementViewportFrame,
} from "../../domain/map/placementCamera";
import { tentacleDraftPoiIdFromOverlayId } from "../../domain/map/tentacleDraftOverlay";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import { useToolPanelChrome } from "../../hooks/chrome/useToolPanelChrome";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useAdminBoundaryFeatures } from "../../hooks/map-screen/useAdminBoundaryFeatures";
import { useMapDraftOverlays } from "../../hooks/map-screen/useMapDraftOverlays";
import { useMapGeometryEdit } from "../../hooks/map-screen/useMapGeometryEdit";
import { useMapOverlayActions } from "../../hooks/map-screen/useMapOverlayActions";
import { useMapScreenTools } from "../../hooks/map-screen/useMapScreenTools";
import { useMapSessionActions } from "../../hooks/map-screen/useMapSessionActions";
import { useMapSessionChrome } from "../../hooks/map-screen/useMapSessionChrome";
import { useMapToolInteraction } from "../../hooks/map-screen/useMapToolInteraction";
import { usePlacementMapFocus } from "../../hooks/map-screen/usePlacementMapFocus";
import { useWizardSheetSnap } from "../../hooks/wizard/useWizardSheetSnap";
import { ANALYTICS_EVENTS, track } from "../../services/core/analytics/analytics";
import type { MapTool } from "../../state/sessionStore";
import { buildPlacementCameraDraft } from "./shared/placementCameraDraft";
import { useMapScreenCore } from "./shared/useMapScreenCore";
import { useMapScreenSeekerEffects } from "./shared/useMapScreenSeekerEffects";
import { useMapScreenTransit } from "./shared/useMapScreenTransit";

export function useMapScreenController() {
  const core = useMapScreenCore({ role: "seeker" });
  const {
    session,
    setSession,
    myRole,
    pendingWrites,
    activeTool,
    setActiveTool,
    showCurrentLocation,
    setShowCurrentLocation,
    showAdminBoundaries,
    setShowAdminBoundaries,
    distanceUnit,
    mapStyle,
    setMapStyle,
    streetBasemap,
    setStreetBasemap,
    lowPowerMode,
    setLowPowerMode,
    effectiveBasemapStyle,
    sessionRules,
    gameArea,
    matchingAreasError,
    annotations,
    undoTargetTool,
    canUndoLastTool,
    canRedoLastTool,
    selectedAnnotationId,
    setSelectedAnnotationId,
    selectedAnnotation,
    layerVisibility,
    setLayerVisibility,
    keepScreenAwake,
    setKeepScreenAwake,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    undoLastAnnotation,
    redoLastAnnotation,
    clearAllAnnotations,
    liveLocationError,
    mapViewport,
    mapShellSize,
    handleLiveLocationError,
    handleMapStyleChange,
    handleMapViewportChange,
    overlay,
    uid,
    isHost,
    isRemote,
    canControlTimer,
    timerSyncing,
    timer,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    chatMessages,
    syncStatus,
    hasUnreadChat,
    unreadCount,
    gameRulesEditable,
    mapShellRef,
    chromeHudRef,
    exportLegendRef,
    toolGameArea,
    center,
    mapFocusBounds,
  } = core;

  const transit = useMapScreenTransit(session, gameArea, lowPowerMode);
  const { features: adminBoundaryFeatures, loading: adminBoundaryLoading } =
    useAdminBoundaryFeatures(gameArea, sessionRules, showAdminBoundaries);

  const [firstRunDismissed, setFirstRunDismissed] = useState(false);

  const tools = useMapScreenTools({
    session,
    uid,
    activeTool,
    setActiveTool,
    annotations,
    sessionRules,
    gameArea,
    toolGameArea,
    pendingQuestions,
    distanceUnit,
    createAnnotation,
  });
  const {
    radarTool,
    photoTool,
    thermometerTool,
    pinTool,
    zoneTool,
    drawTool,
    matchingTool,
    measuringTool,
    tentacleTool,
    awaitHiderAnswer,
    canSubmitQuestion,
    mapError,
    setMapError,
    awaitingPlacement,
    setAwaitingPlacement,
    resetToolDrafts,
    ensurePointInGameArea,
    postSystemMessage,
    cancelThermometerWalk,
    displayPendingQuestions,
  } = tools;

  const { handleCancelWalkingQuestion } = useMapScreenSeekerEffects({
    session,
    uid,
    myRole,
    isHost,
    canControlTimer,
    sessionRules,
    pendingQuestions,
    hidingZones,
    seekerLocations,
    timer,
    toolGameArea,
    createAnnotation,
    deleteAnnotation,
    annotations,
    awaitHiderAnswer,
    postSystemMessage,
    cancelThermometerWalk,
    setMapError,
  });

  const activeThermometerWalk = useActiveThermometerWalk({
    pendingQuestions,
    seekerLocations,
    myUid: uid,
    localLivePoint: thermometerTool.walkCurrentPoint,
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

  useEffect(() => {
    if (!selectedAnnotationId) {
      return;
    }

    setActiveTool("none");
    setAwaitingPlacement(false);
    overlay.closeSheet();
  }, [overlay.closeSheet, selectedAnnotationId, setActiveTool, setAwaitingPlacement]);

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

  const handleDraftMarkerActivate = useCallback(
    (overlayId: string): boolean => {
      const poiId = tentacleDraftPoiIdFromOverlayId(overlayId);
      if (!poiId) {
        return false;
      }
      tentacleTool.selectDraftPoi(poiId);
      return true;
    },
    [tentacleTool.selectDraftPoi],
  );

  const sessionActions = useMapSessionActions({
    session,
    setSession,
    uid,
    myRole,
    isRemote,
    gameRulesEditable,
    timerHasStarted: timer.hasStarted,
    hidingZones,
  });
  const { confirmedHidingZones, endGameBlocked, canStartEndGame, canRequestFoundHider } =
    sessionActions;

  const {
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    handleLeaveSession,
    exportMap,
  } = useMapSessionChrome({
    session,
    isHost,
    annotations,
    pendingQuestions,
    mapShellRef,
    exportLegendRef,
    clearAllAnnotations,
    setSelectedAnnotationId,
    closeSettingsPanel: overlay.closeSheet,
    resetTimer: timer.reset,
    endGameBlocked,
  });

  const deferredTentacleSelectedPoiId = useDeferredValue(tentacleTool.draft.tentacleSelectedPoiId);

  const {
    overlays: mapDraftOverlays,
    eliminationFeatures: draftEliminationFeatures,
    tentacleLodPhase,
  } = useMapDraftOverlays({
    activeTool,
    gameArea: toolGameArea,
    mapStyle: effectiveBasemapStyle,
    streetBasemap,
    radar: {
      center: radarTool.draft.radarCenter,
      radiusMeters: radarTool.draft.radarRadius,
      answer: radarTool.draft.radarAnswer,
    },
    pin: { point: pinTool.draft.pinPoint },
    tentacle: {
      center: tentacleTool.draft.tentacleCenter,
      searchRadiusMeters: tentacleTool.draft.tentacleSearchRadiusMeters,
      answerRadiusMeters: tentacleTool.draft.tentacleAnswerRadiusMeters,
      pois: tentacleTool.draft.tentaclePois,
      selectedPoiId: deferredTentacleSelectedPoiId,
      outOfReach: tentacleTool.draft.tentacleOutOfReach,
      seekerResolving: tentacleTool.draft.seekerResolving,
    },
    thermometer: {
      thermoA: thermometerTool.draft.thermoA,
      thermoB: thermometerTool.draft.thermoB,
      answer: thermometerTool.draft.thermometerAnswer,
      targetDistanceMeters: thermometerTool.draft.thermometerDistanceMeters,
      walkCurrentPoint: thermometerTool.walkCurrentPoint,
      walkActive: thermometerTool.draft.walkingQuestionId !== null,
    },
    measuring: {
      seekerPoint: measuringTool.draft.measuringSeekerPoint,
      targetPoint: measuringTool.draft.measuringTargetPoint,
      placePoints: tools.measuringPlacePoints,
      siteRadiusMeters: measuringTool.draft.measuringDistanceMeters,
      boundaryPreview: measuringTool.draft.measuringBoundaryPreview,
      eliminationPreview: measuringTool.draft.measuringEliminationPreview,
      seekerResolving: measuringTool.draft.seekerResolving,
      categoryId: measuringTool.draft.measuringCategoryId,
    },
    matching: {
      seekerPoint: matchingTool.draft.matchingSeekerPoint,
      nearestFeaturePoint: matchingTool.draft.matchingNearestFeaturePoint,
      boundaryPreview: matchingTool.draft.matchingBoundaryPreview,
      eliminationPreview: matchingTool.draft.matchingEliminationPreview,
      seekerResolving: matchingTool.draft.seekerResolving,
      categoryId: matchingTool.draft.matchingCategoryId,
    },
    zone: { vertices: zoneTool.draft.zoneVertices },
    draw: { strokePoints: drawTool.draft.strokePoints },
  });

  const { sheetSnap, mapAttentionActive } = useWizardSheetSnap(activeTool);

  const {
    mapPanning,
    panelMinimized,
    userMinimized,
    setPanelMinimized: setUserMinimized,
    handleMapPanStart,
    handleMapPanEnd,
  } = useToolPanelChrome(activeTool, {
    sheetSnap: activeTool !== "none" && isQuestionDockTool(activeTool) ? sheetSnap : "mid",
  });
  const placementCameraDraft = useMemo(
    () =>
      buildPlacementCameraDraft({
        deferredTentacleSelectedPoiId,
        walkCurrentPoint: thermometerTool.walkCurrentPoint,
        drafts: {
          radar: radarTool.draft,
          pin: pinTool.draft,
          tentacle: tentacleTool.draft,
          thermometer: thermometerTool.draft,
          measuring: measuringTool.draft,
          matching: matchingTool.draft,
          zone: zoneTool.draft,
        },
      }),
    [
      deferredTentacleSelectedPoiId,
      matchingTool.draft,
      measuringTool.draft,
      pinTool.draft,
      radarTool.draft,
      tentacleTool.draft,
      thermometerTool.draft,
      thermometerTool.walkCurrentPoint,
      zoneTool.draft,
    ],
  );

  const activeAskHud =
    activeTool === "matching"
      ? matchingTool.hud
      : activeTool === "radar"
        ? radarTool.hud
        : activeTool === "tentacle"
          ? tentacleTool.hud
          : activeTool === "measuring"
            ? measuringTool.hud
            : activeTool === "thermometer"
              ? thermometerTool.hud
              : activeTool === "photo"
                ? photoTool.hud
                : null;
  const askHudBundle = activeAskHud as
    | import("../../hooks/map-screen/heavyMapTools").AskToolHudBundle
    | null;
  const askMapFirst = Boolean(askHudBundle?.suppressSheet);
  const mapFirstBottomPx = askHudBundle?.mapFirstCameraBottomPx ?? MAP_FIRST_CAMERA_BOTTOM_PX;
  const mapFirstTopPx = askHudBundle?.mapFirstCameraTopPx ?? MAP_FIRST_CAMERA_TOP_PX;
  const panelPeekHeightPx = askMapFirst
    ? mapFirstBottomPx
    : isAskHudOwnedTool(activeTool)
      ? askHudCameraPaddingPx(activeTool)
      : panelMinimized
        ? PANEL_PEEK_HEIGHT_PX
        : DEFAULT_PANEL_HEIGHT_PX;

  const placementViewportFrame = useMemo((): PlacementViewportFrame | null => {
    if (!mapViewport || mapShellSize.width <= 0 || mapShellSize.height <= 0) {
      return null;
    }

    return {
      bounds: mapViewport.bounds,
      widthPx: mapShellSize.width,
      heightPx: mapShellSize.height,
      bottomPaddingPx: panelPeekHeightPx + PANEL_PADDING_EXTRA_PX,
    };
  }, [mapShellSize.height, mapShellSize.width, mapViewport, panelPeekHeightPx]);

  const {
    effectiveFocusBounds: effectiveMapFocusBounds,
    placementRecenterToken,
    focusPaddingBias: placementFocusPaddingBias,
    focusPaddingTopBias: placementFocusPaddingTopBias,
    focusMinZoom: placementFocusMinZoom,
    focusMaxZoom: placementFocusMaxZoom,
    focusPreferFly: placementFocusPreferFly,
    requestPlacementRecenter,
  } = usePlacementMapFocus({
    activeTool,
    draft: placementCameraDraft,
    overlays: mapDraftOverlays,
    eliminationFeatures: draftEliminationFeatures,
    gameArea: toolGameArea,
    defaultFocusBounds: mapFocusBounds,
    enabled: true,
    panelMinimized,
    hudBottomPaddingPx: askMapFirst
      ? mapFirstBottomPx
      : isAskHudOwnedTool(activeTool)
        ? askHudCameraPaddingPx(activeTool)
        : null,
    hudTopPaddingPx: askMapFirst ? mapFirstTopPx : null,
    selectedPoiId: deferredTentacleSelectedPoiId,
    walkActive: thermometerTool.draft.walkingQuestionId !== null,
    viewportFrame: placementViewportFrame,
  });

  const dismissTransientUi = useCallback(() => {
    overlay.closeSheet();
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    setAwaitingPlacement(false);
  }, [cancelGeometryEdit, overlay.closeSheet, setSelectedAnnotationId, setAwaitingPlacement]);

  const handleSelectTool = useCallback(
    (tool: MapTool) => {
      if (
        tool !== "none" &&
        session &&
        !resolveToolDockEnabled(session, tool, { hasHiders: awaitHiderAnswer })
      ) {
        return;
      }

      resetToolDrafts();
      dismissTransientUi();
      setMapError(null);
      setActiveTool(tool);
      if (tool !== "none") {
        track(ANALYTICS_EVENTS.map_tool_used, { tool });
      }
    },
    [awaitHiderAnswer, dismissTransientUi, resetToolDrafts, session, setActiveTool, setMapError],
  );

  const { handleOpenChat, handleOpenSettings, handleOpenLog, handleOpenCodes } =
    useMapOverlayActions({
      overlay,
      resetToolDrafts,
      setActiveTool,
      setAwaitingPlacement,
      setSelectedAnnotationId,
      cancelGeometryEdit,
    });

  const handleUndoLastAnnotation = useCallback(() => {
    setSelectedAnnotationId(null);
    void undoLastAnnotation(undoTargetTool);
  }, [setSelectedAnnotationId, undoLastAnnotation, undoTargetTool]);

  const handleRedoLastAnnotation = useCallback(() => {
    setSelectedAnnotationId(null);
    void redoLastAnnotation(undoTargetTool);
  }, [redoLastAnnotation, setSelectedAnnotationId, undoTargetTool]);

  return {
    session,
    gameArea,
    myRole,
    uid,
    isHost,
    activeTool,
    sessionRules,
    annotations,
    pendingQuestions,
    mapPendingQuestions: displayPendingQuestions,
    pendingWrites,
    distanceUnit,
    mapStyle,
    setMapStyle,
    streetBasemap,
    setStreetBasemap,
    handleMapStyleChange,
    effectiveBasemapStyle,
    lowPowerMode,
    layerVisibility,
    showCurrentLocation,
    setShowCurrentLocation,
    showAdminBoundaries,
    setShowAdminBoundaries,
    keepScreenAwake,
    setKeepScreenAwake,
    setLowPowerMode,
    setLayerVisibility,
    ...transit,
    mapViewport,
    mapShellRef,
    chromeHudRef,
    exportLegendRef,
    center,
    mapFocusBounds,
    effectiveMapFocusBounds,
    placementRecenterToken,
    placementFocusPaddingBias,
    placementFocusPaddingTopBias,
    placementFocusMinZoom,
    placementFocusMaxZoom,
    placementFocusPreferFly,
    requestPlacementRecenter,
    placementCrosshair: tools.placementCrosshair,
    mapAttentionActive,
    handleMapClick,
    handleDraftMarkerActivate,
    handleMapViewportChange,
    handleMapPanStart,
    handleMapPanEnd,
    handleLiveLocationError,
    toolGameArea,
    draftEliminationFeatures,
    confirmedHidingZones,
    seekerLocations,
    activeThermometerWalk,
    geometryEditAnnotation,
    geometryDraft,
    mapDraftOverlays,
    adminBoundaryFeatures,
    adminBoundaryLoading,
    awaitingPlacement,
    selectedAnnotationId,
    selectedAnnotation,
    setSelectedAnnotationId,
    overlay,
    syncStatus,
    matchingAreasError,
    timer,
    timerSyncing,
    canControlTimer,
    canUndoLastTool,
    canRedoLastTool,
    awaitHiderAnswer,
    canSubmitQuestion,
    canStartEndGame,
    endGameBlocked,
    canRequestFoundHider,
    firstRunDismissed,
    setFirstRunDismissed,
    mapPanning,
    panelMinimized,
    userMinimized,
    setUserMinimized,
    mapError,
    heavyToolActive: tools.heavyToolActive,
    heavyMapToolsSlotProps: tools.heavyMapToolsSlotProps,
    radarTool,
    photoTool,
    thermometerTool,
    matchingTool,
    measuringTool,
    pinTool,
    zoneTool,
    drawTool,
    tentacleTool: {
      ...tentacleTool,
      tentacleLodPhase,
    },
    chatMessages,
    hasUnreadChat,
    unreadCount,
    liveLocationError,
    isRemote,
    gameRulesEditable,
    draftAdvancedSettings: sessionActions.draftAdvancedSettings,
    setDraftAdvancedSettings: sessionActions.setDraftAdvancedSettings,
    deleteAnnotation,
    updateAnnotation,
    startGeometryEdit,
    cancelGeometryEdit,
    saveGeometryEdit,
    handleSelectTool,
    handleOpenChat,
    handleOpenSettings,
    handleOpenLog,
    handleOpenCodes,
    handleUndoLastAnnotation,
    handleRedoLastAnnotation,
    handleResetEndGame: sessionActions.handleResetEndGame,
    handleStartEndGame: sessionActions.handleStartEndGame,
    handleRequestFoundHider: sessionActions.handleRequestFoundHider,
    handleDeclineFoundHider: sessionActions.handleDeclineFoundHider,
    handleClearMap,
    handleResetBoard,
    handleResetSession,
    handleEndSession,
    handleLeaveSession,
    handleSaveGameRules: sessionActions.handleSaveGameRules,
    handleDistanceUnitChange: sessionActions.handleDistanceUnitChange,
    exportMap,
    answerPendingQuestion: tools.answerPendingQuestion,
    dismissExpiredPendingQuestion: tools.dismissExpiredPendingQuestion,
    handleCancelWalkingQuestion,
    setActiveTool,
    setAwaitingPlacement,
  };
}

export type MapScreenController = ReturnType<typeof useMapScreenController>;
