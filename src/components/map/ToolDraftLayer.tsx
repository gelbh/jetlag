import { Circle, CircleMarker, Polygon, Polyline, Popup } from "react-leaflet";
import turfCircle from "@turf/circle";
import { point as turfPoint } from "@turf/helpers";
import type { Feature, MultiPolygon, Polygon as GeoPolygon } from "geojson";
import type { GameArea, TentaclePoi } from "../../domain/annotations";
import type { MapTool } from "../../state/sessionStore";
import {
  buildHalfPlanePolygon,
  gameAreaToPolygon,
  polygonFeatureToLeafletPolygonGroups,
  polygonFeatureToLeafletRings,
  safeDifference,
  type LatLngTuple,
} from "../../domain/geometry";
import {
  thermometerShadedSide,
  type ThermometerAnswer,
} from "../../domain/thermometerQuestions";

interface ToolDraftLayerProps {
  activeTool: MapTool;
  radarCenter: LatLngTuple | null;
  radarRadiusMeters: number;
  pinPoint: LatLngTuple | null;
  tentacleCenter: LatLngTuple | null;
  tentacleSearchRadiusMeters: number;
  tentacleAnswerRadiusMeters: number;
  tentacleDraftPois: TentaclePoi[];
  tentacleDraftSelectedPoiId: string | null;
  tentacleDraftOutOfReach: boolean;
  tentacleEliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
  thermoA: LatLngTuple | null;
  thermoB: LatLngTuple | null;
  thermoAnswer: ThermometerAnswer | null;
  gameArea: GameArea;
  measuringSeekerPoint: LatLngTuple | null;
  measuringTargetPoint: LatLngTuple | null;
  measuringPlacePoints: LatLngTuple[];
  measuringSiteRadiusMeters: number | null;
  measuringBoundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
  measuringEliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
  matchingSeekerPoint: LatLngTuple | null;
  matchingNearestFeaturePoint: LatLngTuple | null;
  matchingBoundaryPreview: Feature<GeoPolygon | MultiPolygon> | null;
  matchingEliminationPreview: Feature<GeoPolygon | MultiPolygon> | null;
  zoneVertices: LatLngTuple[];
}

