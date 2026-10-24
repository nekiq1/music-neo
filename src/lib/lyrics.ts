import { useEffect, useMemo, useState } from 'react';
import { lyricsFor } from './api';
import { player } from './player';
import { tkey } from './format';
import type { Track } from './types';

export interface Line { t: number; s: string }

export const parseLrc = (src: string): Line[] =>
  src.split('\n').flatMap(l => {
    const m = l.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
    return m ? [{ t: +m[1] * 60 + +m[2], s: m[3].trim() }] : [];
  });

export interface LyricsState { lines: Line[]; plain: string; status: 'idle' | 'loading' | 'ok' | 'none' }

const cache = new Map<string, { synced?: string; plain?: string }>();

export function useLyrics(t: Track | null, enabled: boolean): LyricsState {
  const [raw, setRaw] = useState<{ synced?: string; plain?: string } | null>(null);
  const [status, setStatus] = useState<LyricsState['status']>('idle');
  const key = t ? tkey(t) : '';

  useEffect(() => {
    setRaw(null);
    if (!t || !enabled) { setStatus('idle'); return; }
    if (t.lyrics) { setRaw(/^\[\d+:\d+/m.test(t.lyrics) ? { synced: t.lyrics } : { plain: t.lyrics }); setStatus('ok'); return; }
    const hit = cache.get(key);
    if (hit) { setRaw(hit); setStatus(hit.synced || hit.plain ? 'ok' : 'none'); return; }
    const ac = new AbortController();
    setStatus('loading');
    lyricsFor(t, ac.signal)
      .then(j => { cache.set(key, j); setRaw(j); setStatus(j.synced || j.plain ? 'ok' : 'none'); })
      .catch(e => { if ((e as Error).name !== 'AbortError') setStatus('none'); });
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  const lines = useMemo(() => (raw?.synced ? parseLrc(raw.synced) : []), [raw]);
  return { lines, plain: raw?.plain || '', status };
}

/** Индекс активной строки (подписка на позицию плеера). */
export const useActiveLine = (lines: Line[]) =>
  player.use(s => {
    if (!lines.length) return -1;
    let n = -1;
    for (let i = 0; i < lines.length && lines[i].t <= s.pos + 0.25; i++) n = i;
    return n;
  });
