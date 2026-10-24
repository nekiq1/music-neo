import { tkey } from './format';
import { settings } from './settings';
import { openExternal } from './tg';
import { showToast } from './toast';
import type { Track } from './types';

const enc = encodeURIComponent;

/** Ссылка на трек внутри нашего приложения (открывается и на сайте, и в Mini App) */
export const appUrl = (t: Track) => `${location.origin}/?t=${enc(tkey(t))}`;
/** Лучшая публичная ссылка: страница трека в сервисе или наша */
export const trackLink = (t: Track) => t.url || appUrl(t);
const label = (t: Track) => `${t.title} — ${t.artist}`;

// ВКонтакте: только публичная ссылка «Поделиться», токены не нужны
export const vkShareUrl = (t: Track) =>
  `https://vk.com/share.php?url=${enc(trackLink(t))}&title=${enc(label(t))}${t.cover ? `&image=${enc(t.cover)}` : ''}&noparse=true`;
export const tgShareUrl = (t: Track) => `https://t.me/share/url?url=${enc(trackLink(t))}&text=${enc(label(t))}`;

export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* запасной путь для старых WebView */ }
  try {
    const a = document.createElement('textarea');
    a.value = text; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(a); a.select();
    const ok = document.execCommand('copy'); a.remove();
    return ok;
  } catch { return false; }
}

export async function copyLink(t: Track) {
  showToast((await copyText(trackLink(t))) ? 'Ссылка скопирована' : 'Не удалось скопировать', 'ok');
}

export async function nativeShare(t: Track) {
  const data = { title: label(t), text: label(t), url: trackLink(t) };
  if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
  copyLink(t);
}

export const loaderUsername = () => (settings.get().loaderBot || 'loaditbot').replace(/^@/, '').trim() || 'loaditbot';

/** Копируем ссылку на трек и открываем бота-загрузчика — дальше отправляем ему ссылку. */
export async function sendToLoader(t: Track) {
  const ok = await copyText(trackLink(t));
  showToast(ok ? `Ссылка скопирована — отправьте её боту @${loaderUsername()}` : `Откройте @${loaderUsername()} и отправьте ссылку на трек`, 'ok', 3600);
  openExternal(`https://t.me/${loaderUsername()}`);
}
