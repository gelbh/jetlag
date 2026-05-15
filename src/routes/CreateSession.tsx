import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LatLngBounds } from 'leaflet'
import { MapView } from '../components/map/MapView'
import { GameAreaMask } from '../components/map/GameAreaMask'
import { boundsToGameArea } from '../domain/geometry'
import { generateLocalCode } from '../domain/session'
import { useSessionStore } from '../state/sessionStore'
import { isFirebaseConfigured, ensureAnonymousUser } from '../services/firebase'
import { createRemoteSession } from '../services/firestoreAnnotations'

export function CreateSession() {
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)
  const [bounds, setBounds] = useState<LatLngBounds | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!bounds) {
      setError('Move the map until the play area is framed.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const gameArea = boundsToGameArea(bounds)

      if (isFirebaseConfigured()) {
        const user = await ensureAnonymousUser()
        const session = await createRemoteSession(gameArea, user.uid)
        setSession(session)
      } else {
        setSession({
          id: 'local',
          code: generateLocalCode(),
          gameArea,
          createdAt: new Date().toISOString(),
          memberUids: [],
        })
      }

      navigate('/map')
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to create session.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-full">
      <MapView onBoundsChange={setBounds} zoom={12}>
        {bounds ? <GameAreaMask gameArea={boundsToGameArea(bounds)} framing /> : null}
      </MapView>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1000] space-y-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto rounded-2xl border border-slate-700 bg-slate-950/90 p-4 backdrop-blur">
          <h1 className="text-xl font-semibold">Frame the game area</h1>
          <p className="mt-2 text-sm text-slate-300">
            Pan and zoom until the highlighted box covers the playable region.
          </p>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={loading}
            className="mt-4 min-h-12 w-full rounded-xl bg-sky-500 text-sm font-semibold text-slate-950 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Confirm game area'}
          </button>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </div>
      </div>
    </div>
  )
}
