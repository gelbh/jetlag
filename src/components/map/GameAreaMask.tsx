import { Polygon, Rectangle } from 'react-leaflet'
import type { GameArea } from '../../domain/annotations'
import { gameAreaToLeafletLatLngs } from '../../domain/geometry'

interface GameAreaMaskProps {
  gameArea: GameArea
  framing?: boolean
}

export function GameAreaMask({ gameArea, framing = false }: GameAreaMaskProps) {
  const positions = gameAreaToLeafletLatLngs(gameArea)

  if (framing) {
    const lats = positions.map(([lat]) => lat)
    const lngs = positions.map(([, lng]) => lng)

    return (
      <Rectangle
        bounds={[
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ]}
        pathOptions={{
          color: '#38bdf8',
          weight: 2,
          fillOpacity: 0.08,
        }}
      />
    )
  }

  return (
    <Polygon
      positions={positions}
      pathOptions={{
        color: '#38bdf8',
        weight: 2,
        fillOpacity: 0,
      }}
    />
  )
}
