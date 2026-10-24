// Источники музыки. Без ключей: Deezer (фрагменты 30 с), iTunes (фрагменты 30 с), Audius (полные треки).
// С ключами: Spotify (метаданные + embed), SoundCloud (официальный API), Яндекс Музыка (неофициальный API, выбор битрейта).
import { createHash } from 'node:crypto';
import { clampStr, createCache, getJson, http, norm } from './util.js';

export const cache = createCache();
const MIN = 60_000;

const env = () => process.env;
const region = () => (env().REGION || 'ru').toLowerCase();

// ───────────────────────── Deezer ─────────────────────────
const dz = x => ({
  id: String(x.id), src: 'deezer', title: x.title_short || x.title, artist: x.artist?.name || '',
  coverSm: x.album?.cover_small, cover: x.album?.cover_medium || x.album?.cover, coverLg: x.album?.cover_xl || x.album?.cover_big,
  audio: x.preview || undefined, preview: true, kbps: 128, codec: 'mp3', dur: x.duration, url: x.link,
});

// ───────────────────────── iTunes ─────────────────────────
const art = (u, n) => (u ? u.replace(/\/\d+x\d+(bb)?\.(jpg|png)$/, `/${n}x${n}bb.$2`) : undefined);
const it = x => ({
  id: String(x.trackId), src: 'itunes', title: x.trackName, artist: x.artistName,
  coverSm: art(x.artworkUrl100, 120), cover: art(x.artworkUrl100, 400), coverLg: art(x.artworkUrl100, 800),
  audio: x.previewUrl, preview: true, codec: 'aac', dur: x.trackTimeMillis ? Math.round(x.trackTimeMillis / 1000) : undefined, url: x.trackViewUrl,
});

// ───────────────────────── Audius ─────────────────────────
const AUDIUS_FALLBACK = ['https://api.audius.co'];
let audiusHosts = { list: AUDIUS_FALLBACK, exp: 0 };
async function audiusHost() {
  if (audiusHosts.exp < Date.now()) {
    try {
      const j = await getJson('https://api.audius.co', { timeout: 4000 });
      if (Array.isArray(j.data) && j.data.length) audiusHosts = { list: j.data, exp: Date.now() + 10 * MIN };
    } catch { audiusHosts = { list: AUDIUS_FALLBACK, exp: Date.now() + MIN }; }
  }
  return audiusHosts.list[Math.floor(Math.random() * audiusHosts.list.length)];
}
const au = x => ({
  id: x.id, src: 'audius', title: x.title, artist: x.user?.name || '',
  coverSm: x.artwork?.['150x150'], cover: x.artwork?.['480x480'], coverLg: x.artwork?.['1000x1000'] || x.artwork?.['480x480'],
  audio: `/api/stream?src=audius&id=${encodeURIComponent(x.id)}`, codec: 'mp3', dur: x.duration, url: x.permalink ? `https://audius.co${x.permalink}` : undefined,
});
const audiusOk = x => x && x.is_streamable !== false && !x.is_delete && x.user?.name;

// ───────────────────────── SoundCloud ─────────────────────────
const tokens = {};
async function oauth(name, url, id, secret) {
  const t = tokens[name];
  if (t && t.exp > Date.now()) return t.v;
  const r = await http(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64') }, body: 'grant_type=client_credentials' });
  if (!r.ok) throw new Error(`${name}: не удалось получить токен (${r.status})`);
  const j = await r.json();
  tokens[name] = { v: j.access_token, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 60) * 1000 };
  return j.access_token;
}
const scToken = () => oauth('sc', 'https://secure.soundcloud.com/oauth/token', env().SOUNDCLOUD_CLIENT_ID, env().SOUNDCLOUD_CLIENT_SECRET);
const sc = x => ({
  id: String(x.id), src: 'soundcloud', title: x.title, artist: x.user?.username || '',
  coverSm: x.artwork_url?.replace('-large', '-t120x120'), cover: x.artwork_url?.replace('-large', '-t300x300'), coverLg: x.artwork_url?.replace('-large', '-t500x500'),
  audio: x.streamable !== false ? `/api/stream?src=soundcloud&id=${x.id}` : undefined,
  embed: `https://w.soundcloud.com/player/?auto_play=true&url=${encodeURIComponent(x.permalink_url)}`, codec: 'mp3', kbps: 128,
  dur: x.duration ? Math.round(x.duration / 1000) : undefined, url: x.permalink_url,
});

