import { createStore } from './store';

export interface ToastItem { id: number; text: string; kind: 'ok' | 'error' | 'info' }
export const toasts = createStore<{ items: ToastItem[] }>({ items: [] });
let n = 0;

export function showToast(text: string, kind: ToastItem['kind'] = 'info', ms = 2600) {
  const id = ++n;
  toasts.set(s => ({ items: [...s.items.slice(-2), { id, text, kind }] }));
  setTimeout(() => toasts.set(s => ({ items: s.items.filter(t => t.id !== id) })), ms);
}
