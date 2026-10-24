import { tgInitData } from './tg';
import type { AppConfig, Section, SourceId, Track } from './types';

export class ApiError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  let r: Response;
  try { r = await fetch(path, init); } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    throw new ApiError('Нет соединения с сервером');
  }
  let j: unknown = null;
  try { j = await r.json(); } catch { /* пустой ответ */ }
  if (!r.ok) throw new ApiError((j as { error?: string })?.error || `Ошибка сервера (${r.status})`, r.status);
  return j as T;
}

export const getConfig = () => req<AppConfig>('/api/config');

export const search = (q: string, sources: SourceId[], signal?: AbortSignal) =>
  req<{ items: Track[]; failed: { id: SourceId; error: string }[] }>(
    `/api/search?q=${encodeURIComponent(q)}${sources.length ? `&sources=${sources.join(',')}` : ''}`, { signal });

export const home = (sources: SourceId[], signal?: AbortSignal) =>
  req<{ sections: Section[] }>(`/api/home${sources.length ? `?sources=${sources.join(',')}` : ''}`, { signal });

export const getTrack = (src: string, id: string) => req<Track>(`/api/track?src=${encodeURIComponent(src)}&id=${encodeURIComponent(id)}`);

export const lyricsFor = (t: Track, signal?: AbortSignal) =>
  req<{ synced?: string; plain?: string }>(
    `/api/lyrics?t=${encodeURIComponent(t.title)}&a=${encodeURIComponent((t.artist || '').split(',')[0])}${t.dur ? `&d=${Math.round(t.dur)}` : ''}`, { signal });

export const resolveAudio = (t: Track, signal?: AbortSignal) =>
  req<{ track: Track | null }>(
    `/api/resolve?title=${encodeURIComponent(t.title)}&artist=${encodeURIComponent(t.artist)}${t.dur ? `&d=${Math.round(t.dur)}` : ''}`, { signal });

export const streamInfo = (audio: string) => req<{ url: string; kbps?: number; codec?: string }>(audio + (audio.includes('?') ? '&' : '?') + 'json=1');

// ── синхронизация через Telegram (initData подписывается сервером) ──
export interface SyncBlob { settings?: unknown; favs?: Track[]; playlists?: unknown[]; favUpdatedAt?: number; updatedAt?: number }
const authHeaders = (): Record<string, string> => ({ 'X-Tg-Init-Data': tgInitData() });
export const syncGet = () => req<SyncBlob>('/api/sync', { headers: authHeaders() });
export const syncPut = (b: SyncBlob) => req<{ ok: true }>('/api/sync', { method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
