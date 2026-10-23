// Telegram-бот: инлайн-поиск (@бот запрос в любом чате) + поиск сообщением + кнопка Mini App. Long polling, без зависимостей.
import { src, e } from './server.js';
if (e.BOT_TOKEN) {
  const api = (m, b) => fetch(`https://api.telegram.org/bot${e.BOT_TOKEN}/${m}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
  const app = e.WEBAPP_URL?.startsWith('https') ? { inline_keyboard: [[{ text: '🎧 Открыть плеер', web_app: { url: e.WEBAPP_URL } }]] } : undefined;
  const find = q => src.all(q).catch(() => []);
  const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  if (app) api('setChatMenuButton', { menu_button: { type: 'web_app', text: 'Плеер', web_app: { url: e.WEBAPP_URL } } });
  let off = 0; console.log('bot: polling');
  for (;;) {
    try {
      const r = await api('getUpdates', { offset: off, timeout: 30, allowed_updates: ['message', 'inline_query'] });
      for (const u of r.result || []) {
        off = u.update_id + 1;
        if (u.inline_query) { // «отметить в чате»: @бот название
          const q = u.inline_query.query.trim(); const l = q.length > 1 ? (await find(q)).slice(0, 25) : [];
          await api('answerInlineQuery', { inline_query_id: u.inline_query.id, cache_time: 60, results: l.map((t, i) => ({ type: 'article', id: `${t.src}${t.id}`.slice(0, 64), title: t.title, description: t.artist, ...(t.cover ? { thumbnail_url: t.cover } : {}), input_message_content: { message_text: `🎵 <b>${esc(t.title)}</b> — ${esc(t.artist)}\n${esc(t.url)}`, parse_mode: 'HTML' } })) });
        } else if (u.message?.text) {
          const t = u.message.text.trim(), id = u.message.chat.id;
          if (t.startsWith('/start')) await api('sendMessage', { chat_id: id, text: 'Напишите название трека или исполнителя. В любом чате можно набрать @' + (e.BOT_USERNAME || 'бот') + ' и запрос.', reply_markup: app });
          else { const l = (await find(t)).slice(0, 8); await api('sendMessage', { chat_id: id, parse_mode: 'HTML', link_preview_options: { is_disabled: true }, text: l.length ? l.map((x, i) => `${i + 1}. <a href="${esc(x.url)}">${esc(x.title)}</a> — ${esc(x.artist)}`).join('\n') : 'Ничего не найдено', reply_markup: app }); }
        }
      }
    } catch { await new Promise(r => setTimeout(r, 3000)); }
  }
}
