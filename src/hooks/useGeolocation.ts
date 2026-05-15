import { useCallback, useState } from 'react'
import { getCurrentPosition, type GeolocationReading } from '../services/geolocation'

export function useGeolocation() {
  const [reading, setReading] = useState<GeolocationReading | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const next = await getCurrentPosition()
      setReading(next)
      return next
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : 'Unable to read GPS location.'
      setError(message)
      throw nextError
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    reading,
    error,
    loading,
    refresh,
  }
}
