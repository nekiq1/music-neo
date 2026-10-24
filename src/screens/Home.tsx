import { useEffect, useMemo, useState } from 'react';
import { LuCircleAlert, LuHistory, LuPlay, LuRefreshCw, LuSettings, LuWifiOff } from 'react-icons/lu';
import { home, search } from '@/lib/api';
import { cfgStore, keyToList, loadConfig, useSourcesKey } from '@/lib/appConfig';
import { tkey } from '@/lib/format';
import { useLib } from '@/lib/library';
import { playList, usePlayer } from '@/lib/player';
import { tgUser } from '@/lib/tg';
import { openNow, openSettings } from '@/lib/ui';
import type { Section as Sec, Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { CardsSkeleton, Empty, RowsSkeleton, ScreenHeader, Section } from '@/components/Section';
import { TrackCard } from '@/components/TrackCard';
import { TrackRow } from '@/components/TrackRow';
import { Button } from '@/components/ui/button';

const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? 'Доброй ночи' : h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер';
};

function useRecs(sources: string) {
  const favs = useLib(s => s.favs);
  const artists = useMemo(() => {
    const a: string[] = [];
    for (const f of favs) { const n = (f.artist || '').split(',')[0].trim(); if (n && !a.includes(n)) a.push(n); if (a.length === 2) break; }
    return a.join('|');
  }, [favs]);
  const [recs, setRecs] = useState<Track[]>([]);
  useEffect(() => {
    if (!artists || !sources) { setRecs([]); return; }
    const ac = new AbortController();
    Promise.all(artists.split('|').map(a => search(a, keyToList(sources), ac.signal).then(r => r.items).catch(() => [] as Track[])))
      .then(lists => {
        const have = new Set(favs.map(tkey)), seen = new Set<string>(), out: Track[] = [];
        for (let i = 0; out.length < 20 && lists.some(l => l[i]); i++) for (const l of lists) {
          const t = l[i];
          if (t && !have.has(tkey(t)) && !seen.has(tkey(t))) { seen.add(tkey(t)); out.push(t); }
        }
        if (!ac.signal.aborted) setRecs(out);
      });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artists, sources]);
  return recs;
}

export function Home() {
  const key = useSourcesKey();
  const cfgLoading = cfgStore.use(s => s.loading);
  const cfgError = cfgStore.use(s => s.error);
  const recent = useLib(s => s.recent);
  const current = usePlayer(s => s.current);
  const playing = usePlayer(s => s.playing);
  const [sections, setSections] = useState<Sec[] | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const recs = useRecs(key);
  const name = tgUser()?.first_name;

  useEffect(() => {
    if (!key) return;
    const ac = new AbortController();
    setError('');
    home(keyToList(key), ac.signal)
      .then(r => setSections(r.sections))
      .catch(e => { if ((e as Error).name !== 'AbortError') setError((e as Error).message); });
    return () => ac.abort();
  }, [key, tick]);

  const resume = current || recent[0] || null;
  const play = (list: Track[], i: number) => playList(list, i);

  let body;
  if (cfgError) body = <Empty icon={<LuWifiOff />} title="Нет связи с сервером" text={cfgError} action={<Button variant="solid" onClick={loadConfig}><LuRefreshCw size={17} />Повторить</Button>} />;
  else if (cfgLoading || (!sections && !error && key)) body = <><CardsSkeleton /><div className="mt-6"><RowsSkeleton n={5} /></div></>;
  else if (!key) body = <Empty icon={<LuCircleAlert />} title="Все источники выключены" text="Включите хотя бы один источник в настройках." action={<Button variant="solid" onClick={openSettings}>Открыть настройки</Button>} />;
  else if (error && !sections) body = <Empty icon={<LuWifiOff />} title="Не удалось загрузить" text={error} action={<Button variant="solid" onClick={() => setTick(t => t + 1)}><LuRefreshCw size={17} />Повторить</Button>} />;
  else body = (
    <>
      {recent.length > 0 && (
        <Section title="Недавно слушали">
          <div className="hscroll">{recent.slice(0, 14).map((t, i) => <TrackCard key={tkey(t)} track={t} onPlay={() => play(recent, i)} />)}</div>
        </Section>
      )}
      {recs.length > 0 && (
        <Section title="Для вас">
          <div className="hscroll">{recs.map((t, i) => <TrackCard key={tkey(t)} track={t} onPlay={() => play(recs, i)} />)}</div>
        </Section>
      )}
      {sections?.map(s => s.items.length > 0 && (
        <Section key={s.id} title={s.title}>
          {s.layout === 'list'
            ? <div className="-mx-2">{s.items.slice(0, 10).map((t, i) => <TrackRow key={tkey(t)} track={t} index={i} onPlay={() => play(s.items, i)} />)}</div>
            : <div className="hscroll">{s.items.map((t, i) => <TrackCard key={tkey(t)} track={t} onPlay={() => play(s.items, i)} />)}</div>}
        </Section>
      ))}
      {sections && !sections.some(s => s.items.length) && <Empty icon={<LuHistory />} title="Пока пусто" text="Источники не вернули треки. Попробуйте поиск." />}
    </>
  );

  return (
    <div className="scroll h-full pb-[calc(var(--dock)+var(--mini-h)+28px)] md:pb-[calc(var(--mini-h)+40px)]">
      <ScreenHeader
        subtitle={greeting() + (name ? `, ${name}` : '')} title="Музыка"
        right={<Button variant="glass" size="icon" onClick={openSettings} aria-label="Настройки"><LuSettings size={20} /></Button>}
      />
      <div className="px-5 pt-3">
        {resume && (
          <button type="button" onClick={() => (current ? openNow() : play(recent, 0))} className="press glass rise mb-7 flex w-full items-center gap-4 rounded-[30px] p-3 pr-5 text-left">
            <Cover track={resume} size="md" className="size-[84px] shrink-0 rounded-[22px]" eager />
            <span className="min-w-0 flex-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-accent">{current ? (playing ? 'Сейчас играет' : 'На паузе') : 'Продолжить'}</span>
              <span className="mt-0.5 block truncate text-[19px] font-bold leading-tight">{resume.title}</span>
              <span className="block truncate text-[14px] text-muted">{resume.artist}</span>
            </span>
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-accent text-on-accent"><LuPlay size={20} className="ml-0.5 fill-current" /></span>
          </button>
        )}
        {body}
      </div>
    </div>
  );
}
