// Лёгкий прокси без зависимостей: прячет ключи, нормализует ответы, кэширует.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
if (existsSync('.env')) for (const l of readFileSync('.env', 'utf8').split('\n')) { const [k, ...v] = l.split('='); if (k && v.length) process.env[k.trim()] ??= v.join('=').trim(); }
const e = process.env, cache = new Map(), TTL = 5 * 60e3;
const cached = async (key, fn) => { const h = cache.get(key); if (h && h.t > Date.now()) return h.v; const v = await fn(); cache.set(key, { v, t: Date.now() + TTL }); if (cache.size > 500) cache.delete(cache.keys().next().value); return v; };
const tokens = {};
async function token(name, url, id, secret) {
  const t = tokens[name]; if (t && t.exp > Date.now()) return t.v;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(id + ':' + secret).toString('base64') }, body: 'grant_type=client_credentials' });
  const j = await r.json(); tokens[name] = { v: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1e3 }; return j.access_token;
}
const src = {
  async spotify(q) {
    if (!e.SPOTIFY_CLIENT_ID) throw 'Не задан SPOTIFY_CLIENT_ID';
    const t = await token('sp', 'https://accounts.spotify.com/api/token', e.SPOTIFY_CLIENT_ID, e.SPOTIFY_CLIENT_SECRET);
    const j = await (await fetch('https://api.spotify.com/v1/search?type=track&limit=30&q=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + t } })).json();
    return (j.tracks?.items || []).map(x => ({ id: x.id, src: 'spotify', title: x.name, artist: x.artists.map(a => a.name).join(', '), cover: x.album.images[1]?.url, uri: 'spotify:track:' + x.id, embed: 'https://open.spotify.com/embed/track/' + x.id, url: x.external_urls?.spotify }));
  },
  async soundcloud(q) {
    if (!e.SOUNDCLOUD_CLIENT_ID) throw 'Не задан SOUNDCLOUD_CLIENT_ID';
    const t = await token('sc', 'https://secure.soundcloud.com/oauth/token', e.SOUNDCLOUD_CLIENT_ID, e.SOUNDCLOUD_CLIENT_SECRET);
    const j = await (await fetch('https://api.soundcloud.com/tracks?limit=30&q=' + encodeURIComponent(q), { headers: { Authorization: 'OAuth ' + t } })).json();
    return (Array.isArray(j) ? j : []).map(x => ({ id: String(x.id), src: 'soundcloud', title: x.title, artist: x.user?.username, cover: x.artwork_url?.replace('large', 't300x300'), embed: 'https://w.soundcloud.com/player/?auto_play=true&url=' + encodeURIComponent(x.permalink_url), url: x.permalink_url, audio: x.streamable !== false ? '/api/stream?id=' + x.id : undefined }));
  },
  async yandex(q) {
    if (!e.YANDEX_TOKEN) throw 'Не задан YANDEX_TOKEN';
    const j = await (await fetch('https://api.music.yandex.net/search?type=track&page=0&text=' + encodeURIComponent(q), { headers: { Authorization: 'OAuth ' + e.YANDEX_TOKEN } })).json();
    return (j.result?.tracks?.results || []).slice(0, 20).map(x => ({ id: String(x.id), src: 'yandex', title: x.title, artist: x.artists.map(a => a.name).join(', '), cover: x.coverUri ? 'https://' + x.coverUri.replace('%%', '300x300') : '', embed: `https://music.yandex.ru/iframe/track/${x.id}/${x.albums?.[0]?.id}`, url: `https://music.yandex.ru/track/${x.id}` }));
  }
};
src.news = async () => {
  const out = {};
  if (e.SPOTIFY_CLIENT_ID) { const t = await token('sp', 'https://accounts.spotify.com/api/token', e.SPOTIFY_CLIENT_ID, e.SPOTIFY_CLIENT_SECRET);
    const j = await (await fetch('https://api.spotify.com/v1/browse/new-releases?limit=20', { headers: { Authorization: 'Bearer ' + t } })).json();
    out.spotify = (j.albums?.items || []).map(x => ({ id: x.id, src: 'spotify', title: x.name, artist: x.artists.map(a => a.name).join(', '), cover: x.images[1]?.url, uri: 'spotify:album:' + x.id, ctx: true, embed: 'https://open.spotify.com/embed/album/' + x.id, url: x.external_urls?.spotify })); }
  if (e.SOUNDCLOUD_CLIENT_ID) { const t = await token('sc', 'https://secure.soundcloud.com/oauth/token', e.SOUNDCLOUD_CLIENT_ID, e.SOUNDCLOUD_CLIENT_SECRET);
    const j = await (await fetch('https://api.soundcloud.com/tracks?limit=30&access=playable&genres=pop', { headers: { Authorization: 'OAuth ' + t } })).json();
    out.soundcloud = (Array.isArray(j) ? j : []).map(x => ({ id: String(x.id), src: 'soundcloud', title: x.title, artist: x.user?.username, cover: x.artwork_url?.replace('large', 't300x300'), embed: 'https://w.soundcloud.com/player/?auto_play=true&url=' + encodeURIComponent(x.permalink_url), url: x.permalink_url, audio: '/api/stream?id=' + x.id })); }
  if (e.PB_URL) out.neo = await src.neo('').catch(() => []);
  return out;
};
const pbMap = x => { const f = n => `${e.PB_URL}/api/files/tracks/${x.id}/${n}`; return { id: x.id, src: 'neo', title: x.title, artist: x.artist, lyrics: x.lyrics, cover: x.cover ? f(x.cover) : '', audio: f(x.audio), url: f(x.audio) }; };
src.neo = async q => { if (!e.PB_URL) throw 'Не задан PB_URL'; const c = (q || '').replace(/["\\]/g, ''); const fl = 'status="approved"' + (c ? ` && (title~"${c}" || artist~"${c}")` : ''); const j = await (await fetch(`${e.PB_URL}/api/collections/tracks/records?perPage=30&sort=-created&filter=${encodeURIComponent(fl)}`)).json(); return (j.items || []).map(pbMap); };
src.all = async q => { const r = await Promise.allSettled(['neo', 'spotify', 'soundcloud', 'yandex'].filter(k => e[{ neo: 'PB_URL', spotify: 'SPOTIFY_CLIENT_ID', soundcloud: 'SOUNDCLOUD_CLIENT_ID', yandex: 'YANDEX_TOKEN' }[k]]).map(k => src[k](q))); const l = r.filter(x => x.status === 'fulfilled').map(x => x.value), o = []; for (let i = 0; l.some(a => a[i]); i++) for (const a of l) if (a[i]) o.push(a[i]); return o; };
export { src, e };
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.json': 'application/json' };
http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (c, b, t = 'application/json') => { res.writeHead(c, { 'Content-Type': t + '; charset=utf-8' }); res.end(b); };
  if (u.pathname === '/api/config') return send(200, JSON.stringify({ spotify: e.SPOTIFY_CLIENT_ID || '' }));
  if (u.pathname === '/api/charts') { try { return send(200, JSON.stringify(await cached('charts', async () => ((await (await fetch('https://api.deezer.com/chart/0/tracks?limit=50')).json()).data || []).map(x => ({ id: String(x.id), src: 'deezer', title: x.title, artist: x.artist?.name, cover: x.album?.cover_medium, audio: x.preview, url: x.link }))))); } catch { return send(200, '[]'); } }
  if (u.pathname === '/api/lyrics') { // синхронные тексты (LRC) из открытой базы LRCLIB
    const p = new URLSearchParams({ track_name: u.searchParams.get('t') || '', artist_name: u.searchParams.get('a') || '' }), h = { 'User-Agent': 'NeoMusic/2.0' };
    try { const j = await cached('ly' + p, async () => { const r = await fetch('https://lrclib.net/api/get?' + p, { headers: h }); if (r.ok) return r.json(); const s = await (await fetch('https://lrclib.net/api/search?' + p, { headers: h })).json(); return s.find(x => x.syncedLyrics) || s[0] || {}; }); return send(200, JSON.stringify({ synced: j.syncedLyrics || '', plain: j.plainLyrics || '' })); } catch { return send(200, '{}'); } }
  if (u.pathname === '/api/new') { try { return send(200, JSON.stringify(await cached('news', src.news))); } catch (err) { return send(502, JSON.stringify({ error: String(err) })); } }
  if (u.pathname === '/api/stream') { // полный трек через официальный SoundCloud API (только то, что артист разрешил стримить)
    try { const t = await token('sc', 'https://secure.soundcloud.com/oauth/token', e.SOUNDCLOUD_CLIENT_ID, e.SOUNDCLOUD_CLIENT_SECRET);
      const j = await cached('st' + u.searchParams.get('id'), async () => (await fetch(`https://api.soundcloud.com/tracks/${encodeURIComponent(u.searchParams.get('id'))}/streams`, { headers: { Authorization: 'OAuth ' + t } })).json());
      const l = j.http_mp3_128_url; if (!l) return send(404, '{"error":"no stream"}'); res.writeHead(302, { Location: l }); return res.end(); } catch { return send(502, '{"error":"stream"}'); } }
  if (u.pathname === '/api/search') {
    const q = u.searchParams.get('q')?.trim(), s = u.searchParams.get('src');
    if (!q || !src[s] || s === 'news') return send(400, '{"error":"bad request"}');
    try { return send(200, JSON.stringify(await cached(s + q.toLowerCase(), () => src[s](q)))); } catch (err) { return send(502, JSON.stringify({ error: String(err) })); }
  }
  try { const p = join('public', normalize(u.pathname === '/' ? '/index.html' : u.pathname).replace(/^(\.\.[/\\])+/, '')); send(200, await readFile(p), types[extname(p)] || 'text/plain'); } catch { send(404, 'Not found', 'text/plain'); }
}).listen(e.PORT || 3000, () => console.log('http://localhost:' + (e.PORT || 3000)));

import('./bot.js');
