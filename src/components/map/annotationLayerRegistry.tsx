import { Fragment } from "react";
import { Circle, CircleMarker, Polyline, Popup } from "react-leaflet";
import { circle as turfCircle, point as turfPoint } from "@turf/turf";
import type {
  Feature,
  MultiPolygon,
  Point,
  Polygon as GeoPolygon,
} from "geojson";
import type { AnnotationRecord, GameArea } from "../../domain/annotations";
import { DEFAULT_RADIUS_METERS } from "../../domain/distance";
import {
  TENTACLE_ANSWER_RADIUS_METERS,
  TENTACLE_SEARCH_RADIUS_METERS,
} from "../../domain/tentacleQuestions";
import {
  buildHalfPlanePolygon,
  gameAreaCenter,
  polygonFeatureToLeafletRings,
  safeDifference,
  type LatLngTuple,
} from "../../domain/geometry";
import { measuringTargetLabel } from "../../domain/measuringQuestions";
import { matchingQuestionLabel } from "../../domain/matchingQuestions";
import { thermometerShadedSide } from "../../domain/thermometerQuestions";
import type { LayerVisibility } from "../../state/sessionStore";
import { renderMaskPolygon } from "./annotationLayerMask";

interface RenderAnnotationLayerItemParams {
  annotation: AnnotationRecord;
  gameArea: GameArea;
  gamePolygon: Feature<GeoPolygon | MultiPolygon>;
  layerVisibility?: LayerVisibility;
  pulsingAnnotationIds: string[];
  selectedAnnotationId: string | null;
  selectionEnabled: boolean;
  selectAnnotation: () => void;
}

