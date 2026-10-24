import { createRoot } from 'react-dom/client';
import App from './App';
import { bootSettingsEffects } from './lib/settings';
import { watchTelegramSdk } from './lib/tg';
import './lib/player'; // создаём <audio> и подписки MediaSession один раз

watchTelegramSdk();
bootSettingsEffects();
createRoot(document.getElementById('root')!).render(<App />);

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
