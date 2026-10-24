// Проверка подписи Telegram Web App initData: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyInitData(initData, botToken, maxAgeSec = 86400, now = Date.now()) {
  if (!initData || !botToken || initData.length > 4096) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
  p.delete('hash');
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calc = createHmac('sha256', secret).update(check).digest();
  const given = Buffer.from(hash, 'hex');
  if (calc.length !== given.length || !timingSafeEqual(calc, given)) return null;
  const date = Number(p.get('auth_date'));
  if (!date || now / 1000 - date > maxAgeSec) return null;
  try {
    const user = JSON.parse(p.get('user') || 'null');
    return user && Number.isSafeInteger(user.id) ? { id: user.id, user } : null;
  } catch { return null; }
}

/** Тестовый помощник: подписывает initData так же, как Telegram. */
export function signInitData(fields, botToken) {
  const p = new URLSearchParams(fields);
  const check = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  p.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return p.toString();
}
