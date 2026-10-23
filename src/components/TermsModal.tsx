import { X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

export function TermsModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-neo-surface border border-neo-border p-5 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">Пользовательское соглашение</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neo-elevated">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 text-sm text-neo-muted leading-relaxed">
          <section>
            <h3 className="text-neo-text font-semibold mb-1">1. О сервисе</h3>
            <p>
              Music Neo — бесплатный веб-плеер и Telegram Mini App для прослушивания
              музыки, распространяемой под свободными лицензиями (в первую очередь CC0 —
              общественное достояние). Сервис не является стриминговой платформой
              коммерческой музыки.
            </p>
          </section>

          <section>
            <h3 className="text-neo-text font-semibold mb-1">2. Авторские права</h3>
            <p>
              Все треки в каталоге либо находятся в общественном достоянии (CC0), либо
              предоставлены с явным разрешением на свободное использование. Пользователь
              не вправе загружать или воспроизводить через сервис защищённый авторским
              правом контент без соответствующих прав.
            </p>
          </section>

          <section>
            <h3 className="text-neo-text font-semibold mb-1">3. Данные и приватность</h3>
            <p>
              При работе через Telegram Mini App используются данные профиля Telegram
              (id, имя, аватар) только для отображения профиля и опциональной синхронизации
              настроек. Мы не продаём персональные данные. История и избранное могут
              храниться локально или в базе (Supabase) по вашему выбору.
            </p>
          </section>

          <section>
            <h3 className="text-neo-text font-semibold mb-1">4. Безопасность</h3>
            <p>
              Рекомендуется не вводить пароли и платёжные данные в сторонних формах.
              Платежи (если появятся) — только через официальные механизмы Telegram Stars
              или проверенные платёжные системы. Исходный код открыт для аудита.
            </p>
          </section>

          <section>
            <h3 className="text-neo-text font-semibold mb-1">5. Ограничение ответственности</h3>
            <p>
              Сервис предоставляется «как есть». Мы не гарантируем бесперебойную работу
              и не несём ответственности за косвенные убытки. Использование на свой страх
              и риск.
            </p>
          </section>

          <section>
            <h3 className="text-neo-text font-semibold mb-1">6. Контакты</h3>
            <p>
              По вопросам лицензий и жалоб: через бота или issues репозитория проекта.
            </p>
          </section>

          <p className="text-[11px] pt-2 border-t border-neo-border">
            Версия 1.0 · 2026 · Music Neo. Соответствует законодательству РФ в части
            использования произведений, перешедших в общественное достояние / CC0.
          </p>
        </div>
      </div>
    </div>
  )
}
