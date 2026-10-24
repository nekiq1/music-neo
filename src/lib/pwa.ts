import { useEffect, useState } from 'react';
import { showToast } from './toast';

interface BIPEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e as BIPEvent; subs.forEach(f => f()); });
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach(f => f()); showToast('Neo Music установлен', 'ok'); });
}

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

export function usePwaInstall() {
  const [, force] = useState(0);
  useEffect(() => { const f = () => force(n => n + 1); subs.add(f); return () => { subs.delete(f); }; }, []);
  const inTg = !!window.Telegram?.WebApp?.initData;
  const canInstall = !inTg && !standalone() && (!!deferred || isIos());
  const install = async () => {
    if (deferred) { await deferred.prompt(); deferred = null; subs.forEach(f => f()); }
    else if (isIos()) showToast('Нажмите «Поделиться» → «На экран Домой»', 'info', 5000);
  };
  return { canInstall, install };
}
