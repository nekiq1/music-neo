import { Waves, Sparkles } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { TRACKS } from '@/lib/tracks'

/** Placeholder for future AI "My Wave" (Yandex Music style). For now: smart mix from library. */
export function MyWave() {
  const { setQueue, play } = usePlayer()

  const startWave = () => {
    // Simple "smart" mix: shuffle + prefer tracks with lyrics / varied categories
    const mix = [...TRACKS].sort(() => Math.random() - 0.5)
    setQueue(mix, 0)
    play()
  }

  return (
    <button
      onClick={startWave}
      className="mx-4 mb-3 w-[calc(100%-2rem)] flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-neo-accent/20 via-neo-pink/10 to-transparent border border-neo-border/60 hover:border-neo-accent/40 transition text-left group"
    >
      <div className="w-11 h-11 rounded-xl bg-neo-accent/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
        <Waves size={22} className="text-neo-accent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold font-display flex items-center gap-1.5">
          Моя волна
          <Sparkles size={12} className="text-neo-accent" />
        </p>
        <p className="text-[11px] text-neo-muted">Умный микс · скоро с AI</p>
      </div>
    </button>
  )
}
