import { useMemo } from 'react';
import { createStore } from './store';
import { getConfig } from './api';
import { settings } from './settings';
import type { AppConfig, SourceId } from './types';

export const cfgStore = createStore<{ cfg: AppConfig | null; loading: boolean; error: string }>({ cfg: null, loading: true, error: '' });

export async function loadConfig() {
  cfgStore.set({ loading: true, error: '' });
  try { cfgStore.set({ cfg: await getConfig(), loading: false }); }
  catch (e) { cfgStore.set({ loading: false, error: (e as Error).message }); }
}

/** Источники, которые знает сервер И не выключил пользователь — строкой (стабильный примитив для deps). */
export function useSourcesKey(): string {
  const cfg = cfgStore.use(s => s.cfg);
  const off = settings.use(s => Object.entries(s.sources).filter(([, v]) => v === false).map(([k]) => k).join(','));
  return useMemo(() => {
    if (!cfg) return '';
    const o = new Set(off.split(',').filter(Boolean));
    return cfg.sources.filter(s => s.enabled && !o.has(s.id)).map(s => s.id).join(',');
  }, [cfg, off]);
}

export const keyToList = (k: string) => k.split(',').filter(Boolean) as SourceId[];
