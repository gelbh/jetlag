import { useEffect } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBounds, LatLngExpression } from 'leaflet'

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'

interface MapViewProps {
  center?: LatLngExpression
  zoom?: number
  className?: string
  onBoundsChange?: (bounds: LatLngBounds) => void
  onMapClick?: (lat: number, lng: number) => void
  interactive?: boolean
  children?: React.ReactNode
}

function MapEvents({
  onBoundsChange,
  onMapClick,
}: {
  onBoundsChange?: (bounds: LatLngBounds) => void
  onMapClick?: (lat: number, lng: number) => void
}) {
  const map = useMap()

  useEffect(() => {
    if (!onBoundsChange) {
      return
    }

    const emitBounds = () => onBoundsChange(map.getBounds())
    emitBounds()
    map.on('moveend', emitBounds)
    map.on('zoomend', emitBounds)

    return () => {
      map.off('moveend', emitBounds)
      map.off('zoomend', emitBounds)
    }
  }, [map, onBoundsChange])

  useMapEvents({
    click(event) {
      onMapClick?.(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

export function MapView({
  center = [51.505, -0.09],
  zoom = 13,
  className,
  onBoundsChange,
  onMapClick,
  interactive = true,
  children,
}: MapViewProps) {
  return (
    <div className={className ?? 'h-full w-full'}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        className={interactive ? 'h-full w-full' : 'h-full w-full pointer-events-auto'}
      >
        <TileLayer
          attribution={OSM_ATTRIBUTION}
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <MapEvents onBoundsChange={onBoundsChange} onMapClick={onMapClick} />
        {children}
      </MapContainer>
    </div>
  )
}
