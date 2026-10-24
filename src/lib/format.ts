import type { Track } from './types';

export const tkey = (t: Pick<Track, 'src' | 'id'>) => `${t.src}:${t.id}`;

export const fmtTime = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
};

/** Детерминированный градиент для обложки-заглушки */
export const hashHue = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 360;
};

export const placeholderBg = (seed: string) => {
  const h = hashHue(seed);
  return `linear-gradient(135deg, hsl(${h} 70% 52%), hsl(${(h + 48) % 360} 72% 38%))`;
};

export const norm = (s: string) =>
  s.toLowerCase().replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/feat\.?|ft\.?|remaster(ed)?|\d{4}/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => {
  let t: ReturnType<typeof setTimeout>;
  const d = (...a: A) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.cancel = () => clearTimeout(t);
  return d;
};

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));

export const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
};
