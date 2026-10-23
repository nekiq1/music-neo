import { X } from 'lucide-react'
import { usePlayer } from '@/stores/player'
import { cn } from '@/lib/utils'
import type { Quality } from '@/types'

const QUALITIES: { id: Quality; label: string; desc: string }[] = [
  { id: 'auto', label: 'Авто', desc: 'Оптимально для сети' },
  { id: 'high', label: 'Высокое', desc: 'Лучшее качество' },
  { id: 'medium', label: 'Среднее', desc: 'Баланс' },
  { id: 'low', label: 'Экономия', desc: 'Меньше трафика' },
]

export function SettingsPanel() {
  const { showSettings, setShowSettings, settings, setQuality, setVolume } = usePlayer()

  if (!showSettings) return null

  return (
    <div className="fixed inset-0 z-[60] bg-neo-bg/95 backdrop-blur-xl flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neo-border pt-[calc(var(--safe-top)+12px)]">
        <p className="font-display font-semibold">Настройки</p>
        <button onClick={() => setShowSettings(false)} className="p-2 rounded-full bg-neo-elevated">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
        <section>
          <h3 className="text-xs font-medium text-neo-muted uppercase tracking-wider mb-3">Качество звука</h3>
          <div className="space-y-2">
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={cn(
                  'w-full flex items-center justify-between p-3.5 rounded-2xl border transition',
                  settings.quality === q.id
                    ? 'border-neo-accent bg-neo-accent/10'
                    : 'border-neo-border bg-neo-card hover:border-neo-muted'
                )}
              >
                <div className="text-left">
                  <p className="text-sm font-medium">{q.label}</p>
                  <p className="text-xs text-neo-muted">{q.desc}</p>
                </div>
                {settings.quality === q.id && (
                  <div className="w-2.5 h-2.5 rounded-full bg-neo-accent" />
                )}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-xs font-medium text-neo-muted uppercase tracking-wider mb-3">Громкость</h3>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={settings.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-neo-muted mt-1">{Math.round(settings.volume * 100)}%</p>
        </section>

        <section className="pt-4 border-t border-neo-border">
          <p className="text-xs text-neo-muted leading-relaxed">
            Music Neo использует только треки с лицензией CC0 (public domain).
            Источник: Open Lo-Fi. Никакой рекламы, никакого трекинга.
          </p>
        </section>
      </div>
    </div>
  )
}
