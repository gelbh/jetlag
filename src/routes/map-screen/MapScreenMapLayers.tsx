import { Suspense } from "react";
import { AnnotationLayer } from "../../components/map/layers/AnnotationLayer";
import { LiveSeekerLocationsLayer } from "../../components/map/layers/LiveSeekerLocationsLayer";
import { GeometryEditLayer } from "../../components/map/layers/GeometryEditLayer";
import { GameAreaMask } from "../../components/map/layers/GameAreaMask";
import { MapView } from "../../components/map/chrome/MapView";
import { MapDraftLayer } from "../../components/map/layers/MapDraftLayer";
import { LiveUserLocationLayer } from "../../components/map/layers/LiveUserLocationLayer";
import { MapViewportTracker } from "../../components/map/chrome/MapViewportTracker";
import { ActiveThermometerWalkLayer } from "../../components/map/layers/ActiveThermometerWalkLayer";
import { PendingQuestionLayer } from "../../components/map/layers/PendingQuestionLayer";
import { MapDrawStrokeCapture } from "../../components/map/helpers/MapDrawStrokeCapture";
import { isAskHudOwnedTool } from "../../domain/ask/askHudModes";
import { AdminBoundariesLayer, TransitLayer } from "./lazyImports";
import type { MapScreenController } from "./useMapScreenController";

export type MapScreenMapLayersProps = {
  controller: MapScreenController;
};

export function MapScreenMapLayers({ controller }: MapScreenMapLayersProps) {
  const {
    session,
    gameArea,
    toolGameArea,
    effectiveBasemapStyle,
    streetBasemap,
    handleMapStyleChange,
    mapChromeControlInset,
    center,
    effectiveMapFocusBounds,
    placementRecenterToken,
    placementFocusPaddingBias,
    placementFocusPaddingTopBias,
    placementFocusMinZoom,
    placementFocusMaxZoom,
    placementFocusPreferFly,
    requestPlacementRecenter,
    handleMapClick,
    handleDraftMarkerActivate,
    chromeHudRef,
    mapShellRef,
    exportLegendRef,
    placementCrosshair,
    handleMapViewportChange,
    handleMapPanStart,
    handleMapPanEnd,
    transitEnabled,
    layerVisibility,
    transitStaticData,
    transitLiveData,
    mapViewport,
    annotations,
    selectedAnnotationId,
    draftEliminationFeatures,
    confirmedHidingZones,
    seekerLocations,
    uid,
    activeThermometerWalk,
    mapPendingQuestions: pendingQuestions,
    geometryEditAnnotation,
    geometryDraft,
    mapDraftOverlays,
    showAdminBoundaries,
    adminBoundaryLoading,
    adminBoundaryFeatures,
    showCurrentLocation,
    awaitingPlacement,
    lowPowerMode,
    distanceUnit,
    handleLiveLocationError,
    activeTool,
    drawTool,
  } = controller;

  const hideMapControls =
    activeTool !== "none" && isAskHudOwnedTool(activeTool);

  return (
    <div ref={mapShellRef} className="absolute inset-0">
      <MapView
        key={session!.id}
        mapKey={session!.id}
        mapStyle={effectiveBasemapStyle}
        streetBasemap={streetBasemap}
        onMapStyleChange={hideMapControls ? undefined : handleMapStyleChange}
        showMapStyleToggle={!hideMapControls}
        showZoomControl={!hideMapControls}
        zoomControlInset={mapChromeControlInset}
        mapStyleControlInset={mapChromeControlInset}
        center={center}
        zoom={12}
        focusBounds={effectiveMapFocusBounds}
        focusMinZoom={placementFocusMinZoom}
        focusMaxZoom={placementFocusMaxZoom}
        fitBoundsMode="once"
        recenterToken={placementRecenterToken}
        focusPaddingBias={placementFocusPaddingBias}
        focusPaddingTopBias={placementFocusPaddingTopBias}
        focusPreferFly={placementFocusPreferFly}
        showCompassControl={!hideMapControls}
        onRecenter={requestPlacementRecenter}
        onMapClick={handleMapClick}
        chromeHudRef={chromeHudRef}
        className={
          placementCrosshair ? "map-crosshair h-full w-full" : "h-full w-full"
        }
      >
        <MapViewportTracker
          onViewportChange={handleMapViewportChange}
          onUserPanStart={handleMapPanStart}
          onUserPanEnd={handleMapPanEnd}
        />
        <GameAreaMask gameArea={gameArea!} />
        {activeTool === "draw" ? (
          <MapDrawStrokeCapture
            enabled
            onBegin={(lat, lng) => drawTool.beginStroke([lat, lng])}
            onExtend={(lat, lng) => drawTool.extendStroke([lat, lng])}
            onEnd={drawTool.endStroke}
          />
        ) : null}
        {transitEnabled && layerVisibility.transit ? (
          <Suspense fallback={null}>
            <TransitLayer
              staticData={transitStaticData}
              liveData={transitLiveData}
              viewport={mapViewport?.bounds ?? null}
              zoom={mapViewport?.zoom ?? null}
            />
          </Suspense>
        ) : null}
        <AnnotationLayer
          annotations={annotations}
          gameArea={gameArea!}
          selectedAnnotationId={selectedAnnotationId}
          layerVisibility={layerVisibility}
          draftEliminationFeatures={draftEliminationFeatures}
          session={session!}
          hidingZones={confirmedHidingZones}
        />
        <LiveSeekerLocationsLayer locations={seekerLocations} myUid={uid} />
        <ActiveThermometerWalkLayer
          start={activeThermometerWalk.start}
          livePoint={activeThermometerWalk.livePoint}
          targetDistanceMeters={activeThermometerWalk.targetDistanceMeters}
          mapStyle={effectiveBasemapStyle}
          distanceUnit={distanceUnit}
        />
        <PendingQuestionLayer
          pendingQuestions={pendingQuestions}
          gameArea={gameArea!}
          sessionRules={session!}
          mapStyle={effectiveBasemapStyle}
          streetBasemap={streetBasemap}
        />
        {geometryEditAnnotation && geometryDraft ? (
          <GeometryEditLayer
            annotation={geometryEditAnnotation}
            draftGeometry={geometryDraft}
            gameArea={toolGameArea}
          />
        ) : null}
        <MapDraftLayer
          overlays={mapDraftOverlays}
          onMarkerActivate={handleDraftMarkerActivate}
        />
        {showAdminBoundaries && !adminBoundaryLoading ? (
          <Suspense fallback={null}>
            <AdminBoundariesLayer
              features={adminBoundaryFeatures}
              mapStyle={effectiveBasemapStyle}
              streetBasemap={streetBasemap}
            />
          </Suspense>
        ) : null}
        <LiveUserLocationLayer
          enabled={showCurrentLocation}
          highAccuracy={awaitingPlacement}
          lowPowerMode={lowPowerMode}
          onError={handleLiveLocationError}
        />
      </MapView>
      <div
        ref={exportLegendRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-surface-deep/90 px-4 py-3 text-xs text-ink-secondary"
      >
        <p className="font-semibold">Session {session!.code}</p>
        <p className="mt-1">
          Legend: radar, thermometer, zone, pin, tentacle overlays
        </p>
      </div>
    </div>
  );
}
