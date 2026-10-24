import { LuHouse, LuLibrary, LuSearch, LuUserRound } from 'react-icons/lu';
import type { IconType } from 'react-icons';
import { cn } from '@/lib/cn';
import { next, toggle, usePlayer } from '@/lib/player';
import { LuPause, LuPlay, LuSkipForward } from 'react-icons/lu';
import { tap } from '@/lib/settings';
import { setTab, TABS, type Tab, openNow, useUI } from '@/lib/ui';
import { Cover } from './Cover';
import { Equalizer } from './TrackRow';

const ITEMS: Record<Tab, { label: string; Icon: IconType }> = {
  home: { label: 'Музыка', Icon: LuHouse },
  search: { label: 'Поиск', Icon: LuSearch },
  library: { label: 'Коллекция', Icon: LuLibrary },
  profile: { label: 'Профиль', Icon: LuUserRound },
};

/** Плавающий таб-бар (телефон) */
export function TabBar() {
  const tab = useUI(s => s.tab);
  const i = TABS.indexOf(tab);
  return (
    <nav className="tabbar glass flex p-[5px]" aria-label="Разделы">
      <span className="tab-indicator" aria-hidden style={{ width: `calc((100% - 10px) / ${TABS.length})`, left: 5, transform: `translateX(${i * 100}%)` }} />
      {TABS.map(t => {
        const { Icon, label } = ITEMS[t], on = t === tab;
        return (
          <button key={t} type="button" aria-current={on ? 'page' : undefined} onClick={() => { tap('select'); setTab(t); }}
            className={cn('press relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-full transition-colors', on ? 'text-fg' : 'text-muted')}>
            <Icon size={22} strokeWidth={on ? 2.4 : 2} /><span className="text-[10.5px] font-semibold leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Боковая панель (планшет / десктоп) */
export function Sidebar() {
  const tab = useUI(s => s.tab);
  return (
    <nav className="side glass" aria-label="Разделы">
      <p className="mb-4 flex items-center gap-2.5 px-3 text-[22px] font-extrabold tracking-tight">
        <img src="/icon.svg" alt="" className="size-8 rounded-[10px]" />Neo
      </p>
      {TABS.map(t => {
        const { Icon, label } = ITEMS[t];
        return <button key={t} type="button" className="nav-item" aria-current={t === tab ? 'page' : undefined} onClick={() => setTab(t)}><Icon size={21} />{label}</button>;
      })}
    </nav>
  );
}

/** Мини-плеер над таб-баром */
export function MiniPlayer() {
  const t = usePlayer(s => s.current);
  const playing = usePlayer(s => s.playing);
  const loading = usePlayer(s => s.loading);
  const mode = usePlayer(s => s.mode);
  const p = usePlayer(s => (s.dur ? Math.min(1, s.pos / s.dur) : 0));
  if (!t) return null;
  return (
    <div className="mini glass flex items-center gap-1 pl-2 pr-2" role="region" aria-label="Мини-плеер">
      <button type="button" onClick={() => openNow()} className="press flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Открыть плеер: ${t.title}`}>
        <Cover track={t} size="sm" className="size-[50px] shrink-0 rounded-[17px]" eager />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold leading-tight">{t.title}</span>
          <span className="block truncate text-[13px] text-muted">{loading ? 'Загрузка…' : t.artist}</span>
        </span>
        {playing && <Equalizer className="mr-1 text-accent" />}
      </button>
      {mode !== 'embed' && (
        <>
          <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={() => { tap('light'); toggle(); }} className="press grid size-11 place-items-center rounded-full">
            {playing ? <LuPause size={24} className="fill-current" /> : <LuPlay size={24} className="ml-0.5 fill-current" />}
          </button>
          <button type="button" aria-label="Следующий" onClick={() => { tap('light'); next(); }} className="press grid size-11 place-items-center rounded-full"><LuSkipForward size={22} className="fill-current" /></button>
        </>
      )}
      {mode === 'audio' && <div className="mini-progress" aria-hidden style={{ ['--p' as string]: p }}><i /></div>}
    </div>
  );
}
