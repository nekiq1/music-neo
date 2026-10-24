import { useEffect, useRef } from 'react';
import { LuChevronDown, LuEllipsis, LuHeart, LuListMusic, LuMicVocal, LuPause, LuPlay, LuRepeat, LuRepeat1, LuShuffle, LuSkipBack, LuSkipForward, LuTimer, LuVolume2 } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { applyAmbient, paletteFor, resetAmbient } from '@/lib/color';
import { fmtTime } from '@/lib/format';
import { toggleFav, useIsFav } from '@/lib/library';
import { shareLineCard } from '@/lib/lineCard';
import { useActiveLine, useLyrics } from '@/lib/lyrics';
import { cycleRepeat, next, player, prev, seek, setSleep, setVolume, toggle, toggleShuffle, usePlayer } from '@/lib/player';
import { tap, useSettings } from '@/lib/settings';
import { closeNow, openMenu, ui, useUI } from '@/lib/ui';
import { Cover, coverUrl } from './Cover';
import { Sheet } from './ui/sheet';
import { Range, Segmented } from './ui/controls';
import { SourceBadge } from './SourceBadge';
import { Button } from './ui/button';

/** Подтягивает цвета обложки в фон приложения. */
export function useAmbient() {
  const t = usePlayer(s => s.current);
  const id = t ? t.src + t.id : '';
  useEffect(() => {
    if (!t) { resetAmbient(); return; }
    let live = true;
    paletteFor(coverUrl(t, 'sm'), t.title + t.artist).then(p => { if (live) applyAmbient(p); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
}

function Progress() {
  const pos = usePlayer(s => s.pos), dur = usePlayer(s => s.dur), mode = usePlayer(s => s.mode);
  const drag = useRef<number | null>(null);
  const val = drag.current ?? pos;
  return (
    <div className="px-1">
      <Range label="Перемотка" value={val} max={dur || 1} step={0.1} disabled={mode !== 'audio' || !dur}
        onChange={v => { drag.current = v; player.set({ pos: v }); }}
        onCommit={v => { drag.current = null; seek(v); }} />
      <div className="-mt-1 flex justify-between text-[12px] font-medium tabular-nums text-muted"><span>{fmtTime(val)}</span><span>-{fmtTime(Math.max(0, dur - val))}</span></div>
    </div>
  );
}

function Lyrics() {
  const t = usePlayer(s => s.current);
  const L = useLyrics(t, true);
  const on = useActiveLine(L.lines);
  const box = useRef<HTMLDivElement>(null);
  const accent = 'var(--accent)';
  useEffect(() => {
    if (on < 0) return;
    box.current?.querySelector<HTMLElement>(`[data-i="${on}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [on]);
  if (!t) return null;
  if (L.status === 'loading') return <p className="px-6 py-16 text-center text-muted">Ищем текст…</p>;
  if (L.lines.length) return (
    <div ref={box} className="scroll fade-mask min-h-0 flex-1 px-7 py-10">
      {L.lines.map((l, i) => (
        <p key={i} data-i={i} data-on={i === on ? '' : undefined} data-past={i < on ? '' : undefined} onClick={() => seek(l.t)} className="lyr my-3 text-[30px] font-extrabold leading-[1.15] tracking-tight">{l.s || '♪'}</p>
      ))}
      <Button variant="glass" size="sm" className="my-8" onClick={() => shareLineCard(t, L.lines[Math.max(on, 0)]?.s || t.title, getComputedStyle(document.documentElement).getPropertyValue('--c1').trim() || '#9d8fff')}>Карточка строки</Button>
      <span className="hidden" style={{ color: accent }} />
    </div>
  );
  if (L.plain) return <div className="scroll fade-mask min-h-0 flex-1 whitespace-pre-wrap px-7 py-8 text-[19px] font-semibold leading-relaxed text-muted">{L.plain}</div>;
  return <p className="px-6 py-16 text-center text-muted">Для этого трека текст не найден.</p>;
}

export function NowPlaying() {
  const open = useUI(s => s.now);
  const view = useUI(s => s.nowView);
  const t = usePlayer(s => s.current);
  const playing = usePlayer(s => s.playing), loading = usePlayer(s => s.loading), mode = usePlayer(s => s.mode);
  const shuffle = usePlayer(s => s.shuffle), repeat = usePlayer(s => s.repeat), embed = usePlayer(s => s.embedUrl);
  const info = usePlayer(s => s.info), error = usePlayer(s => s.error), sleepAt = usePlayer(s => s.sleepAt);
  const vol = useSettings(s => s.volume);
  const fav = useIsFav(t);
  const autoLyrics = useSettings(s => s.autoLyrics);
  useEffect(() => { if (open && autoLyrics) ui.set({ nowView: 'lyrics' }); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open && !!t} onClose={closeNow} full label="Сейчас играет" z={60}>
      {t && (
        <div className="flex min-h-0 flex-1 flex-col px-6 pb-5">
          <div className="flex items-center justify-between pb-2">
            <Button variant="chip" size="icon-sm" onClick={closeNow} aria-label="Свернуть"><LuChevronDown size={20} /></Button>
            <SourceBadge src={t.src} className="px-2.5 py-1 text-[11.5px]" />
            <Button variant="chip" size="icon-sm" onClick={() => openMenu(t)} aria-label="Ещё"><LuEllipsis size={20} /></Button>
          </div>

          {view === 'lyrics' ? (
            <>
              <Lyrics />
            </>
          ) : mode === 'embed' ? (
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
              <Cover track={t} size="lg" className="mx-auto w-full max-w-[300px] rounded-[34px]" />
              <iframe title="Плеер сервиса" src={embed} allow="autoplay; encrypted-media" className="h-[152px] w-full rounded-3xl border-0" />
              <p className="text-center text-[12.5px] text-faint">{info?.note}</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center py-3">
              <div className={cn('w-full max-w-[min(100%,46dvh)] transition-transform duration-700 ease-[var(--ease-ios)]', !playing && 'scale-[0.86]')}>
                <Cover track={t} size="lg" eager className="w-full rounded-[38px] shadow-[0_30px_60px_-20px_rgba(0,0,0,.7)]" />
              </div>
            </div>
          )}

          <div className="pt-2">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[24px] font-extrabold leading-tight tracking-tight">{t.title}</p>
                <p className="truncate text-[17px] text-muted">{t.artist}</p>
              </div>
              <button type="button" aria-label={fav ? 'Убрать из избранного' : 'В избранное'} aria-pressed={fav} onClick={() => { tap(fav ? 'light' : 'success'); toggleFav(t); }}
                className={cn('press glass grid size-12 shrink-0 place-items-center rounded-full', fav && 'text-danger')}><LuHeart size={22} className={cn(fav && 'pop fill-current')} /></button>
            </div>
            {(info || error) && <p className={cn('mt-1 truncate text-[12.5px]', error ? 'text-danger' : 'text-faint')} role="status">{error || [info?.label, info?.note].filter(Boolean).join(' · ')}</p>}
          </div>

          {mode !== 'embed' && (
            <>
              <div className="pt-2"><Progress /></div>
              <div className="flex items-center justify-between px-1 pt-1">
                <button type="button" aria-label="Перемешать" aria-pressed={shuffle} onClick={() => { tap('select'); toggleShuffle(); }} className={cn('press grid size-11 place-items-center rounded-full', shuffle ? 'text-accent' : 'text-muted')}><LuShuffle size={22} /></button>
                <button type="button" aria-label="Предыдущий" onClick={() => { tap('light'); prev(); }} className="press grid size-14 place-items-center rounded-full"><LuSkipBack size={30} className="fill-current" /></button>
                <button type="button" aria-label={playing ? 'Пауза' : 'Играть'} onClick={() => { tap('medium'); toggle(); }} className="press grid size-[76px] place-items-center rounded-full bg-fg text-bg shadow-[0_14px_34px_-10px_rgba(0,0,0,.6)]">
                  {loading && !playing ? <span className="spin size-7 rounded-full border-[3px] border-current border-t-transparent" /> : playing ? <LuPause size={34} className="fill-current" /> : <LuPlay size={34} className="ml-1 fill-current" />}
                </button>
                <button type="button" aria-label="Следующий" onClick={() => { tap('light'); next(); }} className="press grid size-14 place-items-center rounded-full"><LuSkipForward size={30} className="fill-current" /></button>
                <button type="button" aria-label="Повтор" aria-pressed={repeat > 0} onClick={() => { tap('select'); cycleRepeat(); }} className={cn('press grid size-11 place-items-center rounded-full', repeat ? 'text-accent' : 'text-muted')}>{repeat === 2 ? <LuRepeat1 size={22} /> : <LuRepeat size={22} />}</button>
              </div>
            </>
          )}

          <div className="mt-3 flex items-center gap-3">
            <Segmented
              className="flex-1" label="Режим" value={view} onChange={v => ui.set({ nowView: v })}
              options={[{ id: 'player', label: 'Плеер' }, { id: 'lyrics', label: <><LuMicVocal size={15} />Текст</> }]}
            />
            <Button variant="chip" size="icon" aria-label="Очередь" onClick={() => ui.set({ queue: true })}><LuListMusic size={20} /></Button>
            <Button variant="chip" size="icon" aria-label={sleepAt ? 'Выключить таймер сна' : 'Таймер сна 30 минут'} className={cn(sleepAt && 'text-accent')} onClick={() => setSleep(sleepAt ? 0 : 30)}><LuTimer size={20} /></Button>
          </div>
          <div className="mt-2 hidden items-center gap-3 px-2 md:flex"><LuVolume2 size={18} className="text-muted" /><Range label="Громкость" value={vol} onChange={setVolume} /></div>
        </div>
      )}
    </Sheet>
  );
}