// ───────────────────────── Spotify ─────────────────────────
const spToken = () => oauth('sp', 'https://accounts.spotify.com/api/token', env().SPOTIFY_CLIENT_ID, env().SPOTIFY_CLIENT_SECRET);
const sp = x => ({
  id: x.id, src: 'spotify', title: x.name, artist: (x.artists || []).map(a => a.name).join(', '),
  coverSm: x.album?.images?.[2]?.url, cover: x.album?.images?.[1]?.url, coverLg: x.album?.images?.[0]?.url,
  audio: x.preview_url || undefined, preview: x.preview_url ? true : undefined, codec: 'mp3',
  uri: `spotify:track:${x.id}`, embed: `https://open.spotify.com/embed/track/${x.id}`, dur: x.duration_ms ? Math.round(x.duration_ms / 1000) : undefined, url: x.external_urls?.spotify,
});

// ───────────────────────── Яндекс Музыка ─────────────────────────
const YA = 'https://api.music.yandex.net';
const yaH = () => ({ Authorization: `OAuth ${env().YANDEX_TOKEN}`, 'X-Yandex-Music-Client': 'YandexMusicAndroid/24023231' });
const ya = x => {
  const alb = x.albums?.[0];
  const c = x.coverUri || alb?.coverUri;
  const cv = n => (c ? `https://${c.replace('%%', `${n}x${n}`)}` : undefined);
  return {
    id: alb ? `${x.id}:${alb.id}` : String(x.id), src: 'yandex', title: x.title + (x.version ? ` (${x.version})` : ''), artist: (x.artists || []).map(a => a.name).join(', '),
    coverSm: cv(100), cover: cv(300), coverLg: cv(600),
    audio: `/api/stream?src=yandex&id=${x.id}`, codec: 'mp3',
    dur: x.durationMs ? Math.round(x.durationMs / 1000) : undefined, url: alb ? `https://music.yandex.ru/album/${alb.id}/track/${x.id}` : `https://music.yandex.ru/track/${x.id}`,
  };
};

/** Выбор варианта из download-info по профилю качества. Чистая функция — покрыта тестами. */
export function pickYandexVariant(list, quality = 'high', hls = false) {
  const v = (list || []).filter(i => i && i.bitrateInKbps && (i.codec === 'mp3' || i.codec === 'aac' || i.codec === 'he-aac'));
  if (!v.length) return null;
  const mp3 = v.filter(i => i.codec === 'mp3').sort((a, b) => a.bitrateInKbps - b.bitrateInKbps);
  const pool = mp3.length ? mp3 : v.sort((a, b) => a.bitrateInKbps - b.bitrateInKbps);
  if (quality === 'low') return pool[0];
  if (quality === 'medium') return pool.find(i => i.bitrateInKbps >= 128 && i.bitrateInKbps <= 192) || pool[Math.floor(pool.length / 2)];
  return pool[pool.length - 1];
}

async function yandexDirect(id, quality) {
  const info = await getJson(`${YA}/tracks/${encodeURIComponent(id)}/download-info`, { headers: yaH() });
  const pick = pickYandexVariant(info.result, quality);
  if (!pick) throw new Error('Яндекс: нет доступных потоков');
  const r = await http(`${pick.downloadInfoUrl}&format=json`, { headers: yaH() });
  const j = await r.json().catch(() => null);
  let host = j?.host, path = j?.path, ts = j?.ts, s = j?.s;
  if (!host) { // старый XML-формат
    const xml = await (await http(pick.downloadInfoUrl, { headers: yaH() })).text();
    const g = t => xml.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1];
    host = g('host'); path = g('path'); ts = g('ts'); s = g('s');
  }
  if (!host || !path || !ts || !s) throw new Error('Яндекс: неожиданный ответ сервиса');
  const sign = createHash('md5').update('XGRlBW9FXlekgbPrRHuSiA' + path.slice(1) + s).digest('hex');
  return { url: `https://${host}/get-mp3/${sign}/${ts}${path}`, kbps: pick.bitrateInKbps, codec: pick.codec === 'mp3' ? 'mp3' : 'aac' };
}

