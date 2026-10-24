import { hashHue } from './format';
import { resolveDark } from './settings';

interface HSL { h: number; s: number; l: number }
export type Palette = [HSL, HSL, HSL];

const cache = new Map<string, Palette>();

const fallback = (seed: string): Palette => {
  const h = hashHue(seed);
  return [{ h, s: 78, l: 54 }, { h: (h + 52) % 360, s: 80, l: 58 }, { h: (h + 190) % 360, s: 70, l: 48 }];
};

function rgb2hsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

/** Доминирующие цвета обложки; если картинку нельзя прочитать (CORS) — цвета из названия. */
export async function paletteFor(url: string | undefined, seed: string): Promise<Palette> {
  const key = url || seed;
  const hit = cache.get(key);
  if (hit) return hit;
  let p = fallback(seed);
  if (url) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((ok, bad) => {
        img.onload = () => ok(); img.onerror = () => bad(new Error('img'));
        img.src = url; setTimeout(() => bad(new Error('timeout')), 4000);
      });
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(img, 0, 0, 24, 24);
      const d = g.getImageData(0, 0, 24, 24).data; // бросит SecurityError, если холст «грязный»
      const buckets = Array.from({ length: 12 }, () => ({ w: 0, h: 0, s: 0, l: 0 }));
      for (let i = 0; i < d.length; i += 4) {
        const c2 = rgb2hsl(d[i], d[i + 1], d[i + 2]);
        if (c2.s < 18 || c2.l < 12 || c2.l > 92) continue;
        const b = buckets[Math.floor(c2.h / 30) % 12], w = c2.s * (1 - Math.abs(c2.l - 50) / 60);
        b.w += w; b.h += c2.h * w; b.s += c2.s * w; b.l += c2.l * w;
      }
      const top = buckets.filter(b => b.w > 0).sort((a, b) => b.w - a.w).slice(0, 3)
        .map(b => ({ h: b.h / b.w, s: Math.min(90, Math.max(55, b.s / b.w)), l: Math.min(62, Math.max(42, b.l / b.w)) }));
      if (top.length) {
        const f = fallback(seed);
        p = [top[0], top[1] || { ...top[0], h: (top[0].h + 40) % 360 }, top[2] || f[2]];
      }
    } catch { /* остаётся палитра из названия */ }
  }
  cache.set(key, p);
  if (cache.size > 80) cache.delete(cache.keys().next().value as string);
  return p;
}

const css = (c: HSL, dl = 0) => `hsl(${c.h.toFixed(0)} ${c.s.toFixed(0)}% ${(c.l + dl).toFixed(0)}%)`;

export function applyAmbient(p: Palette) {
  const r = document.documentElement.style, dark = resolveDark();
  r.setProperty('--c1', css(p[0])); r.setProperty('--c2', css(p[1])); r.setProperty('--c3', css(p[2]));
  r.setProperty('--accent', css({ ...p[0], s: Math.max(p[0].s, 80), l: dark ? 74 : 44 }));
  r.setProperty('--accent2', css({ ...p[1], s: Math.max(p[1].s, 80), l: dark ? 70 : 48 }));
}

export function resetAmbient() {
  const r = document.documentElement.style;
  for (const k of ['--c1', '--c2', '--c3', '--accent', '--accent2']) r.removeProperty(k);
}
