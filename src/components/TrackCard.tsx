import { memo } from 'react';
import { LuEllipsis, LuPlay } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { tkey } from '@/lib/format';
import { usePlayer } from '@/lib/player';
import { tap } from '@/lib/settings';
import { openMenu } from '@/lib/ui';
import type { Track } from '@/lib/types';
import { Cover } from './Cover';
import { SourceBadge } from './SourceBadge';
import { Equalizer } from './TrackRow';

/** Карточка для горизонтальных каруселей. */
export const TrackCard = memo(function TrackCard({ track, onPlay, className }: { track: Track; onPlay: () => void; className?: string }) {
  const k = tkey(track);
  const isCur = usePlayer(s => !!s.current && tkey(s.current) === k);
  const playing = usePlayer(s => s.playing);
  return (
    <div className={cn('relative w-[152px]', className)}>
      <button type="button" onClick={onPlay} className="press block w-full text-left" aria-label={`Играть: ${track.title} — ${track.artist}`}>
        <span className="relative block overflow-hidden rounded-[26px] shadow-[0_14px_34px_-14px_rgba(0,0,0,.6)]">
          <Cover track={track} size="md" className="w-full" />
          <span className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset ring-white/15" />
          <span className="absolute bottom-2 left-2"><SourceBadge src={track.src} label={false} className="!bg-black/45 backdrop-blur-md" /></span>
          <span className="glass absolute bottom-2 right-2 grid size-9 place-items-center rounded-full text-white">
            {isCur ? <Equalizer paused={!playing} /> : <LuPlay size={15} className="ml-0.5 fill-current" />}
          </span>
        </span>
        <span className={cn('mt-2.5 block truncate px-1 text-[14.5px] font-semibold leading-tight', isCur && 'text-accent')}>{track.title}</span>
        <span className="block truncate px-1 text-[13px] text-muted">{track.artist}</span>
      </button>
      <button
        type="button" aria-label="Ещё" onClick={() => { tap('light'); openMenu(track); }}
        className="press glass absolute right-2 top-2 grid size-8 place-items-center rounded-full text-white"
      ><LuEllipsis size={16} /></button>
    </div>
  );
});
