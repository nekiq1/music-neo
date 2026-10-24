// Синхронизация избранного, плейлистов и настроек между устройствами — только внутри Telegram.
// Сервер проверяет подпись initData, поэтому чужие данные прочитать/перезаписать нельзя.
import { syncGet, syncPut, type SyncBlob } from './api';
import { debounce } from './format';
import { lib } from './library';
import { settings } from './settings';
import { isTelegram } from './tg';
import type { Settings } from './types';

let started = false;
let applying = false;

export async function startSync() {
  if (started || !isTelegram()) return;
  started = true;
  try {
    const remote = await syncGet();
    applying = true;
    const rs = remote.settings as Settings | undefined;
    if (rs && (rs.updatedAt || 0) > settings.get().updatedAt) settings.set({ ...rs });
    const l = lib.get();
    const patch: Partial<ReturnType<typeof lib.get>> = {};
    if (remote.favs && (remote.favUpdatedAt || 0) > l.favUpdatedAt) { patch.favs = remote.favs; patch.favUpdatedAt = remote.favUpdatedAt; }
    const rp = remote as SyncBlob & { plUpdatedAt?: number };
    if (rp.playlists && (rp.plUpdatedAt || 0) > l.plUpdatedAt) { patch.playlists = rp.playlists as typeof l.playlists; patch.plUpdatedAt = rp.plUpdatedAt; }
    if (Object.keys(patch).length) lib.set(patch);
  } catch { /* офлайн или сервер без sync — работаем локально */ }
  finally { applying = false; }

  const push = debounce(() => {
    const l = lib.get();
    syncPut({ settings: settings.get(), favs: l.favs.slice(0, 500), favUpdatedAt: l.favUpdatedAt, playlists: l.playlists, plUpdatedAt: l.plUpdatedAt } as SyncBlob).catch(() => {});
  }, 2000);
  const onChange = () => { if (!applying) push(); };
  settings.subscribe(onChange);
  lib.subscribe(onChange);
}
