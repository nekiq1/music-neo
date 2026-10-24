// Один Node-процесс: сайт + Mini App + API + Telegram-бот. Зависимостей нет.
import http from 'node:http';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clampStr, createLimiter, loadEnv } from './util.js';
import { verifyInitData } from './tg-auth.js';
import { directStream, homeAll, lyrics, pickSources, resolveAudio, searchAll, sourceList, trackById } from './sources.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
loadEnv(join(ROOT, '.env'));
const e = process.env;
const DIST = join(ROOT, 'dist'), DATA = e.DATA_DIR ? resolve(e.DATA_DIR) : join(ROOT, 'data', 'users');
const VERSION = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain' };
const limiter = createLimiter({ limit: Number(e.RATE_LIMIT) || 150, windowMs: 60_000 });
const syncLimiter = createLimiter({ limit: 30, windowMs: 60_000 });

// ── CSP: inline-скрипт темы из index.html разрешаем по хэшу, а не через 'unsafe-inline' ──
function buildCsp() {
  let hashes = '';
  try {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => `'sha256-${createHash('sha256').update(m[1]).digest('base64')}'`).join(' ');
  } catch { /* dist ещё не собран */ }
  return [
    "default-src 'self'", `script-src 'self' ${hashes} https://telegram.org`, "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:", "media-src 'self' blob: https:", "connect-src 'self'",
    'frame-src https://open.spotify.com https://w.soundcloud.com https://music.yandex.ru https://music.yandex.com',
    "frame-ancestors 'self' https://web.telegram.org https://webk.telegram.org https://webz.telegram.org https://*.telegram.org",
    "base-uri 'none'", "form-action 'self'", "object-src 'none'",
  ].join('; ');
}
let CSP = buildCsp();

const SEC = () => ({
  'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  ...(e.WEBAPP_URL?.startsWith('https') ? { 'Strict-Transport-Security': 'max-age=31536000' } : {}),
});

