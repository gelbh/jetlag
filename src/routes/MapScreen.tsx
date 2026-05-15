import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Polygon } from 'react-leaflet'
import html2canvas from 'html2canvas'
import type { Feature, LineString, Point, Polygon as GeoPolygon } from 'geojson'
import { AnnotationLayer } from '../components/map/AnnotationLayer'
import { GameAreaMask } from '../components/map/GameAreaMask'
import { MapView } from '../components/map/MapView'
import { ShareCode } from '../components/session/ShareCode'
import { SessionLog } from '../components/session/SessionLog'
import { PinPanel } from '../components/tools/PinPanel'
import { RadarPanel } from '../components/tools/RadarPanel'
import { TentaclePanel } from '../components/tools/TentaclePanel'
import { ThermometerPanel } from '../components/tools/ThermometerPanel'
import { ToolDock } from '../components/tools/ToolDock'
import { ZonePanel } from '../components/tools/ZonePanel'
import type { LatLngTuple } from '../domain/geometry'
import { useAnnotations } from '../hooks/useAnnotations'
import { useGeolocation } from '../hooks/useGeolocation'
import { useSessionSync } from '../hooks/useSessionSync'
import { fetchTentaclePois } from '../services/overpass'
import {
  useAnnotationStore,
  useMapStore,
  useSessionStore,
  type MapTool,
} from '../state/sessionStore'

