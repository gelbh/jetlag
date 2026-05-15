import { Fragment } from 'react'
import { Circle, Marker, Polygon, Polyline, Popup } from 'react-leaflet'
import { circle as turfCircle, point as turfPoint } from '@turf/turf'
import type { Feature, Point, Polygon as GeoPolygon } from 'geojson'
import type { AnnotationRecord, GameArea } from '../../domain/annotations'
import { isActive } from '../../domain/annotations'
import {
  buildHalfPlanePolygon,
  gameAreaToPolygon,
  polygonToLeafletLatLngs,
  safeDifference,
  type LatLngTuple,
} from '../../domain/geometry'
import { useAnnotationStore } from '../../state/sessionStore'

interface AnnotationLayerProps {
  annotations: AnnotationRecord[]
  gameArea: GameArea
  hidden?: boolean
}

function renderMaskPolygon(
  polygon: Feature<GeoPolygon>,
  key: string,
  color: string,
  pulsing: boolean,
) {
  const rings = polygonToLeafletLatLngs(polygon)
  if (rings.length === 0) {
    return null
  }

  return (
    <Polygon
      key={key}
      positions={rings}
      pathOptions={{
        color,
        weight: 1,
        fillColor: color,
        fillOpacity: 0.35,
        className: pulsing ? 'annotation-pulse' : undefined,
      }}
    />
  )
}

export function AnnotationLayer({ annotations, gameArea, hidden }: AnnotationLayerProps) {
  const pulsingAnnotationIds = useAnnotationStore((state) => state.pulsingAnnotationIds)
  const setSelectedAnnotationId = useAnnotationStore((state) => state.setSelectedAnnotationId)

  if (hidden) {
    return null
  }

  const gamePolygon = gameAreaToPolygon(gameArea)

  return (
    <>
      {annotations.filter(isActive).map((annotation) => {
        const color = annotation.metadata.color ?? '#f97316'
        const pulsing = pulsingAnnotationIds.includes(annotation.id)

        if (annotation.type === 'radar') {
          const center = annotation.geometry.geometry as Point
          const radius = annotation.metadata.radiusMeters ?? 1000
          const centerTuple: LatLngTuple = [center.coordinates[1], center.coordinates[0]]
          const radarCircle = turfCircle(
            turfPoint(center.coordinates),
            radius / 1000,
            { steps: 64, units: 'kilometers' },
          )

          const shaded =
            annotation.metadata.inside === false
              ? safeDifference(gamePolygon, radarCircle)
              : radarCircle

          return (
            <Fragment key={annotation.id}>
              <Circle
                center={centerTuple}
                radius={radius}
                pathOptions={{
                  color,
                  weight: 2,
                  fillOpacity: 0.05,
                }}
                eventHandlers={{
                  click: () => setSelectedAnnotationId(annotation.id),
                }}
              />
              {shaded ? renderMaskPolygon(shaded, `${annotation.id}-mask`, color, pulsing) : null}
            </Fragment>
          )
        }

        if (annotation.type === 'zone' && annotation.geometry.geometry.type === 'Polygon') {
          const zonePolygon = annotation.geometry as Feature<GeoPolygon>
          return renderMaskPolygon(zonePolygon, annotation.id, color, pulsing)
        }

        if (annotation.type === 'thermometer' && annotation.geometry.geometry.type === 'LineString') {
          const coordinates = annotation.geometry.geometry.coordinates
          const pointA: LatLngTuple = [coordinates[0][1], coordinates[0][0]]
          const pointB: LatLngTuple = [
            coordinates[coordinates.length - 1][1],
            coordinates[coordinates.length - 1][0],
          ]
          const colderSide = buildHalfPlanePolygon(pointA, pointB, gameArea)

          return (
            <Fragment key={annotation.id}>
              <Polyline
                positions={[pointA, pointB]}
                pathOptions={{ color, weight: 4 }}
              />
              <Marker position={pointA}>
                <Popup>Start</Popup>
              </Marker>
              <Marker position={pointB}>
                <Popup>End (hotter)</Popup>
              </Marker>
              {colderSide
                ? renderMaskPolygon(colderSide, `${annotation.id}-mask`, color, pulsing)
                : null}
            </Fragment>
          )
        }

        if (annotation.type === 'pin' && annotation.geometry.geometry.type === 'Point') {
          const [lng, lat] = annotation.geometry.geometry.coordinates
          return (
            <Marker
              key={annotation.id}
              position={[lat, lng]}
              eventHandlers={{
                click: () => setSelectedAnnotationId(annotation.id),
              }}
            >
              <Popup>{annotation.metadata.label ?? 'Note'}</Popup>
            </Marker>
          )
        }

        if (annotation.type === 'tentacle' && annotation.geometry.geometry.type === 'Point') {
          const [lng, lat] = annotation.geometry.geometry.coordinates
          const radius = annotation.metadata.radiusMeters ?? 1000
          const pois = annotation.metadata.pois ?? []

          return (
            <Fragment key={annotation.id}>
              <Circle
                center={[lat, lng]}
                radius={radius}
                pathOptions={{ color, weight: 2, fillOpacity: 0.06 }}
              />
              {pois.map((poi) => (
                <Marker
                  key={`${annotation.id}-${poi.id}`}
                  position={[poi.lat, poi.lng]}
                  opacity={
                    annotation.metadata.highlightedPoiId &&
                    annotation.metadata.highlightedPoiId !== poi.id
                      ? 0.45
                      : 1
                  }
                >
                  <Popup>
                    {poi.name}
                    {annotation.metadata.highlightedPoiId === poi.id ? ' (answer)' : ''}
                  </Popup>
                </Marker>
              ))}
            </Fragment>
          )
        }

        return null
      })}
    </>
  )
}
