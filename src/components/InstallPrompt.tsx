import { useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { isTelegram } from '@/lib/utils'

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<any>(null)
  const [showIos, setShowIos] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isTelegram()) return
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone
    if (isIos && !isStandalone) setShowIos(true)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || isTelegram()) return null

  if (deferred) {
    return (
      <div className="fixed top-[calc(var(--safe-top)+12px)] left-3 right-3 z-40 glass rounded-2xl p-3 flex items-center gap-3 border border-neo-border shadow-neo">
        <div className="w-10 h-10 rounded-xl bg-neo-accent/20 flex items-center justify-center shrink-0">
          <Download size={20} className="text-neo-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Установить Music Neo</p>
          <p className="text-xs text-neo-muted">Быстрый доступ с домашнего экрана</p>
        </div>
        <button
          onClick={async () => {
            deferred.prompt()
            await deferred.userChoice
            setDeferred(null)
          }}
          className="px-3 py-1.5 rounded-full bg-neo-accent text-neo-bg text-xs font-semibold"
        >
          Добавить
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 text-neo-muted">
          <X size={16} />
        </button>
      </div>
    )
  }

  if (showIos) {
    return (
      <div className="fixed top-[calc(var(--safe-top)+12px)] left-3 right-3 z-40 glass rounded-2xl p-3 flex items-start gap-3 border border-neo-border shadow-neo">
        <div className="w-10 h-10 rounded-xl bg-neo-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Share size={20} className="text-neo-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">На экран «Домой»</p>
          <p className="text-xs text-neo-muted mt-0.5">
            Нажми <Share size={12} className="inline" /> «Поделиться» → «На экран „Домой“»
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="p-1 text-neo-muted">
          <X size={16} />
        </button>
      </div>
    )
  }

  return null
}
