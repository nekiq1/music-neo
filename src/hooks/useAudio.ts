import { useEffect, useRef } from 'react'
import { usePlayer } from '@/stores/player'
import { getPlayableUrl } from '@/lib/tracks'

export function useAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastTrackId = useRef<string | null>(null)
  const {
    queue,
    currentIndex,
    isPlaying,
    settings,
    currentTime,
    next,
    setCurrentTime,
    setDuration,
    seek,
  } = usePlayer()

  const track = queue[currentIndex]

  // Create audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => {
      // only advance when track actually finished
      next()
    }
    // Never auto-skip on error — that caused random track switching
    const onError = () => {
      console.warn('[MusicNeo] audio error:', audio.src)
      setDuration(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load track only when id changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (lastTrackId.current === track.id) return
    lastTrackId.current = track.id

    const url = getPlayableUrl(track)
    audio.pause()
    audio.src = url
    audio.load()
    setCurrentTime(0)
    setDuration(0)

    if (isPlaying) {
      audio.play().catch(() => {
        // autoplay policy — user must click play
      })
    }
  }, [track?.id]) // intentionally NOT depending on isPlaying to avoid reload loops

  // Play / pause only
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    if (isPlaying) {
      if (audio.src && audio.paused) {
        audio.play().catch(() => {})
      }
    } else {
      audio.pause()
    }
  }, [isPlaying, track?.id])

  // Volume
  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.volume = Math.max(0, Math.min(1, settings.volume))
  }, [settings.volume])

  // External seek from slider
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (Math.abs(audio.currentTime - currentTime) > 1.5) {
      try {
        audio.currentTime = currentTime
      } catch {
        /* ignore */
      }
    }
  }, [currentTime])

  // Media Session
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist,
      artwork: track.cover
        ? [{ src: track.cover, sizes: '400x400', type: 'image/png' }]
        : [],
    })
    navigator.mediaSession.setActionHandler('play', () => usePlayer.getState().play())
    navigator.mediaSession.setActionHandler('pause', () => usePlayer.getState().pause())
    navigator.mediaSession.setActionHandler('previoustrack', () => usePlayer.getState().prev())
    navigator.mediaSession.setActionHandler('nexttrack', () => usePlayer.getState().next())
  }, [track?.id])

  return {
    seek: (t: number) => {
      if (audioRef.current) {
        try {
          audioRef.current.currentTime = t
        } catch {
          /* ignore */
        }
      }
      seek(t)
    },
  }
}
