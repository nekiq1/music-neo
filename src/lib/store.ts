import { useSyncExternalStore } from 'react';

/** Мини-стор (вместо zustand): useStore(selector) + прямой доступ get/set вне React. */
export function createStore<T extends object>(init: T, persistKey?: string, pick?: (s: T) => Partial<T>) {
  let state: T = init;
  if (persistKey) {
    try {
      const raw = localStorage.getItem(persistKey);
      if (raw) state = { ...init, ...JSON.parse(raw) };
    } catch { /* повреждённые данные — стартуем с нуля */ }
  }
  const subs = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    if (!persistKey) return;
    try { localStorage.setItem(persistKey, JSON.stringify(pick ? pick(state) : state)); } catch { /* квота/приватный режим */ }
  };
  const schedule = () => { if (!persistKey) return; clearTimeout(timer); timer = setTimeout(flush, 250); };
  if (persistKey && typeof addEventListener === 'function') addEventListener('pagehide', flush);

  const get = () => state;
  const set = (p: Partial<T> | ((s: T) => Partial<T>)) => {
    const patch = typeof p === 'function' ? p(state) : p;
    state = { ...state, ...patch };
    subs.forEach(f => f());
    schedule();
  };
  const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
  /** Селектор обязан возвращать примитив или стабильную ссылку. */
  const use = <S,>(sel: (s: T) => S): S => useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
  return { get, set, use, subscribe, flush };
}
