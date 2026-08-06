import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import type { MapChromeControlInset } from "../../components/map/helpers/mapChromeControlInset";
import { useDesktopLayout } from "../../hooks/layout/useDesktopLayout";
import { useMapScreenTools } from "../../hooks/map-screen/useMapScreenTools";
import { useMapSessionActions } from "../../hooks/map-screen/useMapSessionActions";
import { useMapOverlayActions } from "../../hooks/map-screen/useMapOverlayActions";
import { useMapGeometryEdit } from "../../hooks/map-screen/useMapGeometryEdit";
import { useMapSessionChrome } from "../../hooks/map-screen/useMapSessionChrome";
import { useMapDraftOverlays } from "../../hooks/map-screen/useMapDraftOverlays";
import { usePlacementMapFocus } from "../../hooks/map-screen/usePlacementMapFocus";
import {
  PANEL_PADDING_EXTRA_PX,
  type PlacementViewportFrame,
} from "../../domain/map/placementCamera";
import {
  DEFAULT_PANEL_HEIGHT_PX,
  PANEL_PEEK_HEIGHT_PX,
} from "../../domain/device/motion/motionTokens";
import { useMapToolInteraction } from "../../hooks/map-screen/useMapToolInteraction";
import { useAdminBoundaryFeatures } from "../../hooks/map-screen/useAdminBoundaryFeatures";
import { resolveToolDockEnabled } from "../../domain/session/rules";
import { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useToolPanelChrome } from "../../hooks/chrome/useToolPanelChrome";
import { useWizardSheetSnap } from "../../hooks/wizard/useWizardSheetSnap";
import { isQuestionDockTool } from "../../domain/map/mapTools";
import {
  ASK_HUD_CAMERA_PADDING_PX,
  isAskHudOwnedTool,
} from "../../domain/ask/askHudModes";
import type { MapTool } from "../../state/sessionStore";
import { ANALYTICS_EVENTS, track } from "../../services/core/analytics/analytics";
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
    notificationPreferences,
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
    enableNotifications,
    updateNotificationPreferences,
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
    useAdminBoundaryFeatures(
    gameArea,
    sessionRules,
    showAdminBoundaries,
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
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

  const { handleClearMap, handleResetBoard, handleResetSession, handleEndSession, handleLeaveSession, exportMap } =
    useMapSessionChrome({
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

  const deferredTentacleSelectedPoiId = useDeferredValue(
    tentacleTool.draft.tentacleSelectedPoiId,
  );

  const { overlays: mapDraftOverlays, eliminationFeatures: draftEliminationFeatures } =
    useMapDraftOverlays({
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
        },
        matching: {
          seekerPoint: matchingTool.draft.matchingSeekerPoint,
          nearestFeaturePoint: matchingTool.draft.matchingNearestFeaturePoint,
          boundaryPreview: matchingTool.draft.matchingBoundaryPreview,
          eliminationPreview: matchingTool.draft.matchingEliminationPreview,
          seekerResolving: matchingTool.draft.seekerResolving,
        },
        zone: { vertices: zoneTool.draft.zoneVertices },
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
    sheetSnap:
      activeTool !== "none" && isQuestionDockTool(activeTool) ? sheetSnap : "mid",
  });
  const isDesktopLayout = useDesktopLayout();
  const mapChromeControlInset: MapChromeControlInset =
    panelMinimized || mapPanning
      ? "chrome-hidden"
      : isDesktopLayout
        ? "safe-area"
        : "dock";

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

  const panelPeekHeightPx = isAskHudOwnedTool(activeTool)
    ? ASK_HUD_CAMERA_PADDING_PX
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
    hudBottomPaddingPx: isAskHudOwnedTool(activeTool)
      ? ASK_HUD_CAMERA_PADDING_PX
      : null,
    selectedPoiId: deferredTentacleSelectedPoiId,
    walkActive: thermometerTool.draft.walkingQuestionId !== null,
    viewportFrame: placementViewportFrame,
  });

  const dismissTransientUi = useCallback(() => {
    overlay.closeSheet();
    setSelectedAnnotationId(null);
    cancelGeometryEdit();
    setAwaitingPlacement(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only overlay.closeSheet invoked
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
    [
      awaitHiderAnswer,
      dismissTransientUi,
      resetToolDrafts,
      session,
      setActiveTool,
      setMapError,
    ],
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
    notificationPreferences,
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
    placementFocusMinZoom,
    placementFocusMaxZoom,
    placementFocusPreferFly,
    requestPlacementRecenter,
    mapChromeControlInset,
    placementCrosshair: tools.placementCrosshair,
    mapAttentionActive,
    handleMapClick,
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
    tentacleTool,
    chatMessages,
    hasUnreadChat,
    unreadCount,
    liveLocationError,
    isRemote,
    gameRulesEditable,
    draftAdvancedSettings: sessionActions.draftAdvancedSettings,
    setDraftAdvancedSettings: sessionActions.setDraftAdvancedSettings,
    updateNotificationPreferences,
    enableNotifications,
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