export function MapScreen() {
  const session = useSessionStore((state) => state.session)
  const playerMode = useSessionStore((state) => state.playerMode)
  const pendingWrites = useSessionStore((state) => state.pendingWrites)
  const setPlayerMode = useSessionStore((state) => state.setPlayerMode)
  const activeTool = useMapStore((state) => state.activeTool)
  const setActiveTool = useMapStore((state) => state.setActiveTool)
  const annotations = useAnnotationStore((state) => state.annotations)
  const undoLastAnnotation = useAnnotationStore((state) => state.undoLastAnnotation)
  const clearAnnotationPulse = useAnnotationStore((state) => state.clearAnnotationPulse)
  const pulsingAnnotationIds = useAnnotationStore((state) => state.pulsingAnnotationIds)
  const { createAnnotation, deleteAnnotation } = useAnnotations()
  const { refresh, loading: gpsLoading, error: gpsError } = useGeolocation()
  const mapShellRef = useRef<HTMLDivElement>(null)

  const [logOpen, setLogOpen] = useState(false)
  const [radarRadius, setRadarRadius] = useState(1000)
  const [radarCustomRadius, setRadarCustomRadius] = useState('')
  const [radarInside, setRadarInside] = useState(true)
  const [radarCenter, setRadarCenter] = useState<LatLngTuple | null>(null)
  const [zoneVertices, setZoneVertices] = useState<LatLngTuple[]>([])
  const [zoneLabel, setZoneLabel] = useState('')
  const [thermoA, setThermoA] = useState<LatLngTuple | null>(null)
  const [thermoB, setThermoB] = useState<LatLngTuple | null>(null)
  const [pinLabel, setPinLabel] = useState('')
  const [pinPoint, setPinPoint] = useState<LatLngTuple | null>(null)
  const [tentacleRadius, setTentacleRadius] = useState(1000)
  const [tentacleCategory, setTentacleCategory] = useState('aquarium')
  const [tentacleCenter, setTentacleCenter] = useState<LatLngTuple | null>(null)
  const [tentaclePois, setTentaclePois] = useState<
    Array<{ id: string; name: string; lat: number; lng: number; category: string }>
  >([])
  const [tentacleHighlight, setTentacleHighlight] = useState('')
  const [tentacleLoading, setTentacleLoading] = useState(false)
  const [tentacleError, setTentacleError] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useSessionSync()

  useEffect(() => {
    if (pulsingAnnotationIds.length === 0) {
      return
    }

    const timeouts = pulsingAnnotationIds.map((id) =>
      window.setTimeout(() => clearAnnotationPulse(id), 1200),
    )

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
    }
  }, [clearAnnotationPulse, pulsingAnnotationIds])

  const center = useMemo<LatLngTuple>(() => {
    if (!session?.gameArea) {
      return [51.505, -0.09]
    }

    const ring = session.gameArea.coordinates[0]
    const avgLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length
    const avgLng = ring.reduce((sum, [lng]) => sum + lng, 0) / ring.length
    return [avgLat, avgLng]
  }, [session?.gameArea])

  if (!session?.gameArea) {
    return <Navigate to="/create" replace />
  }

  const resolvedRadarRadius = Number(radarCustomRadius) || radarRadius
  const thermoStep: 'a' | 'b' | 'ready' = !thermoA ? 'a' : !thermoB ? 'b' : 'ready'

  const handleMapClick = (lat: number, lng: number) => {
    const point: LatLngTuple = [lat, lng]

    if (activeTool === 'radar') {
      setRadarCenter(point)
      return
    }

    if (activeTool === 'zone') {
      setZoneVertices((vertices) => [...vertices, point])
      return
    }

    if (activeTool === 'thermometer') {
      if (!thermoA) {
        setThermoA(point)
      } else if (!thermoB) {
        setThermoB(point)
      }
      return
    }

    if (activeTool === 'pin') {
      setPinPoint(point)
      return
    }

    if (activeTool === 'tentacle') {
      setTentacleCenter(point)
    }
  }

  const commitRadar = async () => {
    if (!radarCenter) {
      setMapError('Choose a center with GPS or a map tap.')
      return
    }

    const geometry: Feature<Point> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [radarCenter[1], radarCenter[0]],
      },
    }

    await createAnnotation({
      type: 'radar',
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        radiusMeters: resolvedRadarRadius,
        inside: radarInside,
        color: '#f97316',
      },
    })

    setRadarCenter(null)
    setMapError(null)
  }

  const closeZone = async () => {
    if (zoneVertices.length < 3) {
      return
    }

    const ring = zoneVertices.map(([lat, lng]) => [lng, lat])
    ring.push(ring[0])
    const geometry: Feature<GeoPolygon> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    }

    await createAnnotation({
      type: 'zone',
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        label: zoneLabel,
        color: '#a855f7',
      },
    })

    setZoneVertices([])
    setZoneLabel('')
  }

  const commitThermometer = async () => {
    if (!thermoA || !thermoB) {
      return
    }

    const geometry: Feature<LineString> = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [
          [thermoA[1], thermoA[0]],
          [thermoB[1], thermoB[0]],
        ],
      },
    }

    await createAnnotation({
      type: 'thermometer',
      geometry,
      metadata: {
        createdAt: new Date().toISOString(),
        hotterTowards: 'b',
        color: '#ef4444',
      },
    })

    setThermoA(null)
    setThermoB(null)
  }

  const commitPin = async () => {
    if (!pinPoint || pinLabel.trim().length === 0) {
      return
    }

    await createAnnotation({
      type: 'pin',
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [pinPoint[1], pinPoint[0]],
        },
      },
      metadata: {
        createdAt: new Date().toISOString(),
        label: pinLabel.trim(),
        color: '#38bdf8',
      },
    })

    setPinPoint(null)
    setPinLabel('')
  }

  const loadTentaclePois = async () => {
    if (!tentacleCenter) {
      return
    }

    setTentacleLoading(true)
    setTentacleError(null)

    try {
      const pois = await fetchTentaclePois(tentacleCenter, tentacleRadius, tentacleCategory)
      setTentaclePois(pois)
    } catch (error) {
      setTentacleError(error instanceof Error ? error.message : 'Unable to load POIs.')
    } finally {
      setTentacleLoading(false)
    }
  }

  const commitTentacle = async () => {
    if (!tentacleCenter) {
      return
    }

    await createAnnotation({
      type: 'tentacle',
      geometry: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [tentacleCenter[1], tentacleCenter[0]],
        },
      },
      metadata: {
        createdAt: new Date().toISOString(),
        radiusMeters: tentacleRadius,
        highlightedPoiId: tentacleHighlight || undefined,
        poiIds: tentaclePois.map((poi) => poi.id),
        pois: tentaclePois,
        color: '#22c55e',
      },
    })

    setTentacleCenter(null)
    setTentaclePois([])
    setTentacleHighlight('')
  }

  const handleUseGps = async (target: MapTool) => {
    try {
      const reading = await refresh()
      const point: LatLngTuple = [reading.lat, reading.lng]
      if (target === 'radar') {
        setRadarCenter(point)
      } else if (target === 'tentacle') {
        setTentacleCenter(point)
      }
      setMapError(null)
    } catch (error) {
      setMapError(error instanceof Error ? error.message : 'Unable to read GPS location.')
    }
  }

  const exportMap = async () => {
    if (!mapShellRef.current) {
      return
    }

    const canvas = await html2canvas(mapShellRef.current, {
      useCORS: true,
      backgroundColor: '#0f172a',
    })

    const link = document.createElement('a')
    link.download = `jetlag-map-${session.code}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const renderPanel = () => {
    switch (activeTool) {
      case 'radar':
        return (
          <RadarPanel
            radiusMeters={resolvedRadarRadius}
            inside={radarInside}
            customRadius={radarCustomRadius}
            onRadiusChange={setRadarRadius}
            onCustomRadiusChange={setRadarCustomRadius}
            onInsideChange={setRadarInside}
            onUseGps={() => void handleUseGps('radar')}
            onPlaceAtMapCenter={() => setMapError('Tap the map to place the radar center.')}
            onCommit={() => void commitRadar()}
            gpsLoading={gpsLoading}
            error={mapError ?? gpsError}
          />
        )
      case 'zone':
        return (
          <ZonePanel
            vertexCount={zoneVertices.length}
            label={zoneLabel}
            onLabelChange={setZoneLabel}
            onClosePolygon={() => void closeZone()}
            onReset={() => setZoneVertices([])}
          />
        )
      case 'thermometer':
        return (
          <ThermometerPanel
            step={thermoStep}
            onReset={() => {
              setThermoA(null)
              setThermoB(null)
            }}
            onCommit={() => void commitThermometer()}
          />
        )
      case 'pin':
        return (
          <PinPanel
            label={pinLabel}
            onLabelChange={setPinLabel}
            onCommit={() => void commitPin()}
            hasPoint={pinPoint !== null}
          />
        )
      case 'tentacle':
        return (
          <TentaclePanel
            radiusMeters={tentacleRadius}
            categoryId={tentacleCategory}
            highlightedPoiId={tentacleHighlight}
            poiOptions={tentaclePois}
            loading={tentacleLoading}
            error={tentacleError}
            onRadiusChange={setTentacleRadius}
            onCategoryChange={setTentacleCategory}
            onUseGps={() => void handleUseGps('tentacle')}
            onLoadPois={() => void loadTentaclePois()}
            onHighlightChange={setTentacleHighlight}
            onCommit={() => void commitTentacle()}
            hasCenter={tentacleCenter !== null}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="relative h-full">
      <div ref={mapShellRef} className="absolute inset-0">
        <MapView
          center={center}
          zoom={12}
          onMapClick={handleMapClick}
          className={activeTool === 'zone' ? 'map-crosshair h-full w-full' : 'h-full w-full'}
        >
          <GameAreaMask gameArea={session.gameArea} />
          <AnnotationLayer
            annotations={annotations}
            gameArea={session.gameArea}
            hidden={playerMode === 'hider'}
          />
          {zoneVertices.length > 0 ? (
            <Polygon
              positions={zoneVertices}
              pathOptions={{ color: '#a855f7', dashArray: '6 6', fillOpacity: 0.15 }}
            />
          ) : null}
        </MapView>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-start justify-between gap-3">
          <Link to="/" className="min-h-12 rounded-xl bg-slate-900/90 px-4 py-3 text-sm backdrop-blur">
            Home
          </Link>
          <div className="w-full max-w-xs">
            <ShareCode code={session.code} remote={session.id !== 'local'} />
          </div>
        </div>
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPlayerMode('seeker')}
            className={`min-h-12 rounded-xl px-4 text-sm ${
              playerMode === 'seeker' ? 'bg-sky-500 text-slate-950' : 'bg-slate-900/90'
            }`}
          >
            Seeker
          </button>
          <button
            type="button"
            onClick={() => setPlayerMode('hider')}
            className={`min-h-12 rounded-xl px-4 text-sm ${
              playerMode === 'hider' ? 'bg-slate-100 text-slate-950' : 'bg-slate-900/90'
            }`}
          >
            Hider
          </button>
          {pendingWrites > 0 ? (
            <span className="min-h-12 rounded-xl bg-amber-500/20 px-4 py-3 text-sm text-amber-100">
              {pendingWrites} pending sync
            </span>
          ) : null}
        </div>
      </div>

      {activeTool !== 'none' ? (
        <div className="pointer-events-auto absolute inset-x-0 bottom-24 z-[1000] px-4">
          <div className="mx-auto max-w-xl rounded-3xl border border-slate-700 bg-slate-950/95 p-4 backdrop-blur">
            {renderPanel()}
          </div>
        </div>
      ) : null}

      <ToolDock
        activeTool={activeTool}
        onSelect={setActiveTool}
        onUndo={undoLastAnnotation}
        onOpenLog={() => setLogOpen(true)}
        onExport={() => void exportMap()}
      />

      <SessionLog
        open={logOpen}
        annotations={annotations}
        onClose={() => setLogOpen(false)}
        onDelete={(id) => void deleteAnnotation(id)}
      />
    </div>
  )
}