export function ToolDraftLayer({
  activeTool,
  radarCenter,
  radarRadiusMeters,
  pinPoint,
  tentacleCenter,
  tentacleSearchRadiusMeters,
  tentacleAnswerRadiusMeters,
  tentacleDraftPois,
  tentacleDraftSelectedPoiId,
  tentacleDraftOutOfReach,
  tentacleEliminationPreview,
  thermoA,
  thermoB,
  thermoAnswer,
  gameArea,
  measuringSeekerPoint,
  measuringTargetPoint,
  measuringPlacePoints,
  measuringSiteRadiusMeters,
  measuringBoundaryPreview,
  measuringEliminationPreview,
  matchingSeekerPoint,
  matchingNearestFeaturePoint,
  matchingBoundaryPreview,
  matchingEliminationPreview,
  zoneVertices,
}: ToolDraftLayerProps) {
  return (
    <>
      {activeTool === "radar" && radarCenter ? (
        <>
          <Circle
            center={radarCenter}
            radius={radarRadiusMeters}
            pathOptions={{
              color: "#38bdf8",
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.08,
            }}
          />
          <CircleMarker
            center={radarCenter}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: "#38bdf8",
              fillOpacity: 1,
            }}
          />
        </>
      ) : null}

      {activeTool === "pin" && pinPoint ? (
        <CircleMarker
          center={pinPoint}
          radius={8}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 1,
          }}
        />
      ) : null}

      {activeTool === "tentacle" && tentacleCenter
        ? (() => {
            const hasPoiAnswer =
              !tentacleDraftOutOfReach && tentacleDraftSelectedPoiId !== null;
            const displayRadiusMeters = hasPoiAnswer
              ? tentacleAnswerRadiusMeters
              : tentacleSearchRadiusMeters;

            return (
              <>
                <Circle
                  center={tentacleCenter}
                  radius={displayRadiusMeters}
                  pathOptions={{
                    color: "#4ade80",
                    weight: 2,
                    dashArray: tentacleDraftOutOfReach ? undefined : "6 6",
                    fillOpacity:
                      tentacleDraftOutOfReach || tentacleDraftSelectedPoiId
                        ? 0.05
                        : 0.06,
                  }}
                />
                {hasPoiAnswer
                  ? (() => {
                      const radarCircle = turfCircle(
                        turfPoint([tentacleCenter[1], tentacleCenter[0]]),
                        tentacleAnswerRadiusMeters / 1000,
                        { steps: 64, units: "kilometers" },
                      );
                      const exterior = safeDifference(
                        gameAreaToPolygon(gameArea),
                        radarCircle as Feature<GeoPolygon>,
                      );
                      return exterior
                        ? polygonFeatureToLeafletPolygonGroups(exterior).map(
                            (rings, index) => (
                              <Polygon
                                key={`tentacle-draft-yes-radar-${index}`}
                                positions={rings}
                                pathOptions={{
                                  color: "#22c55e",
                                  weight: 1,
                                  fillColor: "#22c55e",
                                  fillOpacity: 0.35,
                                }}
                              />
                            ),
                          )
                        : null;
                    })()
                  : null}
                {tentacleEliminationPreview
                  ? polygonFeatureToLeafletPolygonGroups(
                      tentacleEliminationPreview,
                    ).map((rings, index) => (
                      <Polygon
                        key={`tentacle-draft-elimination-${index}`}
                        positions={rings}
                        pathOptions={{
                          color: "#ef4444",
                          weight: 1,
                          fillColor: "#ef4444",
                          fillOpacity: 0.35,
                        }}
                      />
                    ))
                  : null}
                <CircleMarker
                  center={tentacleCenter}
                  radius={8}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: "#22c55e",
                    fillOpacity: 1,
                  }}
                />
                {tentacleDraftOutOfReach
                  ? polygonFeatureToLeafletPolygonGroups(
                      turfCircle(
                        turfPoint([tentacleCenter[1], tentacleCenter[0]]),
                        tentacleSearchRadiusMeters / 1000,
                        { steps: 64, units: "kilometers" },
                      ) as Feature<GeoPolygon>,
                    ).map((rings, index) => (
                      <Polygon
                        key={`tentacle-draft-no-radar-${index}`}
                        positions={rings}
                        pathOptions={{
                          color: "#22c55e",
                          weight: 1,
                          fillColor: "#22c55e",
                          fillOpacity: 0.35,
                        }}
                      />
                    ))
                  : tentacleDraftPois.map((poi) => {
                      const selected = tentacleDraftSelectedPoiId === poi.id;
                      return (
                        <CircleMarker
                          key={`tentacle-draft-${poi.id}`}
                          center={[poi.lat, poi.lng]}
                          radius={selected ? 7 : 6}
                          pathOptions={{
                            color: selected ? "#fef08a" : "#ffffff",
                            weight: selected ? 3 : 2,
                            fillColor: "#22c55e",
                            fillOpacity: 1,
                          }}
                        >
                          <Popup>{poi.name}</Popup>
                        </CircleMarker>
                      );
                    })}
              </>
            );
          })()
        : null}

      {activeTool === "thermometer" ? (
        <>
          {thermoA && thermoB && thermoAnswer
            ? (() => {
                const shadedRegion = buildHalfPlanePolygon(
                  thermoA,
                  thermoB,
                  gameArea,
                  thermometerShadedSide(thermoAnswer),
                );
                return shadedRegion
                  ? polygonFeatureToLeafletPolygonGroups(shadedRegion).map(
                      (rings, index) => (
                        <Polygon
                          key={`thermo-preview-${index}`}
                          positions={rings}
                          pathOptions={{
                            color: "#ef4444",
                            weight: 1,
                            fillColor: "#ef4444",
                            fillOpacity: 0.25,
                          }}
                        />
                      ),
                    )
                  : null;
              })()
            : null}
          {thermoA ? (
            <CircleMarker
              center={thermoA}
              radius={8}
              pathOptions={{
                color: "#f87171",
                fillColor: "#f87171",
                fillOpacity: 1,
              }}
            />
          ) : null}
          {thermoB ? (
            <CircleMarker
              center={thermoB}
              radius={8}
              pathOptions={{
                color: "#fb923c",
                fillColor: "#fb923c",
                fillOpacity: 1,
              }}
            />
          ) : null}
          {thermoA && thermoB ? (
            <Polyline
              positions={[thermoA, thermoB]}
              pathOptions={{ color: "#f87171", weight: 3, dashArray: "6 6" }}
            />
          ) : null}
        </>
      ) : null}

      {activeTool === "measuring" ? (
        <>
          {measuringSiteRadiusMeters !== null
            ? measuringPlacePoints.map((place, index) => (
                <Circle
                  key={`measuring-site-radar-${index}`}
                  center={place}
                  radius={measuringSiteRadiusMeters}
                  pathOptions={{
                    color: "#38bdf8",
                    weight: 2,
                    dashArray: "6 6",
                    fillOpacity: 0.06,
                  }}
                />
              ))
            : null}
          {measuringEliminationPreview
            ? polygonFeatureToLeafletPolygonGroups(
                measuringEliminationPreview,
              ).map((rings, index) => (
                <Polygon
                  key={`measuring-elimination-${index}`}
                  positions={rings}
                  pathOptions={{
                    color: "#ef4444",
                    weight: 1,
                    fillColor: "#ef4444",
                    fillOpacity: 0.25,
                  }}
                />
              ))
            : null}
          {measuringBoundaryPreview
            ? polygonFeatureToLeafletRings(measuringBoundaryPreview).map(
                (ring, index) => (
                  <Polyline
                    key={`measuring-boundary-${index}`}
                    positions={ring}
                    pathOptions={{
                      color: "#38bdf8",
                      weight: 3,
                      dashArray: "6 6",
                    }}
                  />
                ),
              )
            : null}
          {measuringSeekerPoint ? (
            <CircleMarker
              center={measuringSeekerPoint}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#38bdf8",
                fillOpacity: 1,
              }}
            />
          ) : null}
          {measuringPlacePoints.length > 1 ? (
            measuringPlacePoints.map((place, index) => (
              <CircleMarker
                key={`measuring-place-${index}`}
                center={place}
                radius={6}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: "#0ea5e9",
                  fillOpacity: 1,
                }}
              />
            ))
          ) : measuringTargetPoint ? (
            <CircleMarker
              center={measuringTargetPoint}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#0ea5e9",
                fillOpacity: 1,
              }}
            />
          ) : null}
        </>
      ) : null}

      {activeTool === "matching" ? (
        <>
          {matchingEliminationPreview
            ? polygonFeatureToLeafletPolygonGroups(
                matchingEliminationPreview,
              ).map((rings, index) => (
                <Polygon
                  key={`matching-elimination-${index}`}
                  positions={rings}
                  pathOptions={{
                    color: "#ef4444",
                    weight: 1,
                    fillColor: "#ef4444",
                    fillOpacity: 0.25,
                  }}
                />
              ))
            : null}
          {matchingBoundaryPreview
            ? polygonFeatureToLeafletRings(matchingBoundaryPreview).map(
                (ring, index) => (
                  <Polyline
                    key={`matching-boundary-${index}`}
                    positions={ring}
                    pathOptions={{
                      color: "#38bdf8",
                      weight: 3,
                      dashArray: "6 6",
                    }}
                  />
                ),
              )
            : null}
          {matchingSeekerPoint ? (
            <CircleMarker
              center={matchingSeekerPoint}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#38bdf8",
                fillOpacity: 1,
              }}
            />
          ) : null}
          {matchingNearestFeaturePoint ? (
            <CircleMarker
              center={matchingNearestFeaturePoint}
              radius={8}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: "#0ea5e9",
                fillOpacity: 1,
              }}
            />
          ) : null}
        </>
      ) : null}

      {activeTool === "zone"
        ? zoneVertices.map((vertex, index) => (
            <CircleMarker
              key={`zone-vertex-${index}`}
              center={vertex}
              radius={6}
              pathOptions={{
                color: "#c084fc",
                fillColor: "#c084fc",
                fillOpacity: 1,
              }}
            />
          ))
        : null}
    </>
  );
}
