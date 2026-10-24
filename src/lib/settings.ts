import { createStore } from './store';
import { onTgThemeChange, setTgColors, tgApp, tgHaptic } from './tg';
import type { EffectiveQuality, Quality, Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  theme: 'auto',
  lite: 'auto',
  sources: {},
  resolve: true,
  haptics: true,
  autoLyrics: false,
  loaderBot: 'loaditbot',
  volume: 0.85,
  updatedAt: 0,
};

export const settings = createStore<Settings>(DEFAULT_SETTINGS, 'neo:v3:settings');

export const updateSettings = (p: Partial<Settings>) => settings.set({ ...p, updatedAt: Date.now() });
export const useSettings = <S,>(sel: (s: Settings) => S) => settings.use(sel);

/** Источник включён пользователем (по умолчанию — да). */
export const sourceOn = (s: Settings, id: string) => s.sources[id as keyof Settings['sources']] !== false;

// ── качество ──
interface NetInfo { saveData?: boolean; effectiveType?: string }
const net = (): NetInfo => (navigator as unknown as { connection?: NetInfo }).connection || {};

export function effectiveQuality(q: Quality = settings.get().quality): EffectiveQuality {
  if (q !== 'auto') return q;
  const c = net();
  if (c.saveData || c.effectiveType === 'slow-2g' || c.effectiveType === '2g') return 'low';
  if (c.effectiveType === '3g') return 'medium';
  return 'high';
}

export const QUALITY_META: Record<Quality, { label: string; desc: string }> = {
  auto: { label: 'Авто', desc: 'Подстраивается под сеть и режим экономии трафика' },
  high: { label: 'Высокое', desc: 'Крупные обложки, предзагрузка следующего трека, лучший поток источника' },
  medium: { label: 'Среднее', desc: 'Баланс: обычные обложки, без лишней предзагрузки' },
  low: { label: 'Экономия', desc: 'Мини-обложки, лёгкие эффекты, минимум трафика' },
};

// ── тема и эффекты ──
export function resolveDark(): boolean {
  const t = settings.get().theme;
  if (t !== 'auto') return t === 'dark';
  const tg = tgApp();
  if (tg?.initData && tg.colorScheme) return tg.colorScheme !== 'light';
  return !matchMedia('(prefers-color-scheme: light)').matches;
}

export function applyTheme() {
  const dark = resolveDark();
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.getElementById('meta-theme')?.setAttribute('content', dark ? '#07070d' : '#eceef7');
  setTgColors(dark);
}

export function isLowEnd(): boolean {
  const n = navigator as unknown as { deviceMemory?: number; hardwareConcurrency?: number };
  return (n.deviceMemory !== undefined && n.deviceMemory <= 2) || (n.hardwareConcurrency !== undefined && n.hardwareConcurrency <= 2);
}

export function applyFx() {
  const s = settings.get();
  const lite = s.lite === 'on' || (s.lite === 'auto' && (isLowEnd() || s.quality === 'low'));
  document.documentElement.dataset.fx = lite ? 'lite' : 'full';
}

export function bootSettingsEffects() {
  applyTheme(); applyFx();
  settings.subscribe(() => { applyTheme(); applyFx(); });
  matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', applyTheme);
  onTgThemeChange(applyTheme);
}

// ── отклик ──
export function tap(kind: 'light' | 'medium' | 'select' | 'success' | 'warning' = 'light') {
  if (!settings.get().haptics) return;
  if (tgHaptic(kind)) return;
  try { navigator.vibrate?.(kind === 'select' ? 6 : 10); } catch { /* iOS Safari не поддерживает */ }
}