const json = (res, code, body, extra = {}) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC(), ...extra });
  res.end(JSON.stringify(body));
};
const bad = (res, msg, code = 400) => json(res, code, { error: msg });
const ip = req => (e.TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || 'x';

// ── хранилище синхронизации: data/users/<telegramId>.json, запись атомарная ──
const MAX_SYNC = 600 * 1024;
async function readBody(req, max) {
  let n = 0; const chunks = [];
  for await (const c of req) { n += c.length; if (n > max) throw Object.assign(new Error('too large'), { code: 413 }); chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}
const userFile = id => join(DATA, `${id}.json`);

async function handleSync(req, res) {
  if (!e.BOT_TOKEN) return bad(res, 'Синхронизация не настроена', 501);
  const auth = verifyInitData(req.headers['x-tg-init-data'], e.BOT_TOKEN);
  if (!auth) return bad(res, 'Неверная подпись Telegram', 401);
  if (!syncLimiter(String(auth.id))) return bad(res, 'Слишком часто', 429);
  if (req.method === 'GET') {
    try { return json(res, 200, JSON.parse(await readFile(userFile(auth.id), 'utf8'))); } catch { return json(res, 200, {}); }
  }
  if (req.method === 'PUT') {
    let body;
    try { body = JSON.parse(await readBody(req, MAX_SYNC)); } catch (err) {
      if (err.code === 413) { res.once('finish', () => req.destroy()); return json(res, 413, { error: 'Слишком большие данные' }, { Connection: 'close' }); }
      return bad(res, 'Некорректный JSON');
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return bad(res, 'Некорректные данные');
    const clean = { settings: body.settings && typeof body.settings === 'object' ? body.settings : undefined, favs: Array.isArray(body.favs) ? body.favs.slice(0, 500) : undefined, favUpdatedAt: +body.favUpdatedAt || 0, playlists: Array.isArray(body.playlists) ? body.playlists.slice(0, 50) : undefined, plUpdatedAt: +body.plUpdatedAt || 0 };
    await mkdir(DATA, { recursive: true });
    const tmp = `${userFile(auth.id)}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(clean));
    await rename(tmp, userFile(auth.id));
    return json(res, 200, { ok: true });
  }
  return bad(res, 'Метод не поддерживается', 405);
}

// ── API ──
async function api(req, res, u) {
  const q = u.searchParams, p = u.pathname;
  if (p === '/api/sync') return handleSync(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') return bad(res, 'Метод не поддерживается', 405);

  if (p === '/api/health') return json(res, 200, { ok: true, version: VERSION });
  if (p === '/api/config') return json(res, 200, { sources: sourceList(), pb: e.PB_URL ? '1' : '', bot: { username: e.BOT_USERNAME || '', app: e.BOT_APP_SHORTNAME || '' }, loader: e.LOADER_BOT || 'loaditbot', version: VERSION }, { 'Cache-Control': 'public, max-age=60' });

  if (p === '/api/search') {
    const term = clampStr(q.get('q'), 120).trim();
    if (term.length < 2) return bad(res, 'Слишком короткий запрос');
    const ids = pickSources(q.get('sources'));
    if (!ids.length) return json(res, 200, { items: [], failed: [] });
    return json(res, 200, await searchAll(term, ids), { 'Cache-Control': 'private, max-age=60' });
  }
  if (p === '/api/home') return json(res, 200, await homeAll(pickSources(q.get('sources'))), { 'Cache-Control': 'public, max-age=120' });

  if (p === '/api/track') {
    try { return json(res, 200, await trackById(q.get('src') || '', clampStr(q.get('id'), 80)), { 'Cache-Control': 'public, max-age=600' }); }
    catch { return bad(res, 'Трек не найден', 404); }
  }
  if (p === '/api/lyrics') {
    const t = clampStr(q.get('t'), 150), a = clampStr(q.get('a'), 150);
    if (!t) return bad(res, 'Нужно название');
    return json(res, 200, await lyrics({ t, a, d: q.get('d') }), { 'Cache-Control': 'public, max-age=3600' });
  }
  if (p === '/api/resolve') {
    const title = clampStr(q.get('title'), 150), artist = clampStr(q.get('artist'), 150);
    if (!title) return bad(res, 'Нужно название');
    const track = await resolveAudio({ title, artist, dur: Number(q.get('d')) || undefined }).catch(() => null);
    return json(res, 200, { track }, { 'Cache-Control': 'public, max-age=600' });
  }
  if (p === '/api/stream') {
    const src = q.get('src') || '', id = clampStr(q.get('id'), 80), quality = ['low', 'medium', 'high'].includes(q.get('q')) ? q.get('q') : 'high';
    try {
      const s = await directStream(src, id, quality);
      if (q.get('json')) return json(res, 200, s);
      res.writeHead(302, { Location: s.url, 'Cache-Control': 'no-store', ...SEC() });
      return res.end();
    } catch { return bad(res, 'Поток недоступен', 404); }
  }
  return bad(res, 'Не найдено', 404);
}

// ── статика ──
async function serveStatic(req, res, u) {
  let rel;
  try { rel = decodeURIComponent(u.pathname); } catch { return bad(res, 'bad path'); }
  if (rel.includes('\0')) return bad(res, 'bad path');
  let file = normalize(join(DIST, rel === '/' ? 'index.html' : rel));
  if (file !== DIST && !file.startsWith(DIST + sep)) return bad(res, 'bad path', 403);
  let st = await stat(file).catch(() => null);
  const spa = !st || st.isDirectory();
  if (spa) { if (extname(rel)) { res.writeHead(404, SEC()); return res.end('Not found'); } file = join(DIST, 'index.html'); st = await stat(file).catch(() => null); }
  if (!st) { res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Фронтенд не собран. Выполните: npm run build'); }
  const ext = extname(file), hashed = file.includes(`${sep}assets${sep}`);
  const etag = `W/"${st.size}-${Math.floor(st.mtimeMs)}"`;
  const headers = { 'Content-Type': `${MIME[ext] || 'application/octet-stream'}${/text|json|javascript|svg/.test(MIME[ext] || '') ? '; charset=utf-8' : ''}`, 'Cache-Control': hashed ? 'public, max-age=31536000, immutable' : file.endsWith('sw.js') || ext === '.html' ? 'no-cache' : 'public, max-age=86400', ETag: etag, ...SEC() };
  if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); return res.end(); }
  res.writeHead(200, { ...headers, 'Content-Length': st.size });
  if (req.method === 'HEAD') return res.end();
  createReadStream(file).pipe(res);
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url, 'http://x');
      if (u.pathname.startsWith('/api/')) {
        if (!limiter(ip(req))) return bad(res, 'Слишком много запросов, подождите минуту', 429);
        return await api(req, res, u);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      await serveStatic(req, res, u);
    } catch (err) {
      console.error('request error:', err?.message || err);
      if (!res.headersSent) bad(res, 'Внутренняя ошибка сервера', 500); else res.end();
    }
  });
}

export const refreshCsp = () => { CSP = buildCsp(); };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(e.PORT) || 3000;
  const server = createServer();
  server.listen(port, () => {
    console.log(`Neo Music v${VERSION}: http://localhost:${port}${existsSync(DIST) ? '' : '  (dist не собран: npm run build)'}`);
    console.log('Источники:', sourceList().filter(s => s.enabled).map(s => s.id).join(', '));
  });
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
  if (e.BOT_TOKEN) import('./bot.js').then(m => m.startBot()).catch(err => console.error('bot:', err.message));
}
