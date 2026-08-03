import { AnnotationLayer } from "../../components/map/layers/AnnotationLayer";
import { ActiveThermometerWalkLayer } from "../../components/map/layers/ActiveThermometerWalkLayer";
import { HidingZonesLayer } from "../../components/map/layers/HidingZonesLayer";
import { LiveHiderLocationsLayer } from "../../components/map/layers/LiveHiderLocationsLayer";
import { LiveSeekerLocationsLayer } from "../../components/map/layers/LiveSeekerLocationsLayer";
import { PendingQuestionLayer } from "../../components/map/layers/PendingQuestionLayer";
import type { SessionRecord, GameArea, AnnotationRecord } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hiding/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/activity/sessionChat";
import type { SessionRulesInput } from "../../domain/session/rules";
import type { SpectatorLayerConfig } from "../../domain/session/players/observerPerspective";
import type { LayerVisibility } from "../../state/mapStore";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { DistanceUnit } from "../../domain/map/distance";
import type { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";
import { useAnnotationStore } from "../../state/annotationStore";
import { useMapStore } from "../../state/sessionStore";

type SpectatorMapLayersProps = {
  session: SessionRecord;
  gameArea: GameArea;
  layerVisibility: LayerVisibility;
  effectiveBasemapStyle: MapStyle;
  distanceUnit: DistanceUnit;
  spectatorLayers: SpectatorLayerConfig;
  annotations: AnnotationRecord[];
  hidingZones: HidingZoneRecord[];
  seekerLocations: readonly PlayerLocationRecord[];
  hiderLocations: readonly PlayerLocationRecord[];
  pendingQuestions: PendingQuestionRecord[];
  sessionRules: SessionRulesInput;
  uid: string | null;
  activeThermometerWalk: ReturnType<typeof useActiveThermometerWalk>;
};

export function SpectatorMapLayers({
  session,
  gameArea,
  layerVisibility,
  effectiveBasemapStyle,
  distanceUnit,
  spectatorLayers,
  annotations,
  hidingZones,
  seekerLocations,
  hiderLocations,
  pendingQuestions,
  sessionRules,
  uid,
  activeThermometerWalk,
}: SpectatorMapLayersProps) {
  const selectedAnnotationId = useAnnotationStore(
    (state) => state.selectedAnnotationId,
  );
  const streetBasemap = useMapStore((state) => state.streetBasemap);

  return (
    <>
      <AnnotationLayer
        annotations={annotations}
        gameArea={gameArea}
        selectedAnnotationId={selectedAnnotationId}
        layerVisibility={layerVisibility}
        session={session}
        hidingZones={hidingZones}
      />
      {spectatorLayers.showHidingZones ? (
        <HidingZonesLayer zones={hidingZones} session={session} />
      ) : null}
      {spectatorLayers.showSeekerLocations ? (
        <LiveSeekerLocationsLayer locations={seekerLocations} myUid={uid} />
      ) : null}
      {spectatorLayers.showHiderLocations ? (
        <LiveHiderLocationsLayer locations={hiderLocations} myUid={uid} />
      ) : null}
      <ActiveThermometerWalkLayer
        start={activeThermometerWalk.start}
        livePoint={activeThermometerWalk.livePoint}
        targetDistanceMeters={activeThermometerWalk.targetDistanceMeters}
        mapStyle={effectiveBasemapStyle}
        distanceUnit={distanceUnit}
      />
      <PendingQuestionLayer
        pendingQuestions={pendingQuestions}
        gameArea={gameArea}
        sessionRules={sessionRules}
        mapStyle={effectiveBasemapStyle}
        streetBasemap={streetBasemap}
      />
    </>
  );
}
