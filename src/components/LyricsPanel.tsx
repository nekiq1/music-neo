import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { cn } from '@/lib/utils'

export function LyricsPanel() {
  const { showLyrics, setShowLyrics, queue, currentIndex, currentTime } = usePlayer()
  const track = queue[currentIndex]
  const activeRef = useRef<HTMLDivElement>(null)

  const lyrics = track?.lyrics ?? []

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentTime])

  if (!showLyrics) return null

  let activeIdx = -1
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) activeIdx = i
    else break
  }

  return (
    <div className="fixed inset-0 z-[60] bg-neo-bg/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neo-border pt-[calc(var(--safe-top)+12px)]">
        <div>
          <p className="font-display font-semibold">{track?.title}</p>
          <p className="text-xs text-neo-muted">{track?.artist}</p>
        </div>
        <button onClick={() => setShowLyrics(false)} className="p-2 rounded-full bg-neo-elevated">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-12 text-center">
        {lyrics.length === 0 ? (
          <p className="text-neo-muted mt-20">Нет синхронизированного текста для этого трека</p>
        ) : (
          lyrics.map((line, i) => (
            <div
              key={i}
              ref={i === activeIdx ? activeRef : undefined}
              className={cn(
                'lyrics-line text-xl md:text-2xl font-display py-3 transition-all',
                i === activeIdx && 'active text-neo-accent scale-105',
                i < activeIdx && 'past',
                i > activeIdx && 'future'
              )}
            >
              {line.text}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
