import { AdminMonitorPlayerFocus } from "../../components/admin/AdminMonitorPlayerFocus";
import { MapView } from "../../components/map/chrome/MapView";
import { MapViewportTracker } from "../../components/map/chrome/MapViewportTracker";
import { GameAreaMask } from "../../components/map/layers/GameAreaMask";
import { fallbackGameArea } from "../../domain/geometry/core/gameAreaConvert";
import type { ObserverMapScreenController } from "../observer-map-screen/useObserverMapScreen";
import { SpectatorMapLayers } from "../spectator-map/SpectatorMapLayers";

interface AdminMonitorMapLayersProps {
  controller: ObserverMapScreenController;
  showPlayerFocus?: boolean;
}

export function AdminMonitorMapLayers({
  controller,
  showPlayerFocus = true,
}: AdminMonitorMapLayersProps) {
  const gameArea = fallbackGameArea(controller.gameArea);
  const sessionRules = controller.sessionRules ?? controller.session;

  if (!controller.session) {
    return null;
  }

  return (
    <MapView
      key={controller.session.id}
      model={{
        mapKey: controller.session.id,
        mapStyle: controller.effectiveBasemapStyle,
        onMapStyleChange: controller.handleMapStyleChange,
        center: controller.center,
        zoom: 12,
        focusBounds: controller.mapFocusBounds,
        fitBoundsMode: "once",
        showZoomControl: false,
        className: "h-full w-full",
      }}
    >
      <MapViewportTracker onViewportChange={controller.setMapViewport} />
      {showPlayerFocus ? <AdminMonitorPlayerFocus /> : null}
      <GameAreaMask gameArea={gameArea} />
      <SpectatorMapLayers
        session={controller.session}
        gameArea={gameArea}
        layerVisibility={controller.layerVisibility}
        effectiveBasemapStyle={controller.effectiveBasemapStyle}
        distanceUnit={controller.distanceUnit}
        spectatorLayers={controller.spectatorLayers}
        annotations={controller.annotations}
        hidingZones={controller.hidingZones}
        seekerLocations={controller.seekerLocations}
        hiderLocations={controller.hiderLocations}
        pendingQuestions={controller.pendingQuestions}
        sessionRules={sessionRules}
        uid={controller.uid}
        activeThermometerWalk={controller.activeThermometerWalk}
      />
    </MapView>
  );
}
