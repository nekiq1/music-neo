import { Play, ListPlus, ListEnd, MoreHorizontal, Search, Loader2 } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { TRACKS, CATEGORIES, searchTracks } from '@/lib/tracks'
import { searchSpotify, isSpotifyConfigured } from '@/lib/spotify'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import type { Track } from '@/types'

export function TrackList() {
  const { category, setCategory, playTrack, addToQueue, playNext, currentIndex, queue, isPlaying } =
    usePlayer()
  const [menuId, setMenuId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [spotifyResults, setSpotifyResults] = useState<Track[]>([])
  const [searching, setSearching] = useState(false)

  const localFiltered =
    category === 'all'
      ? query
        ? searchTracks(query)
        : TRACKS
      : TRACKS.filter((t) => t.category === category).filter(
          (t) =>
            !query ||
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            t.artist.toLowerCase().includes(query.toLowerCase())
        )

  const doSpotifySearch = useCallback(async (q: string) => {
    if (!isSpotifyConfigured() || q.trim().length < 2) {
      setSpotifyResults([])
      return
    }
    setSearching(true)
    try {
      const res = await searchSpotify(q, 15)
      setSpotifyResults(res)
    } catch {
      setSpotifyResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSpotifySearch(query), 400)
    return () => clearTimeout(t)
  }, [query, doSpotifySearch])

  const current = queue[currentIndex]
  const showSpotify = isSpotifyConfigured() && query.trim().length >= 2

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="px-4 pt-1 pb-2 shrink-0">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              isSpotifyConfigured()
                ? 'Поиск: локально + Spotify (30с превью)…'
                : 'Поиск по библиотеке…'
            }
            className="w-full bg-neo-elevated border border-neo-border rounded-full pl-9 pr-4 py-2.5 text-sm text-neo-text placeholder:text-neo-muted focus:outline-none focus:border-neo-accent/50 transition"
          />
          {searching && (
            <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-neo-muted animate-spin" />
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-none shrink-0">
        {CATEGORIES.map((c) => (
          <button
            key={c.slug}
            onClick={() => setCategory(c.slug)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition',
              category === c.slug
                ? 'bg-neo-accent text-neo-bg'
                : 'bg-neo-elevated text-neo-muted hover:text-white'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-3 pb-36">
        {localFiltered.map((track) => (
          <TrackRow
            key={track.id}
            track={track}
            active={current?.id === track.id}
            isPlaying={isPlaying}
            menuId={menuId}
            setMenuId={setMenuId}
            playTrack={playTrack}
            addToQueue={addToQueue}
            playNext={playNext}
          />
        ))}

        {showSpotify && spotifyResults.length > 0 && (
          <>
            <p className="text-[11px] text-neo-muted uppercase tracking-wider px-2 pt-4 pb-2">
              Spotify · 30 сек превью
            </p>
            {spotifyResults.map((track) => (
              <TrackRow
                key={track.id}
                track={track}
                active={current?.id === track.id}
                isPlaying={isPlaying}
                menuId={menuId}
                setMenuId={setMenuId}
                playTrack={playTrack}
                addToQueue={addToQueue}
                playNext={playNext}
                badge="SP"
              />
            ))}
          </>
        )}

        {localFiltered.length === 0 && (!showSpotify || spotifyResults.length === 0) && (
          <p className="text-center text-neo-muted text-sm py-12">Ничего не найдено</p>
        )}
      </div>
    </div>
  )
}

function TrackRow({
  track,
  active,
  isPlaying,
  menuId,
  setMenuId,
  playTrack,
  addToQueue,
  playNext,
  badge,
}: {
  track: Track
  active: boolean
  isPlaying: boolean
  menuId: string | null
  setMenuId: (id: string | null) => void
  playTrack: (t: Track) => void
  addToQueue: (t: Track) => void
  playNext: (t: Track) => void
  badge?: string
}) {
  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-2.5 rounded-2xl transition relative',
        active ? 'bg-neo-elevated' : 'hover:bg-neo-card'
      )}
    >
      <button onClick={() => playTrack(track)} className="relative shrink-0">
        <img
          src={track.cover || ''}
          alt=""
          className="w-12 h-12 rounded-xl object-cover bg-neo-elevated"
          loading="lazy"
        />
        {badge && (
          <span className="absolute -top-1 -right-1 text-[9px] font-bold bg-neo-accent text-neo-bg px-1 rounded">
            {badge}
          </span>
        )}
        {active && isPlaying && (
          <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
            <div className="flex gap-0.5">
              {[1, 2, 3].map((b) => (
                <div
                  key={b}
                  className="w-0.5 bg-neo-accent rounded-full animate-pulse"
                  style={{ height: 8 + b * 3, animationDelay: `${b * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </button>

      <button onClick={() => playTrack(track)} className="min-w-0 flex-1 text-left">
        <p className={cn('text-sm font-medium truncate', active && 'text-neo-accent')}>
          {track.title}
        </p>
        <p className="text-xs text-neo-muted truncate">{track.artist}</p>
      </button>

      <div className="relative">
        <button
          onClick={() => setMenuId(menuId === track.id ? null : track.id)}
          className="p-2 text-neo-muted hover:text-white opacity-60 group-hover:opacity-100 transition"
        >
          <MoreHorizontal size={18} />
        </button>
        {menuId === track.id && (
          <TrackMenu
            onClose={() => setMenuId(null)}
            onAdd={() => {
              addToQueue(track)
              setMenuId(null)
            }}
            onNext={() => {
              playNext(track)
              setMenuId(null)
            }}
            onPlay={() => {
              playTrack(track)
              setMenuId(null)
            }}
          />
        )}
      </div>
    </div>
  )
}

function TrackMenu({
  onClose,
  onAdd,
  onNext,
  onPlay,
}: {
  onClose: () => void
  onAdd: () => void
  onNext: () => void
  onPlay: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 bottom-full mb-1 z-50 w-48 rounded-xl bg-neo-elevated border border-neo-border shadow-neo py-1 overflow-hidden">
        <button
          onClick={onPlay}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-neo-card transition"
        >
          <Play size={16} /> Играть
        </button>
        <button
          onClick={onNext}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-neo-card transition"
        >
          <ListEnd size={16} /> Играть следующим
        </button>
        <button
          onClick={onAdd}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-neo-card transition"
        >
          <ListPlus size={16} /> В очередь
        </button>
      </div>
    </>
  )
}
