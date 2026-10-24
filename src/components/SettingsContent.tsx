import { LuAudioLines, LuCheck, LuMoon, LuMonitor, LuSend, LuSparkles, LuSun, LuVibrate, LuWand, LuZap, LuMicVocal, LuSearch } from 'react-icons/lu';
import { cfgStore } from '@/lib/appConfig';
import { cn } from '@/lib/cn';
import { effectiveQuality, QUALITY_META, settings, updateSettings, useSettings, sourceOn } from '@/lib/settings';
import type { Quality } from '@/lib/types';
import { SOURCE_META } from './SourceBadge';
import { Group, Segmented, SettingRow, Switch } from './ui/controls';

const Q_ORDER: Quality[] = ['auto', 'high', 'medium', 'low'];
const KIND_LABEL = { full: 'полные треки', preview: 'фрагменты 30 с', embed: 'через встроенный плеер' } as const;

export function SettingsContent() {
  const s = useSettings(x => x);
  const cfg = cfgStore.use(x => x.cfg);
  const eff = effectiveQuality(s.quality);
  const effLabel = { high: 'Высокое', medium: 'Среднее', low: 'Экономия' }[eff];

  return (
    <div>
      <Group
        title="Качество"
        hint={s.quality === 'auto' ? `Сейчас по сети выбрано: «${effLabel}». Влияет на размер обложек, предзагрузку и поток SoundCloud/Audius.` : 'Реальный битрейт переключается у Яндекс Музыки. У Deezer, iTunes, Audius и SoundCloud сервис отдаёт один поток, у Spotify играет встроенный плеер. Для всех источников меняются обложки, предзагрузка и эффекты.'}
      >
        {Q_ORDER.map(q => (
          <button
            key={q} type="button" role="radio" aria-checked={s.quality === q}
            onClick={() => updateSettings({ quality: q })}
            className="press flex w-full items-center gap-3 py-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15.5px] font-semibold">{QUALITY_META[q].label}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{QUALITY_META[q].desc}</span>
            </span>
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full border transition-colors', s.quality === q ? 'border-accent bg-accent text-on-accent' : 'border-[var(--line)] text-transparent')}>
              <LuCheck size={14} strokeWidth={3} />
            </span>
          </button>
        ))}
      </Group>

      <Group title="Оформление">
        <div className="py-3">
          <Segmented
            label="Тема" value={s.theme} onChange={theme => updateSettings({ theme })}
            options={[
              { id: 'auto', label: <><LuMonitor size={15} />Авто</> },
              { id: 'dark', label: <><LuMoon size={15} />Тёмная</> },
              { id: 'light', label: <><LuSun size={15} />Светлая</> },
            ]}
          />
        </div>
        <div className="py-3">
          <SettingRow icon={<LuSparkles size={18} />} title="Эффекты Liquid Glass" desc="Размытие и анимированный фон. «Лёгкие» экономят батарею на слабых телефонах." />
          <Segmented label="Эффекты" className="mt-1" value={s.lite} onChange={lite => updateSettings({ lite })} options={[{ id: 'auto', label: 'Авто' }, { id: 'off', label: 'Все эффекты' }, { id: 'on', label: 'Лёгкие' }]} />
        </div>
        <SettingRow icon={<LuVibrate size={18} />} title="Тактильный отклик" desc="Лёгкая вибрация при нажатиях" right={<Switch label="Тактильный отклик" checked={s.haptics} onChange={haptics => updateSettings({ haptics })} />} />
        <SettingRow icon={<LuMicVocal size={18} />} title="Тексты песен" desc="Открывать текст сразу вместе с плеером" right={<Switch label="Тексты сразу" checked={s.autoLyrics} onChange={autoLyrics => updateSettings({ autoLyrics })} />} />
      </Group>

      <Group title="Источники музыки" hint="Deezer, iTunes и Audius работают без ключей. Spotify, SoundCloud и Яндекс Музыка появляются, когда владелец сервера добавил ключи в .env.">
        {(cfg?.sources || []).map(src => {
          const m = SOURCE_META[src.id];
          return (
            <SettingRow
              key={src.id}
              icon={<m.Icon size={18} />}
              title={m.label}
              desc={src.enabled ? `${KIND_LABEL[src.kind]}${src.note ? ` · ${src.note}` : ''}` : 'Не подключён на сервере'}
              right={<Switch label={m.label} disabled={!src.enabled} checked={src.enabled && sourceOn(s, src.id)} onChange={v => settings.set(st => ({ sources: { ...st.sources, [src.id]: v }, updatedAt: Date.now() }))} />}
            />
          );
        })}
        <SettingRow
          icon={<LuWand size={18} />} title="Подбирать аудио для Spotify и Яндекса"
          desc="У этих сервисов нет открытого потока: ищем тот же трек в Deezer/Audius/iTunes."
          right={<Switch label="Подбирать аудио" checked={s.resolve} onChange={resolve => updateSettings({ resolve })} />}
        />
      </Group>

      <Group title="Бот-загрузчик" hint="Кнопка «Скачать через бота» копирует ссылку на трек и открывает этого бота в Telegram.">
        <SettingRow
          icon={<LuSend size={18} />} title="Username бота" desc="Без символа @"
          right={
            <span className="flex items-center rounded-xl bg-[var(--chip)] pl-2.5 text-muted">@
              <input
                aria-label="Username бота-загрузчика" value={s.loaderBot} maxLength={32} autoCapitalize="off" autoCorrect="off" spellCheck={false}
                onChange={e => updateSettings({ loaderBot: e.target.value.replace(/[^\w]/g, '') })}
                className="h-9 w-[118px] bg-transparent px-1.5 text-[15px] text-fg outline-none"
              />
            </span>
          }
        />
      </Group>
      <p className="px-2 pb-2 text-center text-[12px] text-faint"><LuZap className="mr-1 inline -translate-y-px" size={12} /><LuAudioLines className="mr-1 inline -translate-y-px" size={12} /><LuSearch className="mr-1 inline -translate-y-px" size={12} />Neo Music {cfg?.version ? `v${cfg.version}` : ''}</p>
    </div>
  );
}
