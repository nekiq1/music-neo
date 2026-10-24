import { useEffect, useState } from 'react';
import { LuCheck, LuCopy, LuDownload, LuExternalLink, LuHeart, LuListEnd, LuListMusic, LuListPlus, LuPlus, LuSend, LuShare2, LuTrash2, LuX } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { tkey } from '@/lib/format';
import { addToPlaylist, createPlaylist, toggleFav, useIsFav, useLib } from '@/lib/library';
import { addToQueue, playNext, removeAt, clearUpcoming, playIndex, usePlayer } from '@/lib/player';
import { copyLink, nativeShare, sendToLoader, tgShareUrl, vkShareUrl, loaderUsername } from '@/lib/share';
import { tap, useSettings } from '@/lib/settings';
import { openExternal } from '@/lib/tg';
import { showToast, toasts } from '@/lib/toast';
import { ui, useUI, closeMenu, closeSettings } from '@/lib/ui';
import type { Track } from '@/lib/types';
import { Cover } from './Cover';
import { SettingsContent } from './SettingsContent';
import { Sheet, SheetHeader } from './ui/sheet';
import { Button } from './ui/button';
import { SourceBadge } from './SourceBadge';

const VkIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12.8 17.5C7.3 17.5 4.2 13.7 4.1 7.5h2.8c.1 4.5 2.1 6.4 3.7 6.8V7.5h2.6v3.9c1.6-.2 3.3-1.9 3.8-3.9h2.6c-.4 2.4-2.2 4.2-3.5 4.9 1.3.6 3.4 2.2 4.2 5.1h-2.9c-.6-1.9-2.1-3.4-4.2-3.6v3.6z" /></svg>
);

function Action({ icon, label, onClick, danger, active }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button type="button" onClick={() => { tap('light'); onClick(); }} className={cn('press flex h-[52px] w-full items-center gap-4 rounded-2xl px-3 text-left text-[16px] font-semibold hover:bg-[var(--chip)]', danger && 'text-danger', active && 'text-accent')}>
      <span className="grid size-9 place-items-center rounded-xl bg-[var(--chip)]">{icon}</span>{label}
    </button>
  );
}

export function TrackMenu() {
  const t = useUI(s => s.menu);
  const [last, setLast] = useState<Track | null>(null);
  useEffect(() => { if (t) setLast(t); }, [t]);
  const tr = t || last;
  const fav = useIsFav(tr);
  const loader = useSettings(s => s.loaderBot);
  if (!tr) return null;
  const done = (f: () => void) => () => { f(); closeMenu(); };
  return (
    <Sheet open={!!t} onClose={closeMenu} label="Действия с треком" z={70}>
      <div className="scroll px-4 pb-4">
        <div className="flex items-center gap-3 px-1 pb-3 pt-1">
          <Cover track={tr} size="sm" className="size-16 shrink-0 rounded-[20px]" />
          <div className="min-w-0 flex-1"><p className="truncate text-[18px] font-bold">{tr.title}</p><p className="truncate text-[14px] text-muted">{tr.artist}</p><SourceBadge src={tr.src} className="mt-1" /></div>
          <Button variant="chip" size="icon-sm" onClick={closeMenu} aria-label="Закрыть"><LuX size={18} /></Button>
        </div>
        <Action icon={<LuHeart size={19} className={cn(fav && 'fill-current')} />} active={fav} label={fav ? 'Убрать из избранного' : 'В избранное'} onClick={done(() => toggleFav(tr))} />
        <Action icon={<LuListPlus size={19} />} label="Играть следующим" onClick={done(() => { playNext(tr); showToast('Сыграет следующим', 'ok'); })} />
        <Action icon={<LuListEnd size={19} />} label="В конец очереди" onClick={done(() => { addToQueue(tr); showToast('Добавлено в очередь', 'ok'); })} />
        <Action icon={<LuListMusic size={19} />} label="В плейлист" onClick={() => { ui.set({ menu: null, picker: tr }); }} />
        <div className="my-2 h-px bg-[var(--line)]" />
        <Action icon={<LuSend size={19} />} label={`Скачать через бота @${loader || loaderUsername()}`} onClick={done(() => sendToLoader(tr))} />
        <Action icon={<LuShare2 size={19} />} label="Поделиться" onClick={done(() => nativeShare(tr))} />
        <Action icon={<VkIcon />} label="Поделиться во ВКонтакте" onClick={done(() => openExternal(vkShareUrl(tr)))} />
        <Action icon={<LuSend size={19} />} label="Отправить в Telegram" onClick={done(() => openExternal(tgShareUrl(tr)))} />
        <Action icon={<LuCopy size={19} />} label="Скопировать ссылку" onClick={done(() => copyLink(tr))} />
        {tr.url && <Action icon={<LuExternalLink size={19} />} label="Открыть в сервисе" onClick={done(() => openExternal(tr.url!))} />}
      </div>
    </Sheet>
  );
}

