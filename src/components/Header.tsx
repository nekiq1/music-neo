import { User, ListMusic, Mic2, Settings2 } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { isTelegram, getTelegramUser } from '@/lib/utils'

export function Header() {
  const { setShowQueue, setShowLyrics, setShowSettings } = usePlayer()
  const tgUser = getTelegramUser()
  const inTg = isTelegram()

  return (
    <header className="flex items-center justify-between px-4 py-3 pt-[calc(var(--safe-top)+12px)] shrink-0">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">
          Music<span className="text-neo-accent">Neo</span>
        </h1>
        <p className="text-[11px] text-neo-muted">
          {inTg ? 'Telegram Mini App' : 'Free CC0 · Lo-fi & Ambient'}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <button onClick={() => setShowLyrics(true)} className="p-2.5 rounded-full hover:bg-neo-elevated transition sm:hidden">
          <Mic2 size={18} className="text-neo-muted" />
        </button>
        <button onClick={() => setShowQueue(true)} className="p-2.5 rounded-full hover:bg-neo-elevated transition sm:hidden">
          <ListMusic size={18} className="text-neo-muted" />
        </button>
        <button onClick={() => setShowSettings(true)} className="p-2.5 rounded-full hover:bg-neo-elevated transition sm:hidden">
          <Settings2 size={18} className="text-neo-muted" />
        </button>
        <div className="ml-1 w-9 h-9 rounded-full bg-neo-elevated border border-neo-border flex items-center justify-center overflow-hidden">
          {tgUser?.photo_url ? (
            <img src={tgUser.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User size={16} className="text-neo-muted" />
          )}
        </div>
      </div>
    </header>
  )
}