// ───────────────────────── Сообщество (PocketBase, только чтение) ─────────────────────────
const neoMap = x => { const f = n => `${env().PB_URL}/api/files/tracks/${x.id}/${n}`; return { id: x.id, src: 'neo', title: x.title, artist: x.artist, lyrics: x.lyrics, cover: x.cover ? f(x.cover) : undefined, coverSm: x.cover ? `${f(x.cover)}?thumb=300x300` : undefined, audio: f(x.audio), url: f(x.audio) }; };

// ───────────────────────── Реестр ─────────────────────────
const dedupe = list => { const s = new Set(); return list.filter(t => t && t.id && t.title && !s.has(t.src + t.id) && s.add(t.src + t.id)); };

export const SOURCES = {
  deezer: {
    label: 'Deezer', keyless: true, kind: 'preview', note: 'фрагменты 30 с', enabled: () => true,
    async search(q) { const j = await getJson(`https://api.deezer.com/search?limit=30&q=${encodeURIComponent(q)}`); return (j.data || []).map(dz); },
    async track(id) { return dz(await getJson(`https://api.deezer.com/track/${encodeURIComponent(id)}`)); },
    async home() { const j = await getJson('https://api.deezer.com/chart/0/tracks?limit=30'); return [{ id: 'deezer-top', title: 'Чарт Deezer', layout: 'list', items: (j.data || []).map(dz) }]; },
  },
  itunes: {
    label: 'iTunes', keyless: true, kind: 'preview', note: 'фрагменты 30 с', enabled: () => true,
    async search(q) { const j = await getJson(`https://itunes.apple.com/search?media=music&entity=song&limit=30&country=${region()}&term=${encodeURIComponent(q)}`); return (j.results || []).filter(x => x.previewUrl).map(it); },
    async track(id) { const j = await getJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=${region()}`); const x = j.results?.[0]; if (!x?.previewUrl) throw new Error('not found'); return it(x); },
    async home() {
      const rss = await getJson(`https://rss.applemarketingtools.com/api/v2/${region()}/music/most-played/25/songs.json`);
      const ids = (rss.feed?.results || []).map(x => x.id).join(',');
      if (!ids) return [];
      const j = await getJson(`https://itunes.apple.com/lookup?id=${ids}&country=${region()}`);
      return [{ id: 'itunes-top', title: 'Топ Apple Music', items: (j.results || []).filter(x => x.previewUrl).map(it) }];
    },
  },
  audius: {
    label: 'Audius', keyless: true, kind: 'full', note: 'полные треки независимых артистов', enabled: () => true,
    async search(q) { const h = await audiusHost(); const j = await getJson(`${h}/v1/tracks/search?limit=25&app_name=NeoMusic&query=${encodeURIComponent(q)}`); return (j.data || []).filter(audiusOk).map(au); },
    async track(id) { const h = await audiusHost(); const j = await getJson(`${h}/v1/tracks/${encodeURIComponent(id)}?app_name=NeoMusic`); if (!audiusOk(j.data)) throw new Error('not found'); return au(j.data); },
    async home() { const h = await audiusHost(); const j = await getJson(`${h}/v1/tracks/trending?limit=24&app_name=NeoMusic`); return [{ id: 'audius-trending', title: 'В тренде на Audius · полные треки', items: (j.data || []).filter(audiusOk).map(au) }]; },
  },
  soundcloud: {
    label: 'SoundCloud', keyless: false, kind: 'full', note: 'официальный API', enabled: () => !!(env().SOUNDCLOUD_CLIENT_ID && env().SOUNDCLOUD_CLIENT_SECRET),
    async search(q) { const t = await scToken(); const j = await getJson(`https://api.soundcloud.com/tracks?limit=30&access=playable&q=${encodeURIComponent(q)}`, { headers: { Authorization: `OAuth ${t}` } }); return (Array.isArray(j) ? j : []).map(sc); },
    async home() { const t = await scToken(); const j = await getJson('https://api.soundcloud.com/tracks?limit=24&access=playable&genres=pop', { headers: { Authorization: `OAuth ${t}` } }); return [{ id: 'sc-pop', title: 'SoundCloud: поп', items: (Array.isArray(j) ? j : []).map(sc) }]; },
    async direct(id) { const t = await scToken(); const j = await getJson(`https://api.soundcloud.com/tracks/${encodeURIComponent(id)}/streams`, { headers: { Authorization: `OAuth ${t}` } }); if (!j.http_mp3_128_url) throw new Error('нет потока'); return { url: j.http_mp3_128_url, kbps: 128, codec: 'mp3' }; },
  },
  spotify: {
    label: 'Spotify', keyless: false, kind: 'embed', note: 'каталог; аудио подбирается из других сервисов', enabled: () => !!(env().SPOTIFY_CLIENT_ID && env().SPOTIFY_CLIENT_SECRET),
    async search(q) { const t = await spToken(); const j = await getJson(`https://api.spotify.com/v1/search?type=track&limit=30&q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${t}` } }); return (j.tracks?.items || []).map(sp); },
    async home() {
      const t = await spToken();
      const j = await getJson(`https://api.spotify.com/v1/search?type=track&limit=20&q=${encodeURIComponent('year:' + new Date().getFullYear())}`, { headers: { Authorization: `Bearer ${t}` } });
      return [{ id: 'sp-year', title: 'Spotify: новое в этом году', items: (j.tracks?.items || []).map(sp) }];
    },
  },
  yandex: {
    label: 'Яндекс Музыка', keyless: false, kind: 'full', note: 'неофициальный API · выбор битрейта', enabled: () => !!env().YANDEX_TOKEN,
    async search(q) { const j = await getJson(`${YA}/search?type=track&page=0&text=${encodeURIComponent(q)}`, { headers: yaH() }); return (j.result?.tracks?.results || []).slice(0, 25).map(ya); },
    async home() { const j = await getJson(`${YA}/landing3/chart`, { headers: yaH() }).catch(() => null); const tr = j?.result?.chart?.tracks || []; return tr.length ? [{ id: 'ya-chart', title: 'Чарт Яндекс Музыки', layout: 'list', items: tr.slice(0, 30).map(x => ya(x.track || x)) }] : []; },
    direct: yandexDirect,
  },
  neo: {
    label: 'Neo', keyless: false, kind: 'full', note: 'загрузки сообщества', enabled: () => !!env().PB_URL,
    async search(q) { const c = q.replace(/["\\]/g, ''); const fl = `status="approved" && (title~"${c}" || artist~"${c}")`; const j = await getJson(`${env().PB_URL}/api/collections/tracks/records?perPage=30&sort=-created&filter=${encodeURIComponent(fl)}`); return (j.items || []).map(neoMap); },
    async home() { const j = await getJson(`${env().PB_URL}/api/collections/tracks/records?perPage=20&sort=-created&filter=${encodeURIComponent('status="approved"')}`); return [{ id: 'neo-new', title: 'Загрузки сообщества', items: (j.items || []).map(neoMap) }]; },
  },
};

export const ORDER = ['deezer', 'audius', 'itunes', 'soundcloud', 'yandex', 'spotify', 'neo'];
export const sourceList = () => ORDER.map(id => { const s = SOURCES[id]; return { id, label: s.label, enabled: !!s.enabled(), keyless: s.keyless, kind: s.kind, note: s.note }; });

export function pickSources(csv) {
  const want = csv ? String(csv).split(',').map(s => s.trim()) : ORDER;
  return ORDER.filter(id => want.includes(id) && SOURCES[id].enabled());
}

/** Параллельный поиск; ошибки одного источника не ломают остальные. Результаты чередуются по источникам. */
export async function searchAll(q, ids) {
  const res = await Promise.allSettled(ids.map(id => cache.wrap(`s:${id}:${norm(q)}`, 5 * MIN, () => SOURCES[id].search(q), 30_000)));
  const lists = [], failed = [];
  res.forEach((r, i) => r.status === 'fulfilled' ? lists.push(dedupe(r.value)) : failed.push({ id: ids[i], error: clampStr(r.reason?.message, 120) }));
  const out = [];
  for (let i = 0; out.length < 80 && lists.some(l => l[i]); i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return { items: out, failed };
}

export async function homeAll(ids) {
  const res = await Promise.allSettled(ids.filter(id => SOURCES[id].home).map(id => cache.wrap(`h:${id}:${region()}`, 10 * MIN, () => SOURCES[id].home(), 30_000)));
  const sections = res.flatMap(r => (r.status === 'fulfilled' ? r.value : [])).map(s => ({ ...s, items: dedupe(s.items).slice(0, 30) })).filter(s => s.items.length);
  return { sections };
}

/** Подбор воспроизводимого аудио для трека из каталога без потока (Spotify, Яндекс без токена). */
export function matchScore(want, cand) {
  const wt = norm(want.title), ct = norm(cand.title), wa = norm(want.artist), ca = norm(cand.artist);
  if (!wt || !ct) return 0;
  const titleOk = wt === ct || wt.includes(ct) || ct.includes(wt);
  if (!titleOk) return 0;
  const artistOk = !wa || !ca || wa.split(' ').some(w => w.length > 2 && ca.includes(w)) || ca.split(' ').some(w => w.length > 2 && wa.includes(w));
  if (!artistOk) return 0;
  let s = 3 + (wt === ct ? 1 : 0);
  if (want.dur && cand.dur) s += Math.abs(want.dur - cand.dur) <= 6 ? 1 : cand.preview ? 0 : -1;
  if (!cand.preview) s += 0.5;
  return s;
}

export async function resolveAudio(want) {
  const q = `${want.artist.split(',')[0]} ${want.title}`.trim();
  const ids = ['deezer', 'audius', 'itunes'].filter(id => SOURCES[id].enabled());
  const { items } = await searchAll(q, ids);
  let best = null, bs = 0;
  for (const c of items) { if (!c.audio) continue; const s = matchScore(want, c); if (s > bs) { best = c; bs = s; } }
  return best;
}

export async function directStream(src, id, quality) {
  const s = SOURCES[src];
  if (src === 'audius') { const h = await audiusHost(); return { url: `${h}/v1/tracks/${encodeURIComponent(id)}/stream?app_name=NeoMusic`, codec: 'mp3' }; }
  if (!s?.direct) throw new Error('unsupported');
  return cache.wrap(`d:${src}:${id}:${quality}`, 8 * MIN, () => s.direct(id, quality));
}

export async function trackById(src, id) {
  const s = SOURCES[src];
  if (!s?.track) throw new Error('unsupported');
  return cache.wrap(`t:${src}:${id}`, 30 * MIN, () => s.track(id));
}

export async function lyrics({ t, a, d }) {
  const p = new URLSearchParams({ track_name: t, artist_name: a });
  if (d) p.set('duration', d);
  return cache.wrap(`ly:${p}`, 6 * 60 * MIN, async () => {
    const h = { 'Lrclib-Client': 'NeoMusic/3.0' };
    try {
      const r = await http(`https://lrclib.net/api/get?${p}`, { headers: h, timeout: 6000 });
      if (r.ok) { const j = await r.json(); return { synced: j.syncedLyrics || '', plain: j.plainLyrics || '' }; }
      const s = await getJson(`https://lrclib.net/api/search?track_name=${encodeURIComponent(t)}&artist_name=${encodeURIComponent(a)}`, { headers: h, timeout: 6000 });
      const j = (Array.isArray(s) && (s.find(x => x.syncedLyrics) || s[0])) || {};
      return { synced: j.syncedLyrics || '', plain: j.plainLyrics || '' };
    } catch { return { synced: '', plain: '' }; }
  });
}
