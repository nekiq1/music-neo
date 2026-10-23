export interface Track {
  id: string
  title: string
  artist: string
  category: string
  url: string
  cover?: string
  duration?: number
  lyrics?: LyricLine[]
}

export interface LyricLine {
  time: number // seconds
  text: string
}

export type RepeatMode = 'off' | 'all' | 'one'
export type Quality = 'auto' | 'high' | 'medium' | 'low'

export interface PlayerSettings {
  quality: Quality
  crossfade: boolean
  normalize: boolean
  volume: number
}
