import { memo, useState } from 'react';
import { LuMusic } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { placeholderBg } from '@/lib/format';
import { effectiveQuality } from '@/lib/settings';
import type { Track } from '@/lib/types';

export type CoverSize = 'sm' | 'md' | 'lg';

/** Подбирает размер обложки под профиль качества. */
export function coverUrl(t: Pick<Track, 'cover' | 'coverSm' | 'coverLg'>, size: CoverSize): string | undefined {
  const q = effectiveQuality();
  if (size === 'sm') return t.coverSm || t.cover;
  if (size === 'md') return q === 'low' ? t.coverSm || t.cover : t.cover || t.coverLg;
  return q === 'low' ? t.cover || t.coverSm : t.coverLg || t.cover;
}

export const Cover = memo(function Cover({ track, size = 'md', className, eager }: { track: Pick<Track, 'cover' | 'coverSm' | 'coverLg' | 'title' | 'id'>; size?: CoverSize; className?: string; eager?: boolean }) {
  const url = coverUrl(track, size);
  const [state, setState] = useState<'load' | 'ok' | 'bad'>('load');
  const bad = !url || state === 'bad';
  return (
    <div className={cn('cover relative overflow-hidden', className)} style={bad ? { background: placeholderBg(track.title + track.id) } : undefined}>
      {bad ? (
        <span className="absolute inset-0 grid place-items-center text-white/80"><LuMusic className="size-[34%]" /></span>
      ) : (
        <img
          src={url} alt="" draggable={false} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
          onLoad={() => setState('ok')} onError={() => setState('bad')}
          className={cn('size-full object-cover transition-opacity duration-500', state === 'ok' ? 'opacity-100' : 'opacity-0')}
        />
      )}
    </div>
  );
});
