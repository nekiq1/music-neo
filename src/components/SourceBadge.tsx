import type { IconType } from 'react-icons';
import { LuAudioLines, LuCloud, LuDisc3, LuHeadphones, LuMicVocal, LuRadio, LuSparkles } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import type { SourceId } from '@/lib/types';

export const SOURCE_META: Record<SourceId, { label: string; hue: number; Icon: IconType }> = {
  deezer: { label: 'Deezer', hue: 285, Icon: LuAudioLines },
  itunes: { label: 'iTunes', hue: 340, Icon: LuDisc3 },
  audius: { label: 'Audius', hue: 300, Icon: LuRadio },
  soundcloud: { label: 'SoundCloud', hue: 25, Icon: LuCloud },
  spotify: { label: 'Spotify', hue: 145, Icon: LuHeadphones },
  yandex: { label: 'Яндекс', hue: 50, Icon: LuMicVocal },
  neo: { label: 'Neo', hue: 200, Icon: LuSparkles },
};

export function SourceBadge({ src, className, label = true }: { src: SourceId; className?: string; label?: boolean }) {
  const m = SOURCE_META[src];
  if (!m) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold leading-none', className)}
      style={{ background: `hsl(${m.hue} 80% 60% / .16)`, color: `hsl(${m.hue} 85% var(--src-l, 72%))` }}
      title={m.label}
    >
      <m.Icon size={11} aria-hidden />
      {label && m.label}
    </span>
  );
}
