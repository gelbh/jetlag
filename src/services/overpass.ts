import type { LatLngTuple } from '../domain/geometry'
import type { TentaclePoi } from '../domain/annotations'
import { TENTACLE_CATEGORIES } from '../domain/annotations'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

function buildOverpassQuery(center: LatLngTuple, radiusMeters: number, categoryId: string) {
  const category = TENTACLE_CATEGORIES.find((item) => item.id === categoryId)
  const filter = category?.overpassTag ?? 'tourism=attraction'

  return `
    [out:json][timeout:25];
    (
      node(around:${radiusMeters},${center[0]},${center[1]})[${filter}];
      way(around:${radiusMeters},${center[0]},${center[1]})[${filter}];
    );
    out center 40;
  `
}

export async function fetchTentaclePois(
  center: LatLngTuple,
  radiusMeters: number,
  categoryId: string,
): Promise<TentaclePoi[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: `data=${encodeURIComponent(buildOverpassQuery(center, radiusMeters, categoryId))}`,
  })

  if (!response.ok) {
    throw new Error('Overpass query failed.')
  }

  const payload = (await response.json()) as {
    elements: Array<{
      id: number
      tags?: Record<string, string>
      lat?: number
      lon?: number
      center?: { lat: number; lon: number }
    }>
  }

  return payload.elements
    .map((element) => {
      const lat = element.lat ?? element.center?.lat
      const lng = element.lon ?? element.center?.lon

      if (lat === undefined || lng === undefined) {
        return null
      }

      return {
        id: String(element.id),
        name: element.tags?.name ?? 'Unnamed POI',
        lat,
        lng,
        category: categoryId,
      } satisfies TentaclePoi
    })
    .filter((poi): poi is TentaclePoi => poi !== null)
}
