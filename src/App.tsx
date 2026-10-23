import { useEffect, useState } from 'react'
import { Header } from '@/components/Header'
import { TrackList } from '@/components/TrackList'
import { PlayerBar } from '@/components/PlayerBar'
import { LyricsPanel } from '@/components/LyricsPanel'
import { QueuePanel } from '@/components/QueuePanel'
import { SettingsPanel } from '@/components/SettingsPanel'
import { InstallPrompt } from '@/components/InstallPrompt'
import { MyWave } from '@/components/MyWave'
import { TermsModal } from '@/components/TermsModal'

export default function App() {
  const [termsOpen, setTermsOpen] = useState(false)

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      tg.setHeaderColor('#0a0a0f')
      tg.setBackgroundColor('#0a0a0f')
      try {
        tg.disableVerticalSwipes?.()
      } catch {}
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-neo-bg relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-neo-accent/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-neo-pink/5 blur-[80px]" />

      <InstallPrompt />
      <Header />
      <MyWave />
      <main className="flex-1 min-h-0">
        <TrackList />
      </main>
      <footer className="px-4 py-2 text-center shrink-0">
        <button
          onClick={() => setTermsOpen(true)}
          className="text-[10px] text-neo-muted hover:text-neo-text transition"
        >
          Пользовательское соглашение · CC0 музыка
        </button>
      </footer>
      <PlayerBar />
      <LyricsPanel />
      <QueuePanel />
      <SettingsPanel />
      <TermsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
    </div>
  )
}
