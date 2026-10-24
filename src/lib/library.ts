import { createStore } from './store';
import { tkey, uid } from './format';
import type { Playlist, Track } from './types';

interface Lib {
  favs: Track[];
  playlists: Playlist[];
  recent: Track[];
  searches: string[];
  favUpdatedAt: number;
  plUpdatedAt: number;
}

// В хранилище кладём только нужные поля трека — localStorage не безразмерный
export const slim = (t: Track): Track => {
  const { id, src, title, artist, cover, coverSm, coverLg, audio, embed, uri, url, dur, preview, kbps, codec, lyrics } = t;
  return { id, src, title, artist, cover, coverSm, coverLg, audio, embed, uri, url, dur, preview, kbps, codec, lyrics: lyrics && lyrics.length < 6000 ? lyrics : undefined };
};

export const lib = createStore<Lib>({ favs: [], playlists: [], recent: [], searches: [], favUpdatedAt: 0, plUpdatedAt: 0 }, 'neo:v3:lib');
export const useLib = <S,>(sel: (s: Lib) => S) => lib.use(sel);

export const useIsFav = (t: Track | null) => lib.use(s => (t ? s.favs.some(f => tkey(f) === tkey(t)) : false));

export function toggleFav(t: Track): boolean {
  const k = tkey(t), had = lib.get().favs.some(f => tkey(f) === k);
  lib.set(s => ({ favs: had ? s.favs.filter(f => tkey(f) !== k) : [slim(t), ...s.favs].slice(0, 2000), favUpdatedAt: Date.now() }));
  return !had;
}

export function pushRecent(t: Track) {
  const k = tkey(t);
  lib.set(s => ({ recent: [slim(t), ...s.recent.filter(r => tkey(r) !== k)].slice(0, 40) }));
}

export function pushSearch(q: string) {
  const v = q.trim();
  if (v.length < 2) return;
  lib.set(s => ({ searches: [v, ...s.searches.filter(x => x.toLowerCase() !== v.toLowerCase())].slice(0, 10) }));
}
export const clearSearches = () => lib.set({ searches: [] });

export function createPlaylist(name: string, first?: Track): Playlist {
  const p: Playlist = { id: uid(), name: name.trim().slice(0, 60) || 'Новый плейлист', tracks: first ? [slim(first)] : [], updatedAt: Date.now() };
  lib.set(s => ({ playlists: [p, ...s.playlists], plUpdatedAt: Date.now() }));
  return p;
}

export function addToPlaylist(id: string, t: Track) {
  const k = tkey(t);
  lib.set(s => ({
    playlists: s.playlists.map(p => p.id === id && !p.tracks.some(x => tkey(x) === k) ? { ...p, tracks: [...p.tracks, slim(t)], updatedAt: Date.now() } : p),
    plUpdatedAt: Date.now(),
  }));
}

export function removeFromPlaylist(id: string, t: Track) {
  const k = tkey(t);
  lib.set(s => ({ playlists: s.playlists.map(p => p.id === id ? { ...p, tracks: p.tracks.filter(x => tkey(x) !== k), updatedAt: Date.now() } : p), plUpdatedAt: Date.now() }));
}

export const deletePlaylist = (id: string) => lib.set(s => ({ playlists: s.playlists.filter(p => p.id !== id), plUpdatedAt: Date.now() }));
export const renamePlaylist = (id: string, name: string) =>
  lib.set(s => ({ playlists: s.playlists.map(p => p.id === id ? { ...p, name: name.trim().slice(0, 60) || p.name, updatedAt: Date.now() } : p), plUpdatedAt: Date.now() }));