export function renderAnnotationLayerItem({
  annotation,
  gameArea,
  gamePolygon,
  layerVisibility,
  pulsingAnnotationIds,
  selectedAnnotationId,
  selectionEnabled,
  selectAnnotation,
}: RenderAnnotationLayerItemParams) {
  if (layerVisibility && !layerVisibility[annotation.type]) {
    return null;
  }

  const color = annotation.metadata.color ?? "#f97316";
  const pulsing = pulsingAnnotationIds.includes(annotation.id);
  const selected = annotation.id === selectedAnnotationId;

  if (annotation.type === "radar") {
    const center = annotation.geometry.geometry as Point;
    const radius = annotation.metadata.radiusMeters ?? DEFAULT_RADIUS_METERS;
    const centerTuple: LatLngTuple = [
      center.coordinates[1],
      center.coordinates[0],
    ];
    const radarCircle = turfCircle(
      turfPoint(center.coordinates),
      radius / 1000,
      { steps: 64, units: "kilometers" },
    );

    const shaded =
      annotation.metadata.inside === false
        ? safeDifference(gamePolygon, radarCircle)
        : radarCircle;

    return (
      <Fragment key={annotation.id}>
        <Circle
          center={centerTuple}
          radius={radius}
          interactive={selectionEnabled}
          pathOptions={{
            color,
            weight: selected ? 4 : 2,
            fillOpacity: 0.05,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        />
        {shaded
          ? renderMaskPolygon(
              shaded,
              `${annotation.id}-mask`,
              color,
              pulsing,
              selected,
              selectionEnabled,
              selectAnnotation,
            )
          : null}
      </Fragment>
    );
  }

  if (
    annotation.type === "zone" &&
    annotation.geometry.geometry.type === "Polygon"
  ) {
    const zonePolygon = annotation.geometry as Feature<GeoPolygon>;
    return renderMaskPolygon(
      zonePolygon,
      annotation.id,
      color,
      pulsing,
      selected,
      selectionEnabled,
      selectAnnotation,
    );
  }

  if (
    annotation.type === "measuring" &&
    (annotation.geometry.geometry.type === "Polygon" ||
      annotation.geometry.geometry.type === "MultiPolygon")
  ) {
    const seekerPoint: LatLngTuple = annotation.metadata.measuringAnchor
      ? [
          annotation.metadata.measuringAnchor.lat,
          annotation.metadata.measuringAnchor.lng,
        ]
      : gameAreaCenter(gameArea);
    const targetPoint: LatLngTuple = annotation.metadata.measuringCoastPoint
      ? [
          annotation.metadata.measuringCoastPoint.lat,
          annotation.metadata.measuringCoastPoint.lng,
        ]
      : seekerPoint;
    const targetLabel =
      annotation.metadata.measuringTargetName ??
      (annotation.metadata.measuringSubject
        ? measuringTargetLabel(
            annotation.metadata.measuringSubject,
            annotation.metadata.measuringLocationCategory,
          )
        : "Measure target");
    const boundaryFeature = annotation.metadata.measuringBoundaryJson
      ? (JSON.parse(annotation.metadata.measuringBoundaryJson) as Feature<
          GeoPolygon | MultiPolygon
        >)
      : null;
    const siteRadiusMeters = annotation.metadata.measuringDistanceMeters;
    let multiPlaces: { lat: number; lng: number; name: string }[] = [];
    if (annotation.metadata.measuringPlacesJson) {
      try {
        multiPlaces = JSON.parse(annotation.metadata.measuringPlacesJson) as {
          lat: number;
          lng: number;
          name: string;
        }[];
      } catch {
        multiPlaces = [];
      }
    }

    return (
      <Fragment key={annotation.id}>
        {siteRadiusMeters !== undefined
          ? multiPlaces.map((place, index) => (
              <Circle
                key={`${annotation.id}-measuring-site-${index}`}
                center={[place.lat, place.lng]}
                radius={siteRadiusMeters}
                interactive={selectionEnabled}
                pathOptions={{
                  color,
                  weight: selected ? 3 : 2,
                  dashArray: "6 6",
                  fillOpacity: 0.05,
                }}
                eventHandlers={
                  selectionEnabled
                    ? {
                        click: (event) => {
                          event.originalEvent?.stopPropagation();
                          selectAnnotation();
                        },
                      }
                    : undefined
                }
              />
            ))
          : null}
        {renderMaskPolygon(
          annotation.geometry as Feature<GeoPolygon | MultiPolygon>,
          `${annotation.id}-elimination`,
          color,
          pulsing,
          selected,
          selectionEnabled,
          selectAnnotation,
        )}
        {boundaryFeature
          ? polygonFeatureToLeafletRings(boundaryFeature).map((ring, index) => (
              <Polyline
                key={`${annotation.id}-boundary-${index}`}
                positions={ring}
                pathOptions={{
                  color,
                  weight: selected ? 4 : 3,
                  dashArray: "6 6",
                }}
              />
            ))
          : null}
        <CircleMarker
          center={seekerPoint}
          radius={7}
          interactive={selectionEnabled}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        >
          <Popup>
            {annotation.metadata.measuringSubject === "sea_level" &&
            annotation.metadata.measuringAnchorAltitudeMeters !== undefined
              ? `You · ${Math.round(annotation.metadata.measuringAnchorAltitudeMeters)} m`
              : "You"}
          </Popup>
        </CircleMarker>
        {annotation.metadata.measuringSubject !== "sea_level" ? (
          multiPlaces.length > 1 ? (
            multiPlaces.map((place, index) => (
              <CircleMarker
                key={`${annotation.id}-measuring-place-${index}`}
                center={[place.lat, place.lng]}
                radius={6}
                interactive={selectionEnabled}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: color,
                  fillOpacity: 1,
                }}
                eventHandlers={
                  selectionEnabled
                    ? {
                        click: (event) => {
                          event.originalEvent?.stopPropagation();
                          selectAnnotation();
                        },
                      }
                    : undefined
                }
              >
                <Popup>{place.name}</Popup>
              </CircleMarker>
            ))
          ) : (
            <CircleMarker
              center={targetPoint}
              radius={7}
              interactive={selectionEnabled}
              pathOptions={{
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
              }}
              eventHandlers={
                selectionEnabled
                  ? {
                      click: (event) => {
                        event.originalEvent?.stopPropagation();
                        selectAnnotation();
                      },
                    }
                  : undefined
              }
            >
              <Popup>{targetLabel}</Popup>
            </CircleMarker>
          )
        ) : null}
      </Fragment>
    );
  }

  if (
    annotation.type === "matching" &&
    (annotation.geometry.geometry.type === "Polygon" ||
      annotation.geometry.geometry.type === "MultiPolygon")
  ) {
    const seekerPoint: LatLngTuple = annotation.metadata.matchingAnchor
      ? [
          annotation.metadata.matchingAnchor.lat,
          annotation.metadata.matchingAnchor.lng,
        ]
      : gameAreaCenter(gameArea);
    const nearestPoint: LatLngTuple = annotation.metadata
      .matchingNearestFeaturePoint
      ? [
          annotation.metadata.matchingNearestFeaturePoint.lat,
          annotation.metadata.matchingNearestFeaturePoint.lng,
        ]
      : seekerPoint;
    const nearestLabel =
      annotation.metadata.matchingNearestFeatureName ??
      matchingQuestionLabel(
        annotation.metadata.matchingCategory ?? "commercial_airport",
      );
    const boundaryFeature = annotation.metadata.matchingBoundaryJson
      ? (JSON.parse(annotation.metadata.matchingBoundaryJson) as Feature<
          GeoPolygon | MultiPolygon
        >)
      : null;

    return (
      <Fragment key={annotation.id}>
        {renderMaskPolygon(
          annotation.geometry as Feature<GeoPolygon | MultiPolygon>,
          `${annotation.id}-elimination`,
          color,
          pulsing,
          selected,
          selectionEnabled,
          selectAnnotation,
        )}
        {boundaryFeature
          ? polygonFeatureToLeafletRings(boundaryFeature).map((ring, index) => (
              <Polyline
                key={`${annotation.id}-boundary-${index}`}
                positions={ring}
                pathOptions={{
                  color,
                  weight: selected ? 4 : 3,
                  dashArray: "6 6",
                }}
              />
            ))
          : null}
        <CircleMarker
          center={seekerPoint}
          radius={7}
          interactive={selectionEnabled}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        >
          <Popup>You</Popup>
        </CircleMarker>
        {annotation.metadata.matchingNullAnswer ? null : (
          <CircleMarker
            center={nearestPoint}
            radius={7}
            interactive={selectionEnabled}
            pathOptions={{
              color: "#ffffff",
              weight: 2,
              fillColor: color,
              fillOpacity: 1,
            }}
            eventHandlers={
              selectionEnabled
                ? {
                    click: (event) => {
                      event.originalEvent?.stopPropagation();
                      selectAnnotation();
                    },
                  }
                : undefined
            }
          >
            <Popup>{nearestLabel}</Popup>
          </CircleMarker>
        )}
      </Fragment>
    );
  }

  if (
    annotation.type === "matching" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const seekerPoint: LatLngTuple = [
      annotation.geometry.geometry.coordinates[1],
      annotation.geometry.geometry.coordinates[0],
    ];

    return (
      <CircleMarker
        key={annotation.id}
        center={seekerPoint}
        radius={7}
        interactive={selectionEnabled}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }}
        eventHandlers={
          selectionEnabled
            ? {
                click: (event) => {
                  event.originalEvent?.stopPropagation();
                  selectAnnotation();
                },
              }
            : undefined
        }
      >
        <Popup>Null match answer</Popup>
      </CircleMarker>
    );
  }

  if (
    annotation.type === "thermometer" &&
    annotation.geometry.geometry.type === "LineString"
  ) {
    const coordinates = annotation.geometry.geometry.coordinates;
    const thermoA: LatLngTuple = [coordinates[0][1], coordinates[0][0]];
    const thermoB: LatLngTuple = [
      coordinates[coordinates.length - 1][1],
      coordinates[coordinates.length - 1][0],
    ];
    const shadedRegion = buildHalfPlanePolygon(
      thermoA,
      thermoB,
      gameArea,
      thermometerShadedSide(annotation.metadata.thermometerAnswer),
    );

    return (
      <Fragment key={annotation.id}>
        <Polyline
          positions={[thermoA, thermoB]}
          interactive={selectionEnabled}
          pathOptions={{ color, weight: selected ? 6 : 4 }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        />
        <CircleMarker
          center={thermoA}
          radius={7}
          interactive={selectionEnabled}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        >
          <Popup>Start</Popup>
        </CircleMarker>
        <CircleMarker
          center={thermoB}
          radius={7}
          interactive={selectionEnabled}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: color,
            fillOpacity: 1,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        >
          <Popup>
            {annotation.metadata.thermometerAnswer === "hotter"
              ? "End (hotter)"
              : "End"}
          </Popup>
        </CircleMarker>
        {shadedRegion
          ? renderMaskPolygon(
              shadedRegion,
              `${annotation.id}-mask`,
              color,
              pulsing,
              selected,
              selectionEnabled,
              selectAnnotation,
            )
          : null}
      </Fragment>
    );
  }

  if (
    annotation.type === "pin" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    return (
      <CircleMarker
        key={annotation.id}
        center={[lat, lng]}
        radius={8}
        interactive={selectionEnabled}
        pathOptions={{
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        }}
        eventHandlers={
          selectionEnabled
            ? {
                click: (event) => {
                  event.originalEvent?.stopPropagation();
                  selectAnnotation();
                },
              }
            : undefined
        }
      >
        <Popup>{annotation.metadata.label ?? "Note"}</Popup>
      </CircleMarker>
    );
  }

  if (
    annotation.type === "tentacle" &&
    annotation.geometry.geometry.type === "Point"
  ) {
    const [lng, lat] = annotation.geometry.geometry.coordinates;
    const searchRadius =
      annotation.metadata.radiusMeters ?? TENTACLE_SEARCH_RADIUS_METERS;
    const answerRadius =
      annotation.metadata.tentacleAnswerRadiusMeters ??
      TENTACLE_ANSWER_RADIUS_METERS;
    const centerTuple: LatLngTuple = [lat, lng];

    if (annotation.metadata.tentacleOutOfReach) {
      const noRadarDisk = turfCircle(
        turfPoint([lng, lat]),
        searchRadius / 1000,
        {
          steps: 64,
          units: "kilometers",
        },
      );

      return (
        <Fragment key={annotation.id}>
          <Circle
            center={centerTuple}
            radius={searchRadius}
            interactive={selectionEnabled}
            pathOptions={{
              color,
              weight: selected ? 4 : 2,
              fillOpacity: 0.05,
            }}
            eventHandlers={
              selectionEnabled
                ? {
                    click: (event) => {
                      event.originalEvent?.stopPropagation();
                      selectAnnotation();
                    },
                  }
                : undefined
            }
          />
          {renderMaskPolygon(
            noRadarDisk as Feature<GeoPolygon>,
            `${annotation.id}-tentacle-no-radar`,
            color,
            pulsing,
            selected,
            selectionEnabled,
            selectAnnotation,
          )}
        </Fragment>
      );
    }

    const pois = annotation.metadata.pois ?? [];
    let eliminationMask: Feature<GeoPolygon | MultiPolygon> | null = null;
    if (annotation.metadata.tentacleEliminationJson) {
      try {
        eliminationMask = JSON.parse(
          annotation.metadata.tentacleEliminationJson,
        ) as Feature<GeoPolygon | MultiPolygon>;
      } catch {
        eliminationMask = null;
      }
    }

    const radarCircle = turfCircle(turfPoint([lng, lat]), answerRadius / 1000, {
      steps: 64,
      units: "kilometers",
    });
    const yesRadarOutside = safeDifference(
      gamePolygon,
      radarCircle as Feature<GeoPolygon>,
    );

    return (
      <Fragment key={annotation.id}>
        <Circle
          center={[lat, lng]}
          radius={answerRadius}
          interactive={selectionEnabled}
          pathOptions={{
            color,
            weight: selected ? 4 : 2,
            fillOpacity: 0.05,
          }}
          eventHandlers={
            selectionEnabled
              ? {
                  click: (event) => {
                    event.originalEvent?.stopPropagation();
                    selectAnnotation();
                  },
                }
              : undefined
          }
        />
        {yesRadarOutside
          ? renderMaskPolygon(
              yesRadarOutside,
              `${annotation.id}-tentacle-yes-radar`,
              color,
              pulsing,
              selected,
              selectionEnabled,
              selectAnnotation,
            )
          : null}
        {eliminationMask
          ? renderMaskPolygon(
              eliminationMask,
              `${annotation.id}-tentacle-elimination`,
              "#ef4444",
              pulsing,
              selected,
              selectionEnabled,
              selectAnnotation,
            )
          : null}
        {pois.map((poi) => {
          const highlighted = annotation.metadata.highlightedPoiId === poi.id;
          const hasAnswer =
            annotation.metadata.tentacleOutOfReach ||
            annotation.metadata.highlightedPoiId !== undefined;
          const opacity = highlighted ? 1 : hasAnswer ? 0.45 : 1;

          return (
            <CircleMarker
              key={`${annotation.id}-${poi.id}`}
              center={[poi.lat, poi.lng]}
              radius={highlighted ? 7 : 6}
              opacity={opacity}
              pathOptions={{
                color: highlighted ? "#fef08a" : "#ffffff",
                weight: highlighted ? 3 : 2,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Popup>
                {poi.name}
                {highlighted ? " (answer)" : ""}
              </Popup>
            </CircleMarker>
          );
        })}
      </Fragment>
    );
  }

  return null;
}
