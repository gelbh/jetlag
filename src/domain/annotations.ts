import type { Feature, Polygon, Point, LineString } from 'geojson'

export type AnnotationType =
  | 'radar'
  | 'thermometer'
  | 'zone'
  | 'pin'
  | 'tentacle'

export type AnnotationStatus = 'active' | 'deleted'

export type PlayerMode = 'seeker' | 'hider'

export interface AnnotationMetadata {
  label?: string
  color?: string
  createdAt: string
  createdBy?: string
  radiusMeters?: number
  inside?: boolean
  hotterTowards?: 'a' | 'b'
  poiIds?: string[]
  highlightedPoiId?: string
  pois?: TentaclePoi[]
}

export interface TentaclePoi {
  id: string
  name: string
  lat: number
  lng: number
  category: string
}

export interface AnnotationRecord {
  id: string
  sessionId: string
  type: AnnotationType
  geometry: Feature<Point | LineString | Polygon>
  metadata: AnnotationMetadata
  status: AnnotationStatus
}

export interface GameArea {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface SessionRecord {
  id: string
  code: string
  gameArea: GameArea
  hostUid?: string
  createdAt: string
  memberUids: string[]
}

export const LOCAL_SESSION_ID = 'local'

export const RADAR_RADIUS_PRESETS = [500, 1000, 2000, 5000, 10000] as const

export const TENTACLE_CATEGORIES = [
  { id: 'aquarium', label: 'Aquariums', overpassTag: 'tourism=aquarium' },
  { id: 'hospital', label: 'Hospitals', overpassTag: 'amenity=hospital' },
  { id: 'museum', label: 'Museums', overpassTag: 'tourism=museum' },
  { id: 'stadium', label: 'Stadiums', overpassTag: 'leisure=stadium' },
] as const

export function createAnnotationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function isActive(annotation: AnnotationRecord): boolean {
  return annotation.status === 'active'
}

export function annotationSummary(annotation: AnnotationRecord): string {
  switch (annotation.type) {
    case 'radar':
      return `Radar ${annotation.metadata.inside ? 'inside' : 'outside'} ${annotation.metadata.radiusMeters ?? 0}m`
    case 'thermometer':
      return 'Thermometer half-plane'
    case 'zone':
      return annotation.metadata.label?.trim() || 'Eliminated zone'
    case 'pin':
      return annotation.metadata.label?.trim() || 'Map note'
    case 'tentacle':
      return `Tentacle ${annotation.metadata.radiusMeters ?? 0}m`
    default:
      return 'Annotation'
  }
}
