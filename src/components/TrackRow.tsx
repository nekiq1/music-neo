import { memo } from 'react';
import { LuEllipsis, LuHeart } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { fmtTime, tkey } from '@/lib/format';
import { toggleFav, useIsFav } from '@/lib/library';
import { usePlayer } from '@/lib/player';
import { tap } from '@/lib/settings';
import { openMenu } from '@/lib/ui';
import type { Track } from '@/lib/types';
import { Cover } from './Cover';
import { SourceBadge } from './SourceBadge';

export const Equalizer = ({ paused, className }: { paused?: boolean; className?: string }) => (
  <span className={cn('eq', className)} data-paused={paused ? '' : undefined} aria-hidden><b /><b /><b /></span>
);

/** Строка трека (поиск, коллекция, очередь). */
export const TrackRow = memo(function TrackRow({ track, onPlay, index, showSource = true, trailing }: {
  track: Track; onPlay: () => void; index?: number; showSource?: boolean; trailing?: React.ReactNode;
}) {
  const k = tkey(track);
  const isCur = usePlayer(s => !!s.current && tkey(s.current) === k);
  const playing = usePlayer(s => s.playing);
  const fav = useIsFav(track);

  return (
    <div className={cn('group relative flex items-center gap-3 rounded-2xl px-2 py-1.5 transition-colors', isCur ? 'bg-[var(--chip)]' : 'hover:bg-[var(--chip)]')}>
      <button type="button" onClick={onPlay} className="press flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Играть: ${track.title} — ${track.artist}`}>
        {index !== undefined && <span className="hidden w-5 shrink-0 text-center text-[13px] tabular-nums text-faint md:block">{index + 1}</span>}
        <span className="relative size-[54px] shrink-0">
          <Cover track={track} size="sm" className="size-full rounded-[15px]" />
          {isCur && (
            <span className="absolute inset-0 grid place-items-center rounded-[15px] bg-black/45 text-white"><Equalizer paused={!playing} /></span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15.5px] font-semibold leading-tight', isCur && 'text-accent')}>{track.title}</span>
          <span className="mt-0.5 flex items-center gap-1.5">
            {showSource && <SourceBadge src={track.src} label={false} />}
            {track.preview && <span className="rounded bg-[var(--chip)] px-1 text-[10px] font-bold leading-4 text-muted">30с</span>}
            <span className="truncate text-[13.5px] text-muted">{track.artist}</span>
          </span>
        </span>
        {track.dur ? <span className="hidden shrink-0 pr-1 text-[12.5px] tabular-nums text-faint sm:block">{fmtTime(track.dur)}</span> : null}
      </button>
      {trailing}
      <button
        type="button" aria-label={fav ? 'Убрать из избранного' : 'В избранное'} aria-pressed={fav}
        onClick={() => { tap(fav ? 'light' : 'success'); toggleFav(track); }}
        className={cn('press grid size-9 shrink-0 place-items-center rounded-full', fav ? 'text-danger' : 'text-faint hover:text-fg')}
      >
        <LuHeart size={19} className={cn(fav && 'pop fill-current')} />
      </button>
      <button type="button" aria-label="Ещё" onClick={() => { tap('light'); openMenu(track); }} className="press grid size-9 shrink-0 place-items-center rounded-full text-faint hover:text-fg">
        <LuEllipsis size={20} />
      </button>
    </div>
  );
});
