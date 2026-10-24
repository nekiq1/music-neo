import { createStore } from './store';
import type { Track } from './types';

export type Tab = 'home' | 'search' | 'library' | 'profile';
export const TABS: Tab[] = ['home', 'search', 'library', 'profile'];

interface UI {
  tab: Tab;
  now: boolean;            // экран «Сейчас играет»
  nowView: 'player' | 'lyrics';
  queue: boolean;
  settings: boolean;
  terms: boolean;
  menu: Track | null;      // меню действий трека
  picker: Track | null;    // выбор плейлиста
  query: string;           // текст в поиске (чтобы не терялся при смене вкладок)
}

export const ui = createStore<UI>({ tab: 'home', now: false, nowView: 'player', queue: false, settings: false, terms: false, menu: null, picker: null, query: '' });
export const useUI = ui.use;

export const setTab = (tab: Tab) => ui.set({ tab });
export const openNow = (view: 'player' | 'lyrics' = 'player') => ui.set({ now: true, nowView: view });
export const closeNow = () => ui.set({ now: false });
export const openMenu = (t: Track) => ui.set({ menu: t });
export const closeMenu = () => ui.set({ menu: null });
export const openSettings = () => ui.set({ settings: true });
export const closeSettings = () => ui.set({ settings: false });
