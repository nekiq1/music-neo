import { X, Trash2, GripVertical } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { cn } from '@/lib/utils'

export function QueuePanel() {
  const { showQueue, setShowQueue, queue, currentIndex, playTrack, removeFromQueue } = usePlayer()

  if (!showQueue) return null

  return (
    <div className="fixed inset-0 z-[60] bg-neo-bg/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neo-border pt-[calc(var(--safe-top)+12px)]">
        <p className="font-display font-semibold">Очередь · {queue.length}</p>
        <button onClick={() => setShowQueue(false)} className="p-2 rounded-full bg-neo-elevated">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 pb-24">
        {queue.map((track, i) => (
          <div
            key={`${track.id}-${i}`}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-2xl',
              i === currentIndex ? 'bg-neo-elevated' : 'hover:bg-neo-card'
            )}
          >
            <GripVertical size={16} className="text-neo-muted shrink-0" />
            <button onClick={() => playTrack(track)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
              <img src={track.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className={cn('text-sm font-medium truncate', i === currentIndex && 'text-neo-accent')}>
                  {track.title}
                </p>
                <p className="text-xs text-neo-muted truncate">{track.artist}</p>
              </div>
            </button>
            {i !== currentIndex && (
              <button
                onClick={() => removeFromQueue(i)}
                className="p-2 text-neo-muted hover:text-red-400 transition"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
