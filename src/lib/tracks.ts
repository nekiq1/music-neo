import type { Track, LyricLine } from '@/types'

const demoLyrics: LyricLine[] = [
  { time: 0, text: '♪ soft intro' },
  { time: 8, text: 'rain on the window' },
  { time: 16, text: 'city lights fade' },
  { time: 24, text: 'just breathe and stay' },
  { time: 32, text: '♪ interlude' },
  { time: 48, text: 'midnight pages turn' },
  { time: 56, text: 'coffee and quiet words' },
  { time: 72, text: '♪ fade out' },
]

/**
 * Legal free audio (CC0 / public demos).
 * Full commercial catalogs (Spotify/SoundCloud/Yandex full tracks of
 * Playboi Carti etc.) require proper licenses — not included.
 *
 * Optional: set VITE_SPOTIFY_CLIENT_ID + VITE_SPOTIFY_CLIENT_SECRET
 * for official Spotify search + 30s previews (legal).
 */

const SAMPLES = [
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
]

export const CATEGORIES = [
  { slug: 'all', label: 'Все' },
  { slug: 'chillhop', label: 'Chillhop' },
  { slug: 'ambient-lofi', label: 'Ambient' },
  { slug: 'jazzhop', label: 'Jazzhop' },
  { slug: 'activities', label: 'Focus' },
  { slug: 'late-night', label: 'Late Night' },
  { slug: 'soul-rnb', label: 'Soul' },
  { slug: 'hybrid', label: 'Hybrid' },
]

function makeCover(seed: number, title: string): string {
  const hues = [145, 200, 330, 160, 25, 290, 340, 190, 265]
  const h = hues[seed % hues.length]
  const h2 = (h + 35) % 360
  const label = title
    .slice(0, 18)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
    '<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">' +
    `<stop offset="0%" style="stop-color:hsl(${h},65%,42%)"/>` +
    `<stop offset="100%" style="stop-color:hsl(${h2},55%,20%)"/>` +
    '</linearGradient></defs>' +
    '<rect width="400" height="400" fill="url(#g)"/>' +
    '<circle cx="200" cy="165" r="70" fill="rgba(255,255,255,0.12)"/>' +
    `<text x="200" y="310" text-anchor="middle" fill="rgba(255,255,255,0.95)" ` +
    `font-family="system-ui,sans-serif" font-size="18" font-weight="600">${label}</text>` +
    '</svg>'
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const CATALOG: { title: string; artist: string; category: string; lyrics?: boolean }[] = [
  { title: '2 AM Debug Loop', artist: 'Open Lo-Fi', category: 'activities', lyrics: true },
  { title: 'Brushstrokes and Rain', artist: 'Open Lo-Fi', category: 'activities', lyrics: true },
  { title: 'Terminal Rain', artist: 'Open Lo-Fi', category: 'activities', lyrics: true },
  { title: 'Morning Pages', artist: 'Open Lo-Fi', category: 'activities' },
  { title: 'Coffee Ring Notebook', artist: 'Open Lo-Fi', category: 'activities' },
  { title: 'Almost Floating', artist: 'Open Lo-Fi', category: 'ambient-lofi', lyrics: true },
  { title: 'Aurora on Mute', artist: 'Open Lo-Fi', category: 'ambient-lofi' },
  { title: 'Deep Space Loop', artist: 'Open Lo-Fi', category: 'ambient-lofi' },
  { title: 'Underwater Dreamscape', artist: 'Open Lo-Fi', category: 'ambient-lofi', lyrics: true },
  { title: 'Moonlit Moss', artist: 'Open Lo-Fi', category: 'ambient-lofi' },
  { title: 'Dusk Between Stoops', artist: 'Open Lo-Fi', category: 'chillhop', lyrics: true },
  { title: 'Soft Gold Sky', artist: 'Open Lo-Fi', category: 'chillhop' },
  { title: 'Window Seat Daydream', artist: 'Open Lo-Fi', category: 'chillhop', lyrics: true },
  { title: 'Sidewalk Slow Jam', artist: 'Open Lo-Fi', category: 'chillhop' },
  { title: 'Glow on the Overpass', artist: 'Open Lo-Fi', category: 'chillhop' },
  { title: 'Cafe Da Tarde', artist: 'Open Lo-Fi', category: 'hybrid' },
  { title: 'Quiet Credits', artist: 'Open Lo-Fi', category: 'hybrid', lyrics: true },
  { title: 'Cassette Pastel Nights', artist: 'Open Lo-Fi', category: 'hybrid' },
  { title: 'Neon on the Diner Floor', artist: 'Open Lo-Fi', category: 'soul-rnb' },
  { title: 'Motel Soul Radio', artist: 'Open Lo-Fi', category: 'soul-rnb', lyrics: true },
  { title: 'Dusty Jukebox Heart', artist: 'Open Lo-Fi', category: 'soul-rnb' },
  { title: 'Late Signal', artist: 'Open Lo-Fi', category: 'late-night', lyrics: true },
  { title: 'After Hours Static', artist: 'Open Lo-Fi', category: 'late-night' },
  { title: 'Bookstore Groove', artist: 'Open Lo-Fi', category: 'jazzhop', lyrics: true },
  { title: 'Vinyl Afternoon', artist: 'Open Lo-Fi', category: 'jazzhop' },
]

export const TRACKS: Track[] = CATALOG.map((item, i) => ({
  id: String(i + 1),
  title: item.title,
  artist: item.artist,
  category: item.category,
  url: SAMPLES[i % SAMPLES.length],
  cover: makeCover(i + 1, item.title),
  lyrics: item.lyrics ? demoLyrics : undefined,
}))

export function getPlayableUrl(track: Track): string {
  return track.url
}

export function searchTracks(query: string): Track[] {
  const q = query.trim().toLowerCase()
  if (!q) return TRACKS
  return TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  )
}
