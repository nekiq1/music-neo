/**
 * Music Neo Telegram Bot
 * Compatible with Cloudflare Workers (recommended, free) and Node.
 *
 * Env:
 *   BOT_TOKEN   — from @BotFather
 *   WEBAPP_URL  — https://your-app.netlify.app (or Vercel / CF Pages)
 */

const TRACKS_SAMPLE = [
  '2 AM Debug Loop',
  'Brushstrokes and Rain',
  'Terminal Rain',
  'Almost Floating',
  'Aurora on Mute',
  'Deep Space Loop',
  'Dusk Between Stoops',
  'Soft Gold Sky',
  'Window Seat Daydream',
  'Cafe Da Tarde',
  'Quiet Credits',
  'Motel Soul Radio',
]

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      const update = await request.json()
      return handleUpdate(update, env)
    }
    return new Response('Music Neo Bot OK · /start')
  },
}

async function handleUpdate(update, env) {
  const msg = update.message
  if (!msg?.text) return new Response('ok')

  const chatId = msg.chat.id
  const text = msg.text.trim()
  const webapp = env.WEBAPP_URL || 'https://music-neo.example.com'

  if (text.startsWith('/start') || text.startsWith('/app')) {
    await sendMessage(env.BOT_TOKEN, chatId, welcomeText(), {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎧 Открыть Music Neo', web_app: { url: webapp } }],
          [{ text: '🔍 Как искать', callback_data: 'help_search' }],
        ],
      },
      parse_mode: 'Markdown',
    })
    return new Response('ok')
  }

  if (text.startsWith('/help')) {
    await sendMessage(
      env.BOT_TOKEN,
      chatId,
      'Команды:\n/start — открыть плеер\n/search <запрос> — найти трек\n/help — помощь\n\nВсе треки — CC0 (public domain).'
    )
    return new Response('ok')
  }

  if (text.startsWith('/search') || text.startsWith('/s ')) {
    const q = text.replace(/^\/(search|s)\s*/i, '').trim().toLowerCase()
    if (!q) {
      await sendMessage(env.BOT_TOKEN, chatId, 'Напиши: `/search rain` или просто название трека', {
        parse_mode: 'Markdown',
      })
      return new Response('ok')
    }
    const found = TRACKS_SAMPLE.filter((t) => t.toLowerCase().includes(q)).slice(0, 8)
    if (found.length === 0) {
      await sendMessage(env.BOT_TOKEN, chatId, `Ничего не нашёл по «${q}». Попробуй другое слово или открой плеер.`)
    } else {
      const list = found.map((t, i) => `${i + 1}. ${t}`).join('\n')
      await sendMessage(
        env.BOT_TOKEN,
        chatId,
        `Нашёл:\n${list}\n\nОткрой плеер и найди там же:`,
        {
          reply_markup: {
            inline_keyboard: [[{ text: '🎧 Открыть в плеере', web_app: { url: webapp } }]],
          },
        }
      )
    }
    return new Response('ok')
  }

  // Free text → treat as search
  if (!text.startsWith('/')) {
    const q = text.toLowerCase()
    const found = TRACKS_SAMPLE.filter((t) => t.toLowerCase().includes(q)).slice(0, 5)
    if (found.length) {
      const list = found.map((t) => `• ${t}`).join('\n')
      await sendMessage(env.BOT_TOKEN, chatId, `Похожие треки:\n${list}`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🎧 Слушать в Music Neo', web_app: { url: webapp } }]],
        },
      })
    } else {
      await sendMessage(env.BOT_TOKEN, chatId, 'Не нашёл. Попробуй /search или открой плеер.', {
        reply_markup: {
          inline_keyboard: [[{ text: '🎧 Открыть Music Neo', web_app: { url: webapp } }]],
        },
      })
    }
  }

  return new Response('ok')
}

function welcomeText() {
  return `🎵 *Music Neo*

Красивый плеер бесплатной lo-fi и ambient музыки.
Все треки — *CC0* (общественное достояние). Без рекламы и подписок на музыку.

• Очередь и «Играть следующим»
• Синхронный текст
• Моя волна
• Добавить на Домой (PWA)

Нажми кнопку — откроется Mini App.`
}

async function sendMessage(token, chatId, text, extra = {}) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  })
}
