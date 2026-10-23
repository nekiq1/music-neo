import { create } from 'zustand'
import type { Track, RepeatMode, PlayerSettings } from '@/types'
import { TRACKS } from '@/lib/tracks'

interface PlayerState {
  queue: Track[]
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  repeat: RepeatMode
  shuffle: boolean
  settings: PlayerSettings
  showLyrics: boolean
  showQueue: boolean
  showSettings: boolean
  category: string

  // actions
  setQueue: (tracks: Track[], startIndex?: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (t: number) => void
  setCurrentTime: (t: number) => void
  setDuration: (d: number) => void
  addToQueue: (track: Track) => void
  playNext: (track: Track) => void
  removeFromQueue: (index: number) => void
  setRepeat: (m: RepeatMode) => void
  toggleShuffle: () => void
  setVolume: (v: number) => void
  setQuality: (q: PlayerSettings['quality']) => void
  setShowLyrics: (v: boolean) => void
  setShowQueue: (v: boolean) => void
  setShowSettings: (v: boolean) => void
  setCategory: (c: string) => void
  playTrack: (track: Track) => void
}

export const usePlayer = create<PlayerState>((set, get) => ({
  queue: TRACKS,
  currentIndex: 0,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  repeat: 'all',
  shuffle: false,
  settings: {
    quality: 'auto',
    crossfade: false,
    normalize: true,
    volume: 0.8,
  },
  showLyrics: false,
  showQueue: false,
  showSettings: false,
  category: 'all',

  setQueue: (tracks, startIndex = 0) =>
    set({ queue: tracks, currentIndex: startIndex, currentTime: 0 }),

  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),

  next: () => {
    const { queue, currentIndex, repeat, shuffle } = get()
    if (queue.length === 0) return
    if (repeat === 'one') {
      set({ currentTime: 0, isPlaying: true })
      return
    }
    let nextIdx: number
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length)
    } else {
      nextIdx = currentIndex + 1
      if (nextIdx >= queue.length) {
        if (repeat === 'all') nextIdx = 0
        else {
          set({ isPlaying: false })
          return
        }
      }
    }
    set({ currentIndex: nextIdx, currentTime: 0, isPlaying: true })
  },

  prev: () => {
    const { currentTime, currentIndex, queue } = get()
    if (currentTime > 3) {
      set({ currentTime: 0 })
      return
    }
    const prevIdx = currentIndex <= 0 ? queue.length - 1 : currentIndex - 1
    set({ currentIndex: prevIdx, currentTime: 0, isPlaying: true })
  },

  seek: (t) => set({ currentTime: t }),
  setCurrentTime: (t) => set({ currentTime: t }),
  setDuration: (d) => set({ duration: d }),

  addToQueue: (track) =>
    set((s) => ({ queue: [...s.queue, track] })),

  playNext: (track) =>
    set((s) => {
      const q = [...s.queue]
      q.splice(s.currentIndex + 1, 0, track)
      return { queue: q }
    }),

  removeFromQueue: (index) =>
    set((s) => {
      const q = s.queue.filter((_, i) => i !== index)
      let idx = s.currentIndex
      if (index < s.currentIndex) idx--
      if (idx >= q.length) idx = Math.max(0, q.length - 1)
      return { queue: q, currentIndex: idx }
    }),

  setRepeat: (m) => set({ repeat: m }),
  toggleShuffle: () => set((s) => ({ shuffle: !s.shuffle })),
  setVolume: (v) =>
    set((s) => ({ settings: { ...s.settings, volume: v } })),
  setQuality: (q) =>
    set((s) => ({ settings: { ...s.settings, quality: q } })),
  setShowLyrics: (v) => set({ showLyrics: v }),
  setShowQueue: (v) => set({ showQueue: v }),
  setShowSettings: (v) => set({ showSettings: v }),
  setCategory: (c) => set({ category: c }),

  playTrack: (track) => {
    const { queue } = get()
    const idx = queue.findIndex((t) => t.id === track.id)
    if (idx >= 0) {
      set({ currentIndex: idx, currentTime: 0, isPlaying: true })
    } else {
      set({
        queue: [...queue, track],
        currentIndex: queue.length,
        currentTime: 0,
        isPlaying: true,
      })
    }
  },
}))

export const currentTrack = () => {
  const { queue, currentIndex } = usePlayer.getState()
  return queue[currentIndex] ?? null
}
