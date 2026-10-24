import { useState } from 'react';
import { LuChevronLeft, LuClock3, LuFolderPlus, LuHeart, LuListMusic, LuPlay, LuShuffle, LuTrash2 } from 'react-icons/lu';
import { cn } from '@/lib/cn';
import { plural, tkey } from '@/lib/format';
import { createPlaylist, deletePlaylist, removeFromPlaylist, useLib } from '@/lib/library';
import { playList, player } from '@/lib/player';
import { tap } from '@/lib/settings';
import { showToast } from '@/lib/toast';
import type { Track } from '@/lib/types';
import { Cover } from '@/components/Cover';
import { Empty, ScreenHeader } from '@/components/Section';
import { TrackRow } from '@/components/TrackRow';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/controls';

type View = 'favs' | 'lists' | 'recent';

function PlayAll({ list }: { list: Track[] }) {
  if (!list.length) return null;
  return (
    <div className="mb-3 flex gap-2.5">
      <Button variant="solid" className="flex-1" onClick={() => playList(list, 0)}><LuPlay size={17} className="fill-current" />Слушать</Button>
      <Button variant="glass" className="flex-1" onClick={() => { player.set({ shuffle: true }); playList(list, Math.floor(Math.random() * list.length)); }}><LuShuffle size={17} />Вперемешку</Button>
    </div>
  );
}

function List({ list, onRemove }: { list: Track[]; onRemove?: (t: Track) => void }) {
  return (
    <div className="-mx-2">
      {list.map((t, i) => (
        <div key={tkey(t)} className="cv-auto">
          <TrackRow
            track={t} onPlay={() => playList(list, i)}
            trailing={onRemove && <button type="button" aria-label="Убрать из плейлиста" onClick={() => onRemove(t)} className="press grid size-10 place-items-center rounded-full text-faint hover:text-danger"><LuTrash2 size={18} /></button>}
          />
        </div>
      ))}
    </div>
  );
}

export function Library() {
  const favs = useLib(s => s.favs), lists = useLib(s => s.playlists), recent = useLib(s => s.recent);
  const [view, setView] = useState<View>('favs');
  const [open, setOpen] = useState<string | null>(null);
  const pl = lists.find(p => p.id === open);

  const newList = () => {
    const name = window.prompt('Название плейлиста');
    if (name === null) return;
    const p = createPlaylist(name);
    tap('success'); showToast(`Плейлист «${p.name}» создан`, 'ok'); setOpen(p.id);
  };

  return (
    <div className="scroll h-full pb-[calc(var(--dock)+var(--mini-h)+28px)] md:pb-[calc(var(--mini-h)+40px)]">
      {pl ? (
        <>
          <ScreenHeader
            title={pl.name} subtitle={`${pl.tracks.length} ${plural(pl.tracks.length, 'трек', 'трека', 'треков')}`}
            right={<Button variant="glass" size="icon" aria-label="Назад" onClick={() => setOpen(null)}><LuChevronLeft size={22} /></Button>}
          />
          <div className="px-5">
            <PlayAll list={pl.tracks} />
            {pl.tracks.length ? <List list={pl.tracks} onRemove={t => removeFromPlaylist(pl.id, t)} /> : <Empty icon={<LuListMusic />} title="Плейлист пуст" text="Откройте «⋯» у любого трека и выберите «В плейлист»." />}
            <Button variant="danger" size="sm" className="mt-6" onClick={() => { if (window.confirm(`Удалить плейлист «${pl.name}»?`)) { deletePlaylist(pl.id); setOpen(null); } }}><LuTrash2 size={16} />Удалить плейлист</Button>
          </div>
        </>
      ) : (
        <>
          <ScreenHeader title="Коллекция" />
          <div className="px-5">
            <Segmented<View>
              className="mb-4" label="Раздел" value={view} onChange={setView}
              options={[{ id: 'favs', label: <><LuHeart size={15} />Любимое</> }, { id: 'lists', label: <><LuListMusic size={15} />Плейлисты</> }, { id: 'recent', label: <><LuClock3 size={15} />История</> }]}
            />
            {view === 'favs' && (favs.length ? <><PlayAll list={favs} /><List list={favs} /></> : <Empty icon={<LuHeart />} title="Здесь появятся любимые треки" text="Нажмите на сердечко рядом с треком — он сохранится и синхронизируется в Telegram." />)}
            {view === 'recent' && (recent.length ? <List list={recent} /> : <Empty icon={<LuClock3 />} title="История пуста" text="Всё, что вы слушаете, появится здесь." />)}
            {view === 'lists' && (
              <>
                <button type="button" onClick={newList} className="press glass mb-4 flex h-16 w-full items-center gap-3 rounded-3xl px-4 text-left font-semibold">
                  <span className="grid size-10 place-items-center rounded-2xl bg-accent text-on-accent"><LuFolderPlus size={20} /></span>Новый плейлист
                </button>
                {lists.length === 0 && <Empty icon={<LuListMusic />} title="Плейлистов пока нет" text="Создайте первый и собирайте любимые треки из любых источников." />}
                <div className="grid grid-cols-2 gap-4">
                  {lists.map(p => (
                    <button key={p.id} type="button" onClick={() => setOpen(p.id)} className="press text-left">
                      <span className={cn('relative block overflow-hidden rounded-[26px]', 'shadow-[0_14px_34px_-14px_rgba(0,0,0,.6)]')}>
                        {p.tracks[0] ? <Cover track={p.tracks[0]} size="md" className="w-full" /> : <span className="cover glass grid place-items-center text-accent"><LuListMusic size={34} /></span>}
                      </span>
                      <span className="mt-2 block truncate px-1 text-[15px] font-semibold">{p.name}</span>
                      <span className="block px-1 text-[13px] text-muted">{p.tracks.length} {plural(p.tracks.length, 'трек', 'трека', 'треков')}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
