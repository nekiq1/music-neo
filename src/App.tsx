import { useEffect } from 'react';
import { MiniPlayer, Sidebar, TabBar } from './components/Dock';
import { NowPlaying, useAmbient } from './components/NowPlaying';
import { PlaylistPicker, QueueSheet, SettingsSheet, TermsSheet, Toasts, TrackMenu } from './components/Sheets';
import { loadConfig } from './lib/appConfig';
import { getTrack } from './lib/api';
import { playList, restore } from './lib/player';
import { startSync } from './lib/sync';
import { onTgReady, tgStartParam } from './lib/tg';
import { openNow, setTab, TABS, type Tab, useUI } from './lib/ui';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Profile } from './screens/Profile';
import { SearchScreen } from './screens/Search';

const SCREENS: Record<Tab, () => React.JSX.Element> = { home: Home, search: SearchScreen, library: Library, profile: Profile };

/** Диплинки: ?t=src:id (поделились треком), ?tab=…, Telegram startapp=t_src_id */
async function handleDeepLink() {
  const q = new URLSearchParams(location.search);
  const tab = q.get('tab') as Tab | null;
  if (tab && TABS.includes(tab)) setTab(tab);
  let ref = q.get('t');
  const sp = tgStartParam();
  if (!ref && sp.startsWith('t_')) { const [, src, ...id] = sp.split('_'); ref = `${src}:${id.join('_')}`; }
  if (!ref) return;
  const [src, ...rest] = ref.split(':');
  try { const t = await getTrack(src, rest.join(':')); playList([t], 0); openNow(); } catch { /* трек недоступен */ }
  history.replaceState({}, '', location.pathname);
}

export default function App() {
  const tab = useUI(s => s.tab);
  useAmbient();

  useEffect(() => {
    restore();
    loadConfig().then(handleDeepLink);
    startSync();
    return onTgReady(() => { startSync(); });
  }, []);

  const Screen = SCREENS[tab];
  return (
    <>
      <div className="ambient" aria-hidden><i /><i /><i /></div>
      <div className="relative z-[1] h-full">
        <Sidebar />
        <main className="shell-main h-full" key={tab}><Screen /></main>
        <MiniPlayer />
        <TabBar />
      </div>
      <NowPlaying />
      <QueueSheet />
      <TrackMenu />
      <PlaylistPicker />
      <SettingsSheet />
      <TermsSheet />
      <Toasts />
    </>
  );
}
