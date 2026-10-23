# Music Neo

Красивый веб-плеер + Telegram Mini App + бот.  
Бесплатная lo-fi / ambient музыка (CC0). Очередь, «играть следующим», синхронный текст, настройки качества, PWA «На экран Домой».

## Стек

- React 19 + TypeScript + Vite
- Tailwind + neo dark UI (shadcn-inspired)
- Zustand (плеер)
- Lucide icons (единый набор)
- vite-plugin-pwa
- Telegram WebApp SDK
- Треки: [Open Lo-Fi](https://github.com/btahir/open-lofi) (CC0)

## Функции

- Воспроизведение / пауза / prev / next
- Очередь + «Играть следующим» + «В очередь»
- Синхронизированный текст (LRC-style)
- Категории треков
- Настройки качества звука и громкости
- PWA: «Добавить на экран Домой» (iOS + Android)
- Профиль (Telegram user или гость)
- Mini App ready (один фронт)

## Быстрый старт

```bash
cd music-neo
npm install
npm run dev
```

Открой http://localhost:5173

## Деплой бесплатно

### 1. Сайт + Mini App (Netlify / Vercel / Cloudflare Pages)

```bash
npm run build
```

- **Netlify**: drag-and-drop папки `dist` или connect GitHub
- **Vercel**: `vercel`
- **Cloudflare Pages**: connect repo, build `npm run build`, output `dist`

Получишь HTTPS — обязательно для Mini App.

### 2. Бот (Cloudflare Worker — бесплатно)

1. Создай бота у [@BotFather](https://t.me/BotFather) → получи `BOT_TOKEN`
2. `/newapp` → укажи URL Mini App (твой Netlify/Vercel)
3. Задеплой `bot/index.js` как Worker:

```bash
# wrangler.toml
name = "music-neo-bot"
main = "bot/index.js"
compatibility_date = "2024-01-01"

[vars]
WEBAPP_URL = "https://your-app.netlify.app"
```

Секрет: `BOT_TOKEN`

4. Установи webhook:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://music-neo-bot.<subdomain>.workers.dev
```

### 3. Треки

По умолчанию используются файлы Open Lo-Fi через jsDelivr.  
Для продакшена скачай [openlofi.zip](https://github.com/btahir/open-lofi) и положи на свой CDN / R2 / Netlify large media.

## Структура

```
src/
  components/   # UI
  hooks/        # useAudio
  stores/       # player (Zustand)
  lib/          # tracks, utils
  types/
bot/            # Telegram bot (Worker)
public/         # PWA icons, favicon
```

## Безопасность

- Нет бэкенда с пользовательскими данными в MVP (гость + Telegram initData)
- Только публичные CC0-треки
- CSP можно добавить на хостинге
- Для профиля с БД: подключи Supabase free (auth + RLS)

## Дальше (идеи)

- Supabase: избранное, свои плейлисты, история
- Реальные LRC через LRCLIB API
- Темы оформления (как обсуждали)
- Equalizer (Web Audio API)
- Offline cache треков (Service Worker + Cache API)

---

Сделано как senior MVP: один фронт = сайт + PWA + Mini App, бот отдельно, всё в бесплатных лимитах.
