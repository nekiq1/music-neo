import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TOKEN = '123456:TEST-TOKEN';
const tmp = mkdtempSync(join(tmpdir(), 'neo-'));
process.env.BOT_TOKEN = TOKEN;
process.env.DATA_DIR = tmp;
process.env.BOT_USERNAME = 'neo_test_bot';
process.env.LOADER_BOT = 'loaditbot';
process.env.WEBAPP_URL = 'https://neo.example';
delete process.env.SPOTIFY_CLIENT_ID; delete process.env.YANDEX_TOKEN; delete process.env.SOUNDCLOUD_CLIENT_ID; delete process.env.PB_URL;

// ── подменяем fetch: никакой реальной сети ──
const realFetch = globalThis.fetch;
const calls = [];
const J = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async (url, init) => {
  const u = new URL(String(url));
  if (u.hostname === '127.0.0.1') return realFetch(url, init);
  calls.push(u.hostname + u.pathname);
  if (u.hostname === 'api.deezer.com' && u.pathname === '/search') return J({ data: [
    { id: 1, title: 'Blinding Lights', title_short: 'Blinding Lights', artist: { name: 'The Weeknd' }, album: { cover_small: 's', cover_medium: 'm', cover_xl: 'xl' }, preview: 'https://cdn/p1.mp3', duration: 200, link: 'https://deezer/1' },
  ] });
  if (u.hostname === 'api.deezer.com' && u.pathname === '/chart/0/tracks') return J({ data: [{ id: 9, title: 'Hit', artist: { name: 'Star' }, album: {}, preview: 'https://cdn/h.mp3', duration: 180 }] });
  if (u.hostname === 'itunes.apple.com') return J({}, 500); // iTunes «лежит»
  if (u.hostname === 'rss.applemarketingtools.com') return J({}, 500);
  if (u.hostname === 'api.audius.co') return J({ data: ['https://disc.audius.test'] });
  if (u.hostname === 'disc.audius.test' && u.pathname === '/v1/tracks/search') return J({ data: [
    { id: 'AB1', title: 'Blinding Lights (Cover)', user: { name: 'Indie' }, artwork: { '480x480': 'a' }, duration: 201, permalink: '/indie/bl', is_streamable: true },
    { id: 'DEL', title: 'Deleted', user: { name: 'X' }, is_delete: true },
  ] });
  if (u.hostname === 'disc.audius.test' && u.pathname === '/v1/tracks/trending') return J({ data: [] });
  if (u.hostname === 'lrclib.net') return J({ syncedLyrics: '[00:01.00] hi', plainLyrics: 'hi' });
  return J({ error: 'unexpected ' + u.hostname }, 404);
};

const { createServer } = await import('../server/index.js');
const src = await import('../server/sources.js');
const { verifyInitData, signInitData } = await import('../server/tg-auth.js');
const bot = await import('../server/bot.js');

let server, base;
before(async () => { server = createServer(); await new Promise(r => server.listen(0, '127.0.0.1', r)); base = `http://127.0.0.1:${server.address().port}`; });
after(() => { server.close(); rmSync(tmp, { recursive: true, force: true }); globalThis.fetch = realFetch; });

const get = (p, init) => realFetch(base + p, { redirect: 'manual', ...init });

// ───────── Telegram initData ─────────
const fresh = (extra = {}) => signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 42, first_name: 'A' }), query_id: 'q', ...extra }, TOKEN);

test('initData: корректная подпись принимается', () => assert.equal(verifyInitData(fresh(), TOKEN)?.id, 42));
test('initData: чужой токен отклоняется', () => assert.equal(verifyInitData(fresh(), '999:OTHER'), null));
test('initData: подделка поля отклоняется', () => assert.equal(verifyInitData(fresh().replace('%22id%22%3A42', '%22id%22%3A43'), TOKEN), null));
test('initData: просроченная отклоняется', () => {
  const old = signInitData({ auth_date: String(Math.floor(Date.now() / 1000) - 90000), user: JSON.stringify({ id: 1 }) }, TOKEN);
  assert.equal(verifyInitData(old, TOKEN), null);
});
test('initData: пустое и мусор', () => { assert.equal(verifyInitData('', TOKEN), null); assert.equal(verifyInitData('hash=zzz', TOKEN), null); });

