export type GeoPosition = {
  lat: number
  lng: number
  accuracy_m: number | null
}

function geoErrorMessage(err: GeolocationPositionError | Error): string {
  if ('code' in err) {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        return 'Location permission denied. Enable location for this site in your browser or phone settings, then try again.'
      case err.POSITION_UNAVAILABLE:
        return 'Location unavailable. Move near a window or outdoors and try again.'
      case err.TIMEOUT:
        return 'GPS timed out. Try again outdoors with a clearer sky view, or wait a few seconds for the phone GPS to lock.'
      default:
        return err.message || 'Could not get location.'
    }
  }
  return err.message || 'Could not get location.'
}

function readPosition(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })
}

/**
 * Get current coordinates with fallbacks:
 * 1) high accuracy
 * 2) network / low accuracy
 * 3) last-known position (up to 2 minutes old)
 */
export async function getCurrentPosition(options?: PositionOptions): Promise<GeoPosition> {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported on this device.')
  }

  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new Error('Location requires HTTPS. Open the site via https:// (GitHub Pages is fine).')
  }

  const attempts: PositionOptions[] = [
    {
      enableHighAccuracy: true,
      timeout: options?.timeout ?? 25000,
      maximumAge: 0,
    },
    {
      enableHighAccuracy: false,
      timeout: 20000,
      maximumAge: 60_000,
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 120_000,
    },
  ]

  let lastError: Error | null = null

  for (const opts of attempts) {
    try {
      const pos = await readPosition(opts)
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy ?? null,
      }
    } catch (e) {
      const err = e as GeolocationPositionError
      if (err && typeof err === 'object' && 'code' in err && err.code === err.PERMISSION_DENIED) {
        throw new Error(geoErrorMessage(err))
      }
      lastError = new Error(geoErrorMessage(err instanceof Error ? err : new Error('Location failed')))
    }
  }

  throw lastError || new Error('Could not get location.')
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`
}
