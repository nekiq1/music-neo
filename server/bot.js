// Telegram-бот на long polling без зависимостей: поиск, карточка трека, отправка аудио, inline-режим, Mini App.
// Важно: боты не могут писать другим ботам, поэтому @loaditbot подключён кнопкой-ссылкой (его открывает сам пользователь).
import { clampStr, createLimiter, http } from './util.js';
import { directStream, searchAll, pickSources, trackById } from './sources.js';

const e = process.env;
export const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const enc = encodeURIComponent;

// ── кэш найденных треков, чтобы callback_data (≤64 байт) содержала только src:id ──
const seen = new Map();
export const remember = t => { seen.set(`${t.src}:${t.id}`, t); if (seen.size > 800) seen.delete(seen.keys().next().value); return t; };
export const recall = k => seen.get(k);

export const loaderUser = () => (e.LOADER_BOT || 'loaditbot').replace(/^@/, '');
export const appBase = () => (e.WEBAPP_URL && /^https:\/\//.test(e.WEBAPP_URL) ? e.WEBAPP_URL.replace(/\/$/, '') : '');
export const trackWebUrl = t => `${appBase()}/?t=${enc(`${t.src}:${t.id}`)}`;
export const trackShareUrl = t => t.url || (appBase() ? trackWebUrl(t) : '');

/** Диплинк в Mini App: t.me/<bot>/<shortname>?startapp=t_src_id (работает и в группах) */
export function miniAppLink(t) {
  if (!e.BOT_USERNAME || !e.BOT_APP_SHORTNAME) return '';
  return `https://t.me/${e.BOT_USERNAME}/${e.BOT_APP_SHORTNAME}?startapp=${enc(`t_${t.src}_${t.id}`).slice(0, 512)}`;
}

export function resultsText(q, items) {
  if (!items.length) return `Ничего не нашёл по запросу «${esc(q)}». Попробуйте другое название.`;
  return `<b>Результаты:</b> ${esc(q)}\n\n` + items.map((t, i) => `${i + 1}. <b>${esc(t.title)}</b> — ${esc(t.artist)}${t.preview ? ' <i>(30 с)</i>' : ''}`).join('\n');
}

export function resultsKeyboard(items) {
  const rows = [];
  for (let i = 0; i < items.length; i += 4) rows.push(items.slice(i, i + 4).map((t, j) => ({ text: String(i + j + 1), callback_data: `t:${t.src}:${t.id}`.slice(0, 64) })));
  return { inline_keyboard: rows };
}

export function trackKeyboard(t, chatType = 'private', canAudio = false) {
  const rows = [];
  const mini = miniAppLink(t);
  if (mini) rows.push([{ text: '🎧 Слушать в Neo', url: mini }]);
  else if (appBase() && chatType === 'private') rows.push([{ text: '🎧 Слушать в Neo', web_app: { url: trackWebUrl(t) } }]);
  const row2 = [];
  if (canAudio) row2.push({ text: '🎵 Прислать аудио', callback_data: `a:${t.src}:${t.id}`.slice(0, 64) });
  row2.push({ text: `⬇️ Скачать через @${loaderUser()}`, url: `https://t.me/${loaderUser()}` });
  rows.push(row2);
  const link = trackShareUrl(t);
  if (link) rows.push([{ text: '🔗 Открыть в сервисе', url: link }]);
  return { inline_keyboard: rows };
}

export const trackCardText = t => {
  const link = trackShareUrl(t);
  return `🎵 <b>${esc(t.title)}</b>\n${esc(t.artist)}${t.preview ? '\n<i>Доступен фрагмент 30 секунд</i>' : ''}${link ? `\n${esc(link)}` : ''}\n\nЧтобы скачать, отправьте боту @${esc(loaderUser())} ссылку выше.`;
};

const API = () => `https://api.telegram.org/bot${e.BOT_TOKEN}`;
export async function tg(method, body = {}, timeout = 15000) {
  const r = await http(`${API()}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), timeout });
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw Object.assign(new Error(j.description || `Telegram ${r.status}`), { code: j.error_code });
  return j.result;
}
const safe = (m, b) => tg(m, b).catch(err => { console.error(`bot ${m}:`, err.message); return null; });

async function audioUrl(t) {
  if (!t.audio) return '';
  if (/^https?:\/\//.test(t.audio)) return t.audio;
  const u = new URL(t.audio, 'http://x');
  try { return (await directStream(u.searchParams.get('src'), u.searchParams.get('id'), 'high')).url; } catch { return ''; }
}

async function showTrack(chatId, t, chatType) {
  remember(t);
  await safe('sendMessage', { chat_id: chatId, text: trackCardText(t), parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: trackKeyboard(t, chatType, !!t.audio) });
}

async function search(chatId, q, chatType) {
  const ids = pickSources();
  const { items } = await searchAll(q, ids);
  const top = items.slice(0, 8).map(remember);
  await safe('sendMessage', { chat_id: chatId, text: resultsText(q, top), parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: top.length ? resultsKeyboard(top) : undefined });
}

const HELP = () => `Напишите название трека или исполнителя — найду в Deezer, Audius, iTunes${e.SPOTIFY_CLIENT_ID ? ', Spotify' : ''}${e.YANDEX_TOKEN ? ', Яндекс Музыке' : ''}.\n\nВ любом чате можно набрать <code>@${esc(e.BOT_USERNAME || 'бот')} запрос</code> и отправить трек собеседнику.\n\n/app — открыть плеер\n/loader — бот для скачивания (@${esc(loaderUser())})`;

async function onMessage(m) {
  const chatId = m.chat.id, text = (m.text || '').trim(), type = m.chat.type;
  if (!text) return;
  const [cmdRaw, ...rest] = text.split(/\s+/), cmd = cmdRaw.toLowerCase().replace(/@\w+$/, '');
  const app = appBase();
  const appKb = app && type === 'private' ? { inline_keyboard: [[{ text: '🎧 Открыть Neo Music', web_app: { url: app } }]] } : undefined;

  if (cmd === '/start') {
    const payload = rest[0] || '';
    if (payload.startsWith('t_')) { // диплинк на трек
      const [, src, ...id] = payload.split('_');
      try { return await showTrack(chatId, await trackById(src, id.join('_')), type); } catch { /* покажем приветствие */ }
    }
    return void await safe('sendMessage', { chat_id: chatId, parse_mode: 'HTML', text: `<b>Neo Music</b> 🎧\n\n${HELP()}`, reply_markup: appKb });
  }
  if (cmd === '/help') return void await safe('sendMessage', { chat_id: chatId, parse_mode: 'HTML', text: HELP(), reply_markup: appKb });
  if (cmd === '/app') return void await safe('sendMessage', { chat_id: chatId, text: app ? 'Открыть плеер:' : 'Адрес Mini App не настроен (WEBAPP_URL).', reply_markup: appKb });
  if (cmd === '/loader') return void await safe('sendMessage', { chat_id: chatId, text: `Скачивание треков — в @${loaderUser()}. Отправьте ему ссылку на трек.`, reply_markup: { inline_keyboard: [[{ text: `Открыть @${loaderUser()}`, url: `https://t.me/${loaderUser()}` }]] } });
  if (cmd.startsWith('/')) return;
  await safe('sendChatAction', { chat_id: chatId, action: 'typing' });
  await search(chatId, clampStr(text, 120), type);
}

async function onCallback(cb) {
  const data = cb.data || '', chatId = cb.message?.chat.id, type = cb.message?.chat.type;
  const [kind, ...r] = data.split(':'), key = r.join(':');
  if (!chatId) return void await safe('answerCallbackQuery', { callback_query_id: cb.id });
  const t = recall(key);
  if (!t) return void await safe('answerCallbackQuery', { callback_query_id: cb.id, text: 'Результат устарел — повторите поиск', show_alert: false });
  if (kind === 't') { await safe('answerCallbackQuery', { callback_query_id: cb.id }); return showTrack(chatId, t, type); }
  if (kind === 'a') {
    await safe('answerCallbackQuery', { callback_query_id: cb.id, text: 'Готовлю аудио…' });
    await safe('sendChatAction', { chat_id: chatId, action: 'upload_voice' });
    const url = await audioUrl(t);
    const ok = url && await tg('sendAudio', { chat_id: chatId, audio: url, title: t.title, performer: t.artist, caption: t.preview ? 'Фрагмент 30 секунд' : undefined, duration: t.dur }, 60000).then(() => true).catch(err => { console.error('sendAudio:', err.message); return false; });
    if (!ok) await safe('sendMessage', { chat_id: chatId, text: 'Не удалось отправить аудио. Откройте трек в плеере или скачайте через бота.', reply_markup: trackKeyboard(t, type, false) });
  }
}

async function onInline(q) {
  const term = clampStr(q.query, 100).trim();
  const items = term.length > 1 ? (await searchAll(term, pickSources()).catch(() => ({ items: [] }))).items.slice(0, 25) : [];
  const results = items.map(t => {
    remember(t);
    const link = trackShareUrl(t);
    const mini = miniAppLink(t);
    return {
      type: 'article', id: `${t.src}${t.id}`.replace(/[^\w-]/g, '').slice(0, 64), title: t.title, description: t.artist,
      ...(t.cover?.startsWith('http') ? { thumbnail_url: t.cover } : {}),
      input_message_content: { message_text: `🎵 <b>${esc(t.title)}</b> — ${esc(t.artist)}${link ? `\n${esc(link)}` : ''}`, parse_mode: 'HTML' },
      ...(mini ? { reply_markup: { inline_keyboard: [[{ text: '🎧 Слушать в Neo', url: mini }]] } } : {}),
    };
  });
  await safe('answerInlineQuery', { inline_query_id: q.id, cache_time: 60, is_personal: false, results });
}

export async function startBot() {
  if (!e.BOT_TOKEN) return;
  const me = await tg('getMe').catch(err => { console.error('bot: неверный BOT_TOKEN —', err.message); return null; });
  if (!me) return;
  e.BOT_USERNAME ||= me.username;
  await safe('deleteWebhook', { drop_pending_updates: false });
  await safe('setMyCommands', { commands: [{ command: 'start', description: 'Начать' }, { command: 'app', description: 'Открыть плеер' }, { command: 'loader', description: 'Скачивание треков' }, { command: 'help', description: 'Помощь' }] });
  if (appBase()) await safe('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Плеер', web_app: { url: appBase() } } });
  console.log(`bot: @${me.username} запущен${appBase() ? '' : ' (WEBAPP_URL не задан — кнопка Mini App отключена)'}`);

  const rate = createLimiter({ limit: 25, windowMs: 60_000 });
  let offset = 0, wait = 1000;
  for (;;) {
    try {
      const updates = await tg('getUpdates', { offset, timeout: 30, allowed_updates: ['message', 'inline_query', 'callback_query'] }, 45000);
      wait = 1000;
      for (const u of updates) {
        offset = u.update_id + 1;
        const who = String(u.message?.from?.id || u.callback_query?.from?.id || u.inline_query?.from?.id || '');
        if (who && !rate(who)) continue;
        (u.message ? onMessage(u.message) : u.callback_query ? onCallback(u.callback_query) : u.inline_query ? onInline(u.inline_query) : Promise.resolve())
          .catch(err => console.error('bot update:', err.message));
      }
    } catch (err) {
      if (err.code === 409) { console.error('bot: другой экземпляр уже опрашивает этого бота (409)'); wait = 15000; }
      else if (err.code === 401) { console.error('bot: токен отозван'); return; }
      await new Promise(r => setTimeout(r, wait));
      wait = Math.min(wait * 2, 30000);
    }
  }
}
