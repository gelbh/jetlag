import { AnnotationLayer } from "../../components/map/AnnotationLayer";
import { ActiveThermometerWalkLayer } from "../../components/map/ActiveThermometerWalkLayer";
import { HidingZonesLayer } from "../../components/map/HidingZonesLayer";
import { LiveHiderLocationsLayer } from "../../components/map/LiveHiderLocationsLayer";
import { LiveSeekerLocationsLayer } from "../../components/map/LiveSeekerLocationsLayer";
import { PendingQuestionLayer } from "../../components/map/PendingQuestionLayer";
import type { SessionRecord, GameArea, AnnotationRecord } from "../../domain/map/annotations";
import type { HidingZoneRecord } from "../../domain/session/hidingZone";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "../../domain/session/sessionChat";
import type { SessionRulesInput } from "../../domain/session/sessionRules";
import type { SpectatorLayerConfig } from "../../domain/session/observerPerspective";
import type { LayerVisibility } from "../../state/mapStore";
import type { MapStyle } from "../../domain/map/mapBasemaps";
import type { DistanceUnit } from "../../domain/map/distance";
import type { useActiveThermometerWalk } from "../../hooks/location/useActiveThermometerWalk";

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
  return (
    <>
      <AnnotationLayer
        annotations={annotations}
        gameArea={gameArea}
        layerVisibility={layerVisibility}
        session={session}
        hidingZones={hidingZones}
      />
      {spectatorLayers.showHidingZones ? (
        <HidingZonesLayer zones={hidingZones} />
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
      />
    </>
  );
}
