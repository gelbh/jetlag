import { Suspense } from "react";
import { AnnotationLayer } from "../../components/map/AnnotationLayer";
import { LiveSeekerLocationsLayer } from "../../components/map/LiveSeekerLocationsLayer";
import { GeometryEditLayer } from "../../components/map/GeometryEditLayer";
import { GameAreaMask } from "../../components/map/GameAreaMask";
import { MapView } from "../../components/map/MapView";
import { MapDraftLayer } from "../../components/map/MapDraftLayer";
import { AdminBoundariesLayer } from "../../components/map/AdminBoundariesLayer";
import { LiveUserLocationLayer } from "../../components/map/LiveUserLocationLayer";
import { MapViewportTracker } from "../../components/map/MapViewportTracker";
import { ActiveThermometerWalkLayer } from "../../components/map/ActiveThermometerWalkLayer";
import { PendingQuestionLayer } from "../../components/map/PendingQuestionLayer";
import { TransitLayer } from "./lazyImports";
import type { MapScreenController } from "./useMapScreenController";

type MapScreenMapLayersProps = Pick<
  MapScreenController,
  | "session"
  | "gameArea"
  | "toolGameArea"
  | "effectiveBasemapStyle"
  | "handleMapStyleChange"
  | "mapChromeControlInset"
  | "center"
  | "mapFocusBounds"
  | "effectiveMapFocusBounds"
  | "placementRecenterToken"
  | "placementFocusPaddingBias"
  | "handleMapClick"
  | "chromeHudRef"
  | "suppressChromeHideRef"
  | "mapShellRef"
  | "exportLegendRef"
  | "placementCrosshair"
  | "handleMapViewportChange"
  | "handleMapPanStart"
  | "handleMapPanEnd"
  | "transitEnabled"
  | "layerVisibility"
  | "transitStaticData"
  | "transitLiveData"
  | "mapViewport"
  | "annotations"
  | "selectedAnnotationId"
  | "draftEliminationFeatures"
  | "confirmedHidingZones"
  | "seekerLocations"
  | "uid"
  | "activeThermometerWalk"
  | "pendingQuestions"
  | "geometryEditAnnotation"
  | "geometryDraft"
  | "mapDraftOverlays"
  | "showAdminBoundaries"
  | "adminBoundaryLoading"
  | "adminBoundaryFeatures"
  | "showCurrentLocation"
  | "awaitingPlacement"
  | "lowPowerMode"
  | "distanceUnit"
  | "handleLiveLocationError"
>;

export function MapScreenMapLayers({
  session,
  gameArea,
  toolGameArea,
  effectiveBasemapStyle,
  handleMapStyleChange,
  mapChromeControlInset,
  center,
  mapFocusBounds: _mapFocusBounds,
  effectiveMapFocusBounds,
  placementRecenterToken,
  placementFocusPaddingBias,
  handleMapClick,
  chromeHudRef,
  suppressChromeHideRef,
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
  pendingQuestions,
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
}: MapScreenMapLayersProps) {
  return (
    <div ref={mapShellRef} className="absolute inset-0">
      <MapView
        key={session!.id}
        mapKey={session!.id}
        mapStyle={effectiveBasemapStyle}
        onMapStyleChange={handleMapStyleChange}
        zoomControlInset={mapChromeControlInset}
        mapStyleControlInset={mapChromeControlInset}
        center={center}
        zoom={12}
        focusBounds={effectiveMapFocusBounds}
        fitBoundsMode="once"
        recenterToken={placementRecenterToken}
        focusPaddingBias={placementFocusPaddingBias}
        onMapClick={handleMapClick}
        chromeHudRef={chromeHudRef}
        suppressChromeHideRef={suppressChromeHideRef}
        className={
          placementCrosshair ? "map-crosshair h-full w-full" : "h-full w-full"
        }
      >
        <MapViewportTracker
          onViewportChange={handleMapViewportChange}
          onUserPanStart={handleMapPanStart}
          onUserPanEnd={handleMapPanEnd}
          suppressPanRef={suppressChromeHideRef}
        />
        <GameAreaMask gameArea={gameArea!} />
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
        />
        {geometryEditAnnotation && geometryDraft ? (
          <GeometryEditLayer
            annotation={geometryEditAnnotation}
            draftGeometry={geometryDraft}
            gameArea={toolGameArea}
          />
        ) : null}
        <MapDraftLayer overlays={mapDraftOverlays} />
        {showAdminBoundaries && !adminBoundaryLoading ? (
          <AdminBoundariesLayer
            features={adminBoundaryFeatures}
            mapStyle={effectiveBasemapStyle}
          />
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
