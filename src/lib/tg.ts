// Тонкая обёртка над Telegram.WebApp: безопасно работает и вне Telegram (обычный сайт).
const w = () => window.Telegram?.WebApp;

export const tgApp = () => w();
export const isTelegram = () => !!w()?.initData;
export const tgUser = (): { id: number; first_name?: string; username?: string; photo_url?: string } | null => w()?.initDataUnsafe?.user ?? null;
export const tgInitData = () => (w()?.initData as string) || '';
export const tgStartParam = (): string => w()?.initDataUnsafe?.start_param || '';
export const tgPlatform = (): string => w()?.platform || 'web';

let inited = false;
const listeners = new Set<() => void>();
export const onTgReady = (f: () => void) => { listeners.add(f); return () => listeners.delete(f); };

/** Вызывается при старте и повторно, когда SDK догрузился. */
export function initTelegram() {
  const t = w();
  if (!t || inited) return;
  inited = true;
  try { t.ready(); } catch { /* */ }
  try { t.expand(); } catch { /* */ }
  try { t.disableVerticalSwipes?.(); } catch { /* */ }
  listeners.forEach(f => f());
}

export function watchTelegramSdk() {
  initTelegram();
  const el = document.getElementById('tg-sdk');
  if (el && !inited) el.addEventListener('load', initTelegram, { once: true });
}

export function setTgColors(dark: boolean) {
  const t = w();
  if (!t) return;
  const bg = dark ? '#07070d' : '#eceef7';
  try { t.setHeaderColor?.(bg); t.setBackgroundColor?.(bg); t.setBottomBarColor?.(bg); } catch { /* старая версия API */ }
}

export function onTgThemeChange(cb: (scheme: 'dark' | 'light') => void) {
  const t = w();
  if (!t?.onEvent) return () => {};
  const f = () => cb(t.colorScheme === 'light' ? 'light' : 'dark');
  t.onEvent('themeChanged', f);
  return () => t.offEvent?.('themeChanged', f);
}

/** Кнопка «Назад» Telegram закрывает верхнюю шторку. */
export function bindBackButton(active: boolean, onBack: () => void) {
  const b = w()?.BackButton;
  if (!b) return () => {};
  if (!active) { try { b.hide(); } catch { /* */ } return () => {}; }
  try { b.show(); b.onClick(onBack); } catch { return () => {}; }
  return () => { try { b.offClick(onBack); b.hide(); } catch { /* */ } };
}

export function openExternal(url: string) {
  const t = w();
  try {
    if (t && /^https?:\/\/(t\.me|telegram\.me)\//i.test(url) && t.openTelegramLink) return t.openTelegramLink(url);
    if (t?.openLink) return t.openLink(url);
  } catch { /* упадём в window.open */ }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function tgHaptic(kind: 'light' | 'medium' | 'heavy' | 'select' | 'success' | 'warning' | 'error') {
  const h = w()?.HapticFeedback;
  if (!h) return false;
  try {
    if (kind === 'select') h.selectionChanged();
    else if (kind === 'success' || kind === 'warning' || kind === 'error') h.notificationOccurred(kind);
    else h.impactOccurred(kind);
    return true;
  } catch { return false; }
}
