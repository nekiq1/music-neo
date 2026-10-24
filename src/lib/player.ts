import { createStore } from './store';
import { effectiveQuality, settings, updateSettings } from './settings';
import { pushRecent, slim } from './library';
import { resolveAudio, streamInfo } from './api';
import { norm, tkey } from './format';
import type { Track } from './types';

export interface PlayerState {
  queue: Track[];
  index: number;
  current: Track | null;
  playing: boolean;
  loading: boolean;
  pos: number;
  dur: number;
  mode: 'none' | 'audio' | 'embed';
  embedUrl: string;
  shuffle: boolean;
  repeat: 0 | 1 | 2; // 0 — выкл, 1 — всё, 2 — один трек
  error: string;
  info: { label: string; note?: string } | null;
  sleepAt: number;
}

export const player = createStore<PlayerState>(
  {
    queue: [], index: -1, current: null, playing: false, loading: false, pos: 0, dur: 0, mode: 'none', embedUrl: '',
    shuffle: false, repeat: 0, error: '', info: null, sleepAt: 0,
  },
  'neo:v3:player',
  s => ({ queue: s.queue.slice(0, 120).map(slim), index: s.index, shuffle: s.shuffle, repeat: s.repeat }),
);
export const usePlayer = player.use;

// ── единственный <audio> на всё приложение (важно для iOS: создаём один раз) ──
const au: HTMLAudioElement = new Audio();
au.preload = 'auto';
au.setAttribute('playsinline', '');
au.volume = settings.get().volume;
const pre: HTMLAudioElement = new Audio();
pre.preload = 'auto';

let token = 0;
let errCount = 0;
let lastPosState = 0;

const canHls = () => !!au.canPlayType('application/vnd.apple.mpegurl');

const SRC_LABEL: Record<string, string> = {
  deezer: 'Deezer', itunes: 'Apple Music (iTunes)', audius: 'Audius', soundcloud: 'SoundCloud', spotify: 'Spotify', yandex: 'Яндекс Музыка', neo: 'сообщество Neo',
};

function describe(t: Track, via?: Track, final?: { kbps?: number; codec?: string }) {
  const b = via || t;
  const kbps = final?.kbps ?? b.kbps, codec = (final?.codec ?? b.codec ?? 'mp3').toUpperCase();
  const parts: string[] = [];
  if (b.src === 'neo') parts.push('Файл автора');
  else { parts.push(codec); if (kbps) parts.push(`${kbps} кбит/с`); }
  if (b.preview) parts.push('фрагмент 30 с');
  return { label: parts.join(' · '), note: via ? `Аудио подобрано: ${SRC_LABEL[via.src] || via.src}` : undefined };
}

// ── подбор аудио для Spotify / Яндекса (у них нет прямого потока) ──
const resolved = new Map<string, Track | null>();
async function resolveCached(t: Track): Promise<Track | null> {
  const k = tkey(t);
  if (resolved.has(k)) return resolved.get(k) || null;
  try {
    const { track } = await resolveAudio(t);
    const ok = track && (norm(track.title).includes(norm(t.title)) || norm(t.title).includes(norm(track.title)));
    resolved.set(k, ok ? track : null);
    return ok ? track : null;
  } catch { return null; }
}

function withQuality(u: string) {
  return u.startsWith('/api/stream') ? `${u}${u.includes('?') ? '&' : '?'}q=${effectiveQuality()}&hls=${canHls() ? 1 : 0}` : u;
}

async function loadCurrent(autoplay = true) {
  const my = ++token;
  const s = player.get();
  const t = s.queue[s.index];
  if (!t) return;
  au.pause();
  player.set({ current: t, pos: 0, dur: t.dur || 0, loading: true, playing: false, error: '', mode: 'none', embedUrl: '', info: null });
  pushRecent(t);
  setMediaSession(t);

  let src = t.audio, via: Track | undefined;
  if (!src && settings.get().resolve) {
    const r = await resolveCached(t);
    if (my !== token) return;
    if (r?.audio) { src = r.audio; via = r; }
  }
  if (!src) {
    if (t.embed) {
      player.set({ mode: 'embed', embedUrl: t.embed, loading: false, info: { label: 'Встроенный плеер сервиса', note: 'Полный трек играет только у залогиненных в сервисе' } });
      return;
    }
    player.set({ loading: false, error: 'Для этого трека нет доступного аудио' });
    return;
  }

  let finalUrl = withQuality(src), meta: { kbps?: number; codec?: string } | undefined;
  if (src.startsWith('/api/stream')) {
    try { const j = await streamInfo(finalUrl); if (my !== token) return; finalUrl = j.url; meta = j; } catch { if (my !== token) return; /* пойдём по редиректу сервера */ }
  }
  player.set({ mode: 'audio', info: describe(t, via, meta) });
  au.src = finalUrl;
  if (autoplay) {
    try { await au.play(); } catch (e) {
      if (my !== token) return;
      if ((e as Error).name === 'NotAllowedError') player.set({ loading: false, playing: false }); // нужен тап пользователя
    }
  } else player.set({ loading: false });
  preloadNext();
}

function preloadNext() {
  const s = player.get();
  if (effectiveQuality() !== 'high' || s.shuffle) return;
  const n = s.queue[s.index + 1];
  if (n?.audio && !n.audio.startsWith('/api/')) { pre.src = n.audio; pre.load(); }
}