// ───────── Яндекс: выбор битрейта ─────────
const yaInfo = [{ codec: 'mp3', bitrateInKbps: 64 }, { codec: 'mp3', bitrateInKbps: 192 }, { codec: 'mp3', bitrateInKbps: 320 }, { codec: 'aac', bitrateInKbps: 128 }];
test('Яндекс: low → минимум, medium → 192, high → максимум', () => {
  assert.equal(src.pickYandexVariant(yaInfo, 'low').bitrateInKbps, 64);
  assert.equal(src.pickYandexVariant(yaInfo, 'medium').bitrateInKbps, 192);
  assert.equal(src.pickYandexVariant(yaInfo, 'high').bitrateInKbps, 320);
  assert.equal(src.pickYandexVariant([], 'high'), null);
});

// ───────── Подбор аудио ─────────
test('matchScore: совпадение названия и артиста', () => {
  const want = { title: 'Blinding Lights', artist: 'The Weeknd', dur: 200 };
  assert.ok(src.matchScore(want, { title: 'Blinding Lights - Remastered', artist: 'The Weeknd', dur: 201, preview: true }) > 3);
  assert.equal(src.matchScore(want, { title: 'Another Song', artist: 'The Weeknd' }), 0);
  assert.equal(src.matchScore(want, { title: 'Blinding Lights', artist: 'Totally Different Band' }), 0);
});

// ───────── Поиск ─────────
test('searchAll: падение одного источника не ломает остальные', async () => {
  const r = await src.searchAll('blinding lights', ['deezer', 'itunes', 'audius']);
  assert.equal(r.items.length, 2);
  assert.deepEqual(r.failed.map(f => f.id), ['itunes']);
  assert.equal(r.items[0].src, 'deezer'); // чередование источников
  assert.ok(r.items.every(t => t.id !== 'DEL')); // удалённые треки отфильтрованы
});

test('кэш: повторный поиск не ходит в сеть', async () => {
  const n = calls.length;
  await src.searchAll('blinding lights', ['deezer', 'itunes', 'audius']);
  assert.equal(calls.length, n);
});

// ───────── HTTP API ─────────
test('/api/config: источники без ключей включены, остальные — нет', async () => {
  const j = await (await get('/api/config')).json();
  const on = Object.fromEntries(j.sources.map(s => [s.id, s.enabled]));
  assert.deepEqual([on.deezer, on.itunes, on.audius], [true, true, true]);
  assert.deepEqual([on.spotify, on.yandex, on.soundcloud, on.neo], [false, false, false, false]);
  assert.equal(j.loader, 'loaditbot');
});

test('/api/search: короткий запрос → 400, нормальный → треки', async () => {
  assert.equal((await get('/api/search?q=a')).status, 400);
  const j = await (await get('/api/search?q=blinding%20lights&sources=deezer')).json();
  assert.equal(j.items[0].title, 'Blinding Lights');
  assert.equal(j.items[0].audio, 'https://cdn/p1.mp3');
});

test('/api/search: выключенный источник игнорируется', async () => {
  const j = await (await get('/api/search?q=blinding%20lights&sources=spotify')).json();
  assert.deepEqual(j, { items: [], failed: [] });
});

test('/api/home: возвращает секции', async () => {
  const j = await (await get('/api/home?sources=deezer')).json();
  assert.equal(j.sections[0].id, 'deezer-top');
  assert.equal(j.sections[0].layout, 'list');
});

test('/api/stream: Audius → 302 на хост-провайдер, json=1 отдаёт ссылку', async () => {
  const r = await get('/api/stream?src=audius&id=AB1');
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /^https:\/\/disc\.audius\.test\/v1\/tracks\/AB1\/stream/);
  const j = await (await get('/api/stream?src=audius&id=AB1&json=1')).json();
  assert.equal(j.codec, 'mp3');
  assert.equal((await get('/api/stream?src=nope&id=1')).status, 404);
});

