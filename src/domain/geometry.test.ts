import { describe, expect, it } from 'vitest'
import { bboxPolygon } from '@turf/turf'
import { buildHalfPlanePolygon, boundsToGameArea, safeDifference } from '../domain/geometry'
import type { GameArea } from '../domain/annotations'

const sampleGameArea: GameArea = {
  type: 'Polygon',
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
}

describe('geometry helpers', () => {
  it('converts map bounds into a closed polygon', () => {
    const bounds = {
      getSouthWest: () => ({ lat: 51.4, lng: -0.2 }),
      getNorthEast: () => ({ lat: 51.5, lng: -0.1 }),
    }

    const gameArea = boundsToGameArea(bounds as never)
    expect(gameArea.coordinates[0][0]).toEqual([-0.2, 51.4])
    expect(gameArea.coordinates[0]).toHaveLength(5)
  })

  it('returns a clipped polygon for thermometer shading', () => {
    const colderSide = buildHalfPlanePolygon([51.45, -0.18], [51.46, -0.12], sampleGameArea)
    expect(colderSide?.geometry.type).toBe('Polygon')
  })

  it('subtracts an inner polygon safely', () => {
    const outer = bboxPolygon([-0.2, 51.4, -0.1, 51.5])
    const inner = bboxPolygon([-0.18, 51.42, -0.12, 51.48])
    const result = safeDifference(outer, inner)
    expect(result?.geometry.type).toBe('Polygon')
  })
})
