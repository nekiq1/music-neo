// Общие утилиты сервера: загрузка .env, fetch с таймаутом, кэш с дедупликацией запросов, лимит частоты.
import { existsSync, readFileSync } from 'node:fs';

export function loadEnv(file = '.env') {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][\w]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#')) process.env[m[1]] ??= m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

export const UA = 'NeoMusic/3.0 (+https://t.me)';

/** fetch с таймаутом; бросает Error с понятным текстом. */
export async function http(url, { timeout = 7000, ...init } = {}) {
  const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init.headers }, signal: AbortSignal.timeout(timeout), redirect: init.redirect || 'follow' });
  return r;
}

export async function getJson(url, init) {
  const r = await http(url, init);
  if (!r.ok) throw new Error(`${new URL(url).hostname}: HTTP ${r.status}`);
  return r.json();
}

export function createCache(max = 600) {
  const m = new Map(), flight = new Map();
  return {
    /** Возвращает значение из кэша или вычисляет; параллельные запросы с одним ключом делят один вызов. */
    async wrap(key, ttlMs, fn, failTtlMs = 0) {
      const h = m.get(key);
      if (h && h.exp > Date.now()) { if (h.err) throw h.err; return h.v; }
      if (flight.has(key)) return flight.get(key);
      const p = (async () => {
        try {
          const v = await fn();
          m.set(key, { v, exp: Date.now() + ttlMs });
          if (m.size > max) m.delete(m.keys().next().value);
          return v;
        } catch (err) {
          // упавший источник помним недолго, чтобы он не тормозил каждый поиск таймаутом
          if (failTtlMs) m.set(key, { err, exp: Date.now() + failTtlMs });
          throw err;
        } finally { flight.delete(key); }
      })();
      flight.set(key, p);
      return p;
    },
    clear() { m.clear(); },
    get size() { return m.size; },
  };
}

/** Скользящий лимит запросов на ключ (IP). */
export function createLimiter({ limit = 120, windowMs = 60_000 } = {}) {
  const hits = new Map();
  const timer = setInterval(() => { const t = Date.now(); for (const [k, v] of hits) if (v.reset < t) hits.delete(k); }, windowMs);
  timer.unref?.();
  return key => {
    const now = Date.now();
    let h = hits.get(key);
    if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
    h.n++;
    return h.n <= limit;
  };
}

export const norm = s => String(s || '').toLowerCase()
  .replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/\b(feat|ft|remaster(ed)?|version|explicit|radio edit)\b\.?/g, ' ')
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const clampStr = (s, n) => String(s ?? '').slice(0, n);