test('/api/lyrics: синхронные строки', async () => {
  const j = await (await get('/api/lyrics?t=Song&a=Artist')).json();
  assert.match(j.synced, /\[00:01/);
});

test('/api/resolve: подбирает аудио для трека без потока', async () => {
  const j = await (await get('/api/resolve?title=Blinding%20Lights&artist=The%20Weeknd&d=200')).json();
  assert.equal(j.track?.src, 'deezer');
});

// ───────── Синхронизация ─────────
test('/api/sync: без подписи → 401', async () => {
  assert.equal((await get('/api/sync')).status, 401);
  assert.equal((await get('/api/sync', { headers: { 'X-Tg-Init-Data': 'hash=' + '0'.repeat(64) } })).status, 401);
});

test('/api/sync: PUT → GET возвращает те же данные, пользователи изолированы', async () => {
  const h = { 'X-Tg-Init-Data': fresh(), 'Content-Type': 'application/json' };
  const body = { settings: { quality: 'low', updatedAt: 5 }, favs: [{ id: '1', src: 'deezer', title: 'T', artist: 'A' }], favUpdatedAt: 7, playlists: [], plUpdatedAt: 3 };
  assert.equal((await get('/api/sync', { method: 'PUT', headers: h, body: JSON.stringify(body) })).status, 200);
  const j = await (await get('/api/sync', { headers: h })).json();
  assert.equal(j.settings.quality, 'low'); assert.equal(j.favs.length, 1); assert.equal(j.favUpdatedAt, 7);
  const other = { 'X-Tg-Init-Data': signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id: 77 }) }, TOKEN) };
  assert.deepEqual(await (await get('/api/sync', { headers: other })).json(), {});
});

test('/api/sync: слишком большое тело → 413', async () => {
  const h = { 'X-Tg-Init-Data': fresh(), 'Content-Type': 'application/json' };
  const r = await get('/api/sync', { method: 'PUT', headers: h, body: JSON.stringify({ favs: [], pad: 'x'.repeat(700 * 1024) }) });
  assert.equal(r.status, 413);
});

// ───────── Статика и безопасность ─────────
test('заголовки безопасности и CSP', async () => {
  const r = await get('/api/health');
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  const csp = r.headers.get('content-security-policy');
  assert.match(csp, /frame-ancestors[^;]*web\.telegram\.org/);
  assert.match(csp, /object-src 'none'/);
});

test('статика: обход каталогов не отдаёт файлы вне dist', async () => {
  for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/.env', '/assets/..%2f..%2fpackage.json']) {
    const r = await get(p);
    const t = await r.text();
    assert.ok(!t.includes('"name": "music-neo"') && !t.includes('BOT_TOKEN'), `утечка по ${p}`);
  }
});

test('статика: неизвестный файл с расширением → 404, маршрут без расширения → SPA', async () => {
  assert.equal((await get('/nope.js')).status, 404);
  const r = await get('/library');
  assert.ok([200, 503].includes(r.status)); // 503, если dist не собран
});

test('неверный метод на /api → 405', async () => assert.equal((await get('/api/search?q=abc', { method: 'POST' })).status, 405));

// ───────── Бот ─────────
test('бот: callback_data ≤ 64 байт и HTML экранируется', () => {
  const items = [{ src: 'spotify', id: '4cOdK2wGLETKBW3PvgPWqT', title: '<b>x</b>', artist: 'A&B' }, { src: 'yandex', id: '12345678:87654321', title: 't', artist: 'a' }];
  for (const row of bot.resultsKeyboard(items).inline_keyboard) for (const b of row) assert.ok(Buffer.byteLength(b.callback_data) <= 64);
  const text = bot.resultsText('q<', items);
  assert.ok(!text.includes('<b>x</b>') && text.includes('&lt;b&gt;x&lt;/b&gt;') && text.includes('A&amp;B'));
});

test('бот: карточка трека ведёт в Mini App и к @loaditbot', () => {
  const t = { src: 'deezer', id: '1', title: 'T', artist: 'A', audio: 'https://x/a.mp3', url: 'https://deezer/1' };
  const kb = JSON.stringify(bot.trackKeyboard(t, 'private', true));
  assert.match(kb, /web_app/); assert.match(kb, /https:\/\/neo\.example\/\?t=deezer%3A1/);
  assert.match(kb, /t\.me\/loaditbot/); assert.match(kb, /"callback_data":"a:deezer:1"/);
  assert.doesNotMatch(JSON.stringify(bot.trackKeyboard(t, 'group', false)), /web_app/); // в группах web_app запрещён
});

test('бот: диплинк startapp с коротким именем приложения', () => {
  process.env.BOT_APP_SHORTNAME = 'play';
  assert.equal(bot.miniAppLink({ src: 'audius', id: 'AB1' }), 'https://t.me/neo_test_bot/play?startapp=t_audius_AB1');
  delete process.env.BOT_APP_SHORTNAME;
});
