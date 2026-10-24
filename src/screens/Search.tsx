import { useEffect, useRef, useState } from 'react';
import { LuHistory, LuSearch, LuSearchX, LuWifiOff, LuX } from 'react-icons/lu';
import { search } from '@/lib/api';
import { cfgStore, keyToList, useSourcesKey } from '@/lib/appConfig';
import { cn } from '@/lib/cn';
import { tkey } from '@/lib/format';
import { clearSearches, pushSearch, useLib } from '@/lib/library';
import { playList } from '@/lib/player';
import { tap } from '@/lib/settings';
import { ui, useUI } from '@/lib/ui';
import type { SourceId, Track } from '@/lib/types';
import { Empty, RowsSkeleton, ScreenHeader } from '@/components/Section';
import { SOURCE_META } from '@/components/SourceBadge';
import { TrackRow } from '@/components/TrackRow';

export function SearchScreen() {
  const key = useSourcesKey();
  const cfg = cfgStore.use(s => s.cfg);
  const q = useUI(s => s.query);
  const active = useUI(s => s.tab === 'search');
  const searches = useLib(s => s.searches);
  const [only, setOnly] = useState<SourceId | ''>('');
  const [items, setItems] = useState<Track[] | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const term = q.trim();

  useEffect(() => { if (active && !term) input.current?.focus({ preventScroll: true }); }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (term.length < 2 || !key) { setItems(null); setError(''); setLoading(false); return; }
    const ac = new AbortController();
    setLoading(true); setError('');
    const t = setTimeout(() => {
      search(term, only ? [only] : keyToList(key), ac.signal)
        .then(r => { setItems(r.items); setFailed(r.failed.map(f => SOURCE_META[f.id]?.label || f.id)); setLoading(false); })
        .catch(e => { if ((e as Error).name === 'AbortError') return; setError((e as Error).message); setItems(null); setLoading(false); });
    }, 380);
    return () => { clearTimeout(t); ac.abort(); };
  }, [term, key, only]);

  const submit = (e: React.FormEvent) => { e.preventDefault(); pushSearch(term); input.current?.blur(); };
  const sources = (cfg?.sources || []).filter(s => keyToList(key).includes(s.id));

  return (
    <div className="scroll h-full pb-[calc(var(--dock)+var(--mini-h)+28px)] md:pb-[calc(var(--mini-h)+40px)]">
      <ScreenHeader title="Поиск" />
      <div className="px-5">
        <form onSubmit={submit} role="search" className="glass sticky top-2 z-10 flex h-[54px] items-center gap-3 rounded-full pl-5 pr-2">
          <LuSearch size={20} className="shrink-0 text-muted" aria-hidden />
          <input
            ref={input} value={q} onChange={e => ui.set({ query: e.target.value })}
            type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
            placeholder="Треки, исполнители, альбомы" aria-label="Поиск музыки"
            className="min-w-0 flex-1 bg-transparent py-3 outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button type="button" aria-label="Очистить" onClick={() => { ui.set({ query: '' }); input.current?.focus(); }} className="press grid size-9 place-items-center rounded-full bg-[var(--chip)] text-muted">
              <LuX size={16} />
            </button>
          )}
        </form>

        {sources.length > 1 && (
          <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Источник">
            {[{ id: '' as const, label: 'Все' }, ...sources.map(s => ({ id: s.id, label: s.label }))].map(o => (
              <button
                key={o.id || 'all'} role="radio" aria-checked={only === o.id} onClick={() => { tap('select'); setOnly(o.id as SourceId | ''); }}
                className={cn('press h-9 shrink-0 rounded-full px-4 text-[13.5px] font-semibold', only === o.id ? 'bg-accent text-on-accent' : 'glass-chip text-muted')}
              >{o.label}</button>
            ))}
          </div>
        )}

        <div className="mt-4">
          {loading && !items && <RowsSkeleton />}
          {error && <Empty icon={<LuWifiOff />} title="Ошибка поиска" text={error} />}
          {!error && term.length >= 2 && items && (
            items.length ? (
              <div className={cn('-mx-2 transition-opacity', loading && 'opacity-50')}>
                {items.map((t, i) => <TrackRow key={tkey(t)} track={t} onPlay={() => { pushSearch(term); playList(items, i); }} />)}
                {failed.length > 0 && <p className="px-3 pt-3 text-[12.5px] text-faint">Не ответили: {failed.join(', ')}</p>}
              </div>
            ) : <Empty icon={<LuSearchX />} title="Ничего не найдено" text={`По запросу «${term}» нет результатов. Попробуйте другое название или включите больше источников в настройках.`} />
          )}
          {term.length < 2 && (
            searches.length ? (
              <section className="rise">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.08em] text-faint">Недавние запросы</h2>
                  <button type="button" onClick={clearSearches} className="text-[13px] font-semibold text-accent">Очистить</button>
                </div>
                {searches.map(s => (
                  <button key={s} type="button" onClick={() => ui.set({ query: s })} className="press flex h-12 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-[var(--chip)]">
                    <LuHistory size={18} className="text-faint" /><span className="truncate text-[16px]">{s}</span>
                  </button>
                ))}
              </section>
            ) : <Empty icon={<LuSearch />} title="Найдите что угодно" text="Ищем сразу в Deezer, Audius, iTunes и других подключённых сервисах. Нажмите на трек, чтобы слушать." />
          )}
        </div>
      </div>
    </div>
  );
}
