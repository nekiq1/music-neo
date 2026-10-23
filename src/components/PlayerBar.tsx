import {
  Play, Pause, SkipBack, SkipForward, ListMusic,
  Mic2, Settings2, Shuffle, Repeat, Repeat1, Volume2
} from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { formatTime, cn } from '@/lib/utils'
import { useAudio } from '@/hooks/useAudio'

export function PlayerBar() {
  const {
    queue, currentIndex, isPlaying, currentTime, duration,
    repeat, shuffle, settings, toggle, next, prev,
    setVolume, setRepeat, toggleShuffle,
    setShowQueue, setShowLyrics, setShowSettings,
  } = usePlayer()
  const { seek } = useAudio()
  const track = queue[currentIndex]

  if (!track) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-neo-border pb-[var(--safe-bottom)]">
      {/* Progress */}
      <div className="px-4 pt-2">
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full h-1"
          style={{
            background: `linear-gradient(to right, #1ed760 ${progress}%, #2a2a3a ${progress}%)`,
          }}
        />
        <div className="flex justify-between text-[10px] text-neo-muted mt-0.5 px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2">
        {/* Cover + info */}
        <img
          src={track.cover}
          alt=""
          className="w-12 h-12 rounded-xl object-cover shadow-neo shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate font-display">{track.title}</p>
          <p className="text-xs text-neo-muted truncate">{track.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleShuffle}
            className={cn('p-2 rounded-full transition', shuffle ? 'text-neo-accent' : 'text-neo-muted hover:text-white')}
          >
            <Shuffle size={16} />
          </button>
          <button onClick={prev} className="p-2 text-white hover:text-neo-accent transition">
            <SkipBack size={20} fill="currentColor" />
          </button>
          <button
            onClick={toggle}
            className="w-11 h-11 rounded-full bg-neo-accent text-neo-bg flex items-center justify-center shadow-glow hover:scale-105 transition"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
          </button>
          <button onClick={next} className="p-2 text-white hover:text-neo-accent transition">
            <SkipForward size={20} fill="currentColor" />
          </button>
          <button
            onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')}
            className={cn('p-2 rounded-full transition', repeat !== 'off' ? 'text-neo-accent' : 'text-neo-muted hover:text-white')}
          >
            {repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        {/* Extra */}
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={() => setShowLyrics(true)} className="p-2 text-neo-muted hover:text-white transition">
            <Mic2 size={18} />
          </button>
          <button onClick={() => setShowQueue(true)} className="p-2 text-neo-muted hover:text-white transition">
            <ListMusic size={18} />
          </button>
          <button onClick={() => setShowSettings(true)} className="p-2 text-neo-muted hover:text-white transition">
            <Settings2 size={18} />
          </button>
          <div className="flex items-center gap-1 w-24">
            <Volume2 size={14} className="text-neo-muted" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={settings.volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