// ── события <audio> ──
au.addEventListener('timeupdate', () => {
  const s = player.get(), p = au.currentTime;
  if (Math.abs(p - s.pos) >= 0.2) player.set({ pos: p });
  if (s.sleepAt && Date.now() >= s.sleepAt) { au.pause(); player.set({ sleepAt: 0 }); }
  if (Date.now() - lastPosState > 1000) { lastPosState = Date.now(); updatePositionState(); }
});
au.addEventListener('durationchange', () => { if (isFinite(au.duration) && au.duration > 0) player.set({ dur: au.duration }); });
au.addEventListener('play', () => player.set({ playing: true }));
au.addEventListener('pause', () => player.set({ playing: false }));
au.addEventListener('waiting', () => player.set({ loading: true }));
au.addEventListener('canplay', () => player.set({ loading: false }));
au.addEventListener('playing', () => { errCount = 0; player.set({ loading: false, playing: true, error: '' }); });
au.addEventListener('ended', () => {
  const r = player.get().repeat;
  if (r === 2) { au.currentTime = 0; au.play().catch(() => {}); } else next(true);
});
au.addEventListener('error', () => {
  if (!au.src || player.get().mode !== 'audio') return;
  const t = player.get().current;
  errCount++;
  if (t?.embed && errCount === 1) { player.set({ mode: 'embed', embedUrl: t.embed, loading: false, error: '', info: { label: 'Встроенный плеер сервиса' } }); return; }
  if (errCount < 3) { player.set({ error: 'Не удалось воспроизвести — пропускаю', loading: false }); next(true); }
  else player.set({ loading: false, playing: false, error: 'Не удаётся воспроизвести. Проверьте соединение.' });
});

// ── очередь и управление ──
function pickIndex(dir: 1 | -1, auto: boolean): number {
  const { queue, index, shuffle, repeat } = player.get();
  if (!queue.length) return -1;
  if (shuffle && dir === 1 && queue.length > 1) {
    let n = index;
    while (n === index) n = Math.floor(Math.random() * queue.length);
    return n;
  }
  const n = index + dir;
  if (n >= queue.length) return auto && repeat !== 1 ? -1 : 0;
  if (n < 0) return queue.length - 1;
  return n;
}

export function playList(list: Track[], i: number) {
  if (!list[i]) return;
  errCount = 0;
  player.set({ queue: list.slice(0, 300), index: i });
  loadCurrent();
}

export function playIndex(i: number) {
  if (!player.get().queue[i]) return;
  errCount = 0;
  player.set({ index: i });
  loadCurrent();
}

export function next(auto = false) {
  const n = pickIndex(1, auto);
  if (n < 0) { player.set({ playing: false, pos: 0 }); au.pause(); au.currentTime = 0; return; }
  player.set({ index: n });
  loadCurrent();
}

export function prev() {
  if (au.currentTime > 3 || player.get().index <= 0) { seek(0); return; }
  player.set({ index: pickIndex(-1, false) });
  loadCurrent();
}

export function toggle() {
  const s = player.get();
  if (!s.current) return;
  if (s.mode === 'none') { loadCurrent(); return; }
  if (s.mode !== 'audio') return;
  if (au.paused) au.play().catch(() => {}); else au.pause();
}

export function seek(sec: number) {
  if (player.get().mode !== 'audio') return;
  au.currentTime = Math.max(0, sec);
  player.set({ pos: au.currentTime });
  updatePositionState();
}

export function setVolume(v: number) {
  au.volume = Math.min(1, Math.max(0, v));
  updateSettings({ volume: au.volume });
}

export const toggleShuffle = () => player.set(s => ({ shuffle: !s.shuffle }));
export const cycleRepeat = () => player.set(s => ({ repeat: ((s.repeat + 1) % 3) as 0 | 1 | 2 }));

export function playNext(t: Track) {
  const s = player.get();
  if (!s.queue.length) { playList([t], 0); return; }
  const q = s.queue.slice(); q.splice(s.index + 1, 0, t);
  player.set({ queue: q });
}

export function addToQueue(t: Track) {
  const s = player.get();
  if (!s.queue.length) { playList([t], 0); return; }
  player.set({ queue: [...s.queue, t] });
}

export function removeAt(i: number) {
  const s = player.get();
  if (i === s.index) return;
  const q = s.queue.slice(); q.splice(i, 1);
  player.set({ queue: q, index: i < s.index ? s.index - 1 : s.index });
}

export function clearUpcoming() {
  const s = player.get();
  if (s.index < 0) return;
  player.set({ queue: s.queue.slice(0, s.index + 1) });
}

export const setSleep = (min: number) => player.set({ sleepAt: min ? Date.now() + min * 60_000 : 0 });

/** Восстановить последний трек после перезагрузки (без автозапуска). */
export function restore() {
  const s = player.get();
  if (s.queue[s.index]) player.set({ current: s.queue[s.index], dur: s.queue[s.index].dur || 0 });
}

// ── системный плеер (экран блокировки, наушники, Bluetooth) ──
function setMediaSession(t: Track) {
  if (!('mediaSession' in navigator)) return;
  const art = [t.coverSm, t.cover, t.coverLg].filter(Boolean).map(src => ({ src: src as string, sizes: '512x512' }));
  try { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: art }); } catch { /* */ }
}

function updatePositionState() {
  if (!('mediaSession' in navigator) || !isFinite(au.duration) || !au.duration) return;
  try { navigator.mediaSession.setPositionState({ duration: au.duration, position: Math.min(au.currentTime, au.duration), playbackRate: au.playbackRate }); } catch { /* */ }
}

if ('mediaSession' in navigator) {
  const h = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* */ } };
  h('play', () => { au.play().catch(() => {}); });
  h('pause', () => au.pause());
  h('previoustrack', () => prev());
  h('nexttrack', () => next(false));
  h('seekbackward', () => seek(au.currentTime - 10));
  h('seekforward', () => seek(au.currentTime + 10));
  h('seekto', d => { if (d.seekTime != null) seek(d.seekTime); });
}
