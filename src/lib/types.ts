export type SourceId = 'deezer' | 'itunes' | 'audius' | 'soundcloud' | 'spotify' | 'yandex' | 'neo';
export type Quality = 'auto' | 'high' | 'medium' | 'low';
export type EffectiveQuality = Exclude<Quality, 'auto'>;
export type ThemePref = 'auto' | 'dark' | 'light';

export interface Track {
  id: string;
  src: SourceId;
  title: string;
  artist: string;
  cover?: string;      // ~300–500 px
  coverSm?: string;    // ≤120 px (экономия трафика)
  coverLg?: string;    // ≥640 px (экран плеера)
  audio?: string;      // прямой поток или /api/stream
  embed?: string;      // iframe-плеер сервиса (запасной вариант)
  uri?: string;
  url?: string;        // страница трека в сервисе
  lyrics?: string;     // свой текст (загрузки сообщества)
  dur?: number;        // секунды
  preview?: boolean;   // true = фрагмент 30 с
  kbps?: number;
  codec?: string;
}

export interface Settings {
  quality: Quality;
  theme: ThemePref;
  lite: 'auto' | 'on' | 'off';
  sources: Partial<Record<SourceId, boolean>>;
  resolve: boolean;          // подбирать аудио для Spotify / Яндекса
  haptics: boolean;
  autoLyrics: boolean;
  loaderBot: string;         // username бота-загрузчика без @
  volume: number;            // 0..1
  updatedAt: number;
}

export interface SourceInfo {
  id: SourceId;
  label: string;
  enabled: boolean;      // сервер знает, как ходить в источник (есть ключи)
  keyless: boolean;
  kind: 'full' | 'preview' | 'embed';
  note: string;
}

export interface AppConfig {
  sources: SourceInfo[];
  pb: string;
  bot: { username: string; app: string };
  loader: string;
  version: string;
}

export interface Section {
  id: string;
  title: string;
  items: Track[];
  layout?: 'row' | 'list';
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  updatedAt: number;
}

declare global {
  interface Window {
    Telegram?: { WebApp?: any };
    __neo?: any;
  }
}