export function PlaylistPicker() {
  const t = useUI(s => s.picker);
  const lists = useLib(s => s.playlists);
  const [last, setLast] = useState<Track | null>(null);
  useEffect(() => { if (t) setLast(t); }, [t]);
  const tr = t || last;
  const close = () => ui.set({ picker: null });
  if (!tr) return null;
  const add = (id: string, name: string) => { addToPlaylist(id, tr); tap('success'); showToast(`Добавлено в «${name}»`, 'ok'); close(); };
  return (
    <Sheet open={!!t} onClose={close} label="Выбор плейлиста" z={75}>
      <SheetHeader title="В плейлист" onClose={close} />
      <div className="scroll px-4 pb-4">
        <Action icon={<LuPlus size={19} />} active label="Новый плейлист" onClick={() => { const n = window.prompt('Название плейлиста'); if (n === null) return; const p = createPlaylist(n, tr); tap('success'); showToast(`Создан «${p.name}»`, 'ok'); close(); }} />
        {lists.map(p => {
          const has = p.tracks.some(x => tkey(x) === tkey(tr));
          return <Action key={p.id} icon={has ? <LuCheck size={19} /> : <LuListMusic size={19} />} label={`${p.name} · ${p.tracks.length}`} active={has} onClick={() => (has ? close() : add(p.id, p.name))} />;
        })}
      </div>
    </Sheet>
  );
}

export function QueueSheet() {
  const open = useUI(s => s.queue);
  const queue = usePlayer(s => s.queue), index = usePlayer(s => s.index);
  const close = () => ui.set({ queue: false });
  return (
    <Sheet open={open} onClose={close} full label="Очередь" z={65}>
      <SheetHeader title="Очередь" onClose={close} right={index < queue.length - 1 ? <Button variant="chip" size="sm" onClick={clearUpcoming}>Очистить</Button> : undefined} />
      <div className="scroll min-h-0 flex-1 px-3 pb-4">
        {queue.map((t, i) => (
          <div key={t.src + t.id + i} className={cn('flex items-center gap-3 rounded-2xl px-2 py-1.5', i === index && 'bg-[var(--chip)]')}>
            <button type="button" onClick={() => playIndex(i)} className="press flex min-w-0 flex-1 items-center gap-3 text-left">
              <Cover track={t} size="sm" className="size-12 shrink-0 rounded-[14px]" />
              <span className="min-w-0 flex-1"><span className={cn('block truncate text-[15px] font-semibold', i === index && 'text-accent')}>{t.title}</span><span className="block truncate text-[13px] text-muted">{t.artist}</span></span>
            </button>
            {i !== index && <button type="button" aria-label="Убрать из очереди" onClick={() => removeAt(i)} className="press grid size-10 place-items-center rounded-full text-faint hover:text-danger"><LuTrash2 size={17} /></button>}
          </div>
        ))}
        {!queue.length && <p className="px-4 py-14 text-center text-muted">Очередь пуста</p>}
      </div>
    </Sheet>
  );
}

export function SettingsSheet() {
  const open = useUI(s => s.settings);
  return (
    <Sheet open={open} onClose={closeSettings} full label="Настройки" z={55}>
      <SheetHeader title="Настройки" onClose={closeSettings} />
      <div className="scroll min-h-0 flex-1 px-4 pb-6"><SettingsContent /></div>
    </Sheet>
  );
}

export function TermsSheet() {
  const open = useUI(s => s.terms);
  const close = () => ui.set({ terms: false });
  return (
    <Sheet open={open} onClose={close} label="Условия использования" z={80}>
      <SheetHeader title="Условия" onClose={close} />
      <div className="scroll space-y-3 px-5 pb-6 text-[14.5px] leading-relaxed text-muted">
        <p>Neo Music — клиент для поиска и прослушивания музыки через публичные API Deezer, iTunes, Audius и (при наличии ключей) Spotify, SoundCloud и Яндекс Музыки.</p>
        <p>Приложение не хранит и не распространяет чужие аудиофайлы. Поток отдаёт сам сервис; в ряде случаев доступен только 30-секундный фрагмент.</p>
        <p>Права на музыку принадлежат правообладателям. Используйте приложение только в личных целях и в соответствии с условиями сервисов-источников.</p>
        <p>Избранное и настройки хранятся на вашем устройстве; в Telegram они синхронизируются через сервер, доступ к ним защищён подписью Telegram.</p>
      </div>
    </Sheet>
  );
}

export function Toasts() {
  const items = toasts.use(s => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4" style={{ top: 'calc(var(--sat) + 10px)' }} aria-live="polite">
      {items.map(i => (
        <div key={i.id} className={cn('glass rise pointer-events-auto max-w-[min(92vw,420px)] rounded-full px-5 py-3 text-center text-[14.5px] font-semibold', i.kind === 'error' && 'text-danger')}>{i.text}</div>
      ))}
    </div>
  );
}
export { LuDownload };
