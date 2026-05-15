import type { LatLngBounds } from 'leaflet'
import type { Feature, Polygon, Position } from 'geojson'
import { bboxPolygon, difference, polygon as turfPolygon } from '@turf/turf'
import type { GameArea } from './annotations'

export type LatLngTuple = [number, number]

export function boundsToGameArea(bounds: LatLngBounds): GameArea {
  const southWest = bounds.getSouthWest()
  const northEast = bounds.getNorthEast()

  return {
    type: 'Polygon',
    coordinates: [
      [
        [southWest.lng, southWest.lat],
        [northEast.lng, southWest.lat],
        [northEast.lng, northEast.lat],
        [southWest.lng, northEast.lat],
        [southWest.lng, southWest.lat],
      ],
    ],
  }
}

export function gameAreaToPolygon(gameArea: GameArea): Feature<Polygon> {
  return turfPolygon(gameArea.coordinates)
}

export function gameAreaToLeafletLatLngs(gameArea: GameArea): LatLngTuple[] {
  return gameArea.coordinates[0].map(([lng, lat]) => [lat, lng] as LatLngTuple)
}

export function safeDifference(
  outer: Feature<Polygon>,
  inner: Feature<Polygon>,
): Feature<Polygon> | null {
  try {
    const result = difference({ type: 'FeatureCollection', features: [outer, inner] })
    if (!result || result.geometry.type !== 'Polygon') {
      return null
    }

    return result as Feature<Polygon>
  } catch {
    return null
  }
}

export function polygonToLeafletLatLngs(polygon: Feature<Polygon>): LatLngTuple[][] {
  const { coordinates } = polygon.geometry

  if (polygon.geometry.type === 'Polygon') {
    return coordinates.map((ring) =>
      ring.map(([lng, lat]) => [lat, lng] as LatLngTuple),
    )
  }

  return []
}

export function expandBounds(
  bounds: LatLngBounds,
  paddingRatio = 0.08,
): LatLngBounds {
  const latSpan = bounds.getNorth() - bounds.getSouth()

  return bounds.pad(Math.max(paddingRatio, latSpan === 0 ? 0.02 : paddingRatio))
}

export function midpoint(a: LatLngTuple, b: LatLngTuple): LatLngTuple {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
}

export function bearingDegrees(a: LatLngTuple, b: LatLngTuple): number {
  const lat1 = (a[0] * Math.PI) / 180
  const lat2 = (b[0] * Math.PI) / 180
  const dLng = ((b[1] - a[1]) * Math.PI) / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function destinationPoint(
  origin: LatLngTuple,
  distanceMeters: number,
  bearing: number,
): LatLngTuple {
  const earthRadius = 6_371_000
  const angularDistance = distanceMeters / earthRadius
  const bearingRad = (bearing * Math.PI) / 180
  const lat1 = (origin[0] * Math.PI) / 180
  const lng1 = (origin[1] * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad),
  )
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    )

  return [(lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI]
}

export function buildHalfPlanePolygon(
  pointA: LatLngTuple,
  pointB: LatLngTuple,
  gameArea: GameArea,
): Feature<Polygon> | null {
  const gameFeature = gameAreaToPolygon(gameArea)
  const gameBbox = bboxPolygon([
    Math.min(...gameArea.coordinates[0].map((coord) => coord[0])),
    Math.min(...gameArea.coordinates[0].map((coord) => coord[1])),
    Math.max(...gameArea.coordinates[0].map((coord) => coord[0])),
    Math.max(...gameArea.coordinates[0].map((coord) => coord[1])),
  ])

  const mid = midpoint(pointA, pointB)
  const bearing = bearingDegrees(pointA, pointB)
  const diagonalMeters = 250_000
  const left = destinationPoint(mid, diagonalMeters, bearing + 90)
  const right = destinationPoint(mid, diagonalMeters, bearing - 90)
  const far = destinationPoint(mid, diagonalMeters, bearing)

  const hotterSide: Position[][] = [
    [
      [mid[1], mid[0]],
      [left[1], left[0]],
      [far[1], far[0]],
      [right[1], right[0]],
      [mid[1], mid[0]],
    ],
  ]

  return safeDifference(gameFeature, turfPolygon(hotterSide)) ?? gameBbox
}
