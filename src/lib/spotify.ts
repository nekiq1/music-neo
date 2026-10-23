/**
 * Official Spotify Web API — Client Credentials.
 * Only search + 30-second previews (legal).
 * Full-track streaming of commercial catalog is NOT supported
 * and would violate Spotify Terms + copyright.
 *
 * Setup:
 * 1. https://developer.spotify.com/dashboard → create app
 * 2. Put Client ID / Secret into .env (see .env.example)
 */

import type { Track } from '@/types'

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string | undefined
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET as string | undefined

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET) return null
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) {
    return cachedToken.access_token
  }
  const body = new URLSearchParams({ grant_type: 'client_credentials' })
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body,
  })
  if (!res.ok) {
    console.warn('Spotify token failed', res.status)
    return null
  }
  const data = await res.json()
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.access_token
}

export function isSpotifyConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET)
}

/** Search tracks; returns items with 30s preview_url when available */
export async function searchSpotify(query: string, limit = 20): Promise<Track[]> {
  const token = await getToken()
  if (!token || !query.trim()) return []

  const params = new URLSearchParams({
    q: query.trim(),
    type: 'track',
    limit: String(limit),
    market: 'SE', // Sweden as user mentioned
  })
  const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    console.warn('Spotify search failed', res.status)
    return []
  }
  const data = await res.json()
  const items = data.tracks?.items ?? []

  return items
    .filter((t: any) => t.preview_url) // only playable previews
    .map(
      (t: any): Track => ({
        id: `sp_${t.id}`,
        title: t.name,
        artist: (t.artists || []).map((a: any) => a.name).join(', ') || 'Unknown',
        category: 'spotify',
        url: t.preview_url,
        cover: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
        duration: Math.round((t.duration_ms || 0) / 1000),
      })
    )
}
