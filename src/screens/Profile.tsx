import { LuBot, LuDownload, LuExternalLink, LuSend } from 'react-icons/lu';
import { SettingsContent } from '@/components/SettingsContent';
import { ScreenHeader } from '@/components/Section';
import { Group, SettingRow } from '@/components/ui/controls';
import { cfgStore } from '@/lib/appConfig';
import { useLib } from '@/lib/library';
import { useSettings } from '@/lib/settings';
import { isTelegram, openExternal, tgPlatform, tgUser } from '@/lib/tg';
import { usePwaInstall } from '@/lib/pwa';
import { ui } from '@/lib/ui';

export function Profile() {
  const cfg = cfgStore.use(s => s.cfg);
  const favs = useLib(s => s.favs.length), lists = useLib(s => s.playlists.length);
  const loader = useSettings(s => s.loaderBot);
  const u = tgUser();
  const pwa = usePwaInstall();
  const name = u?.first_name || (isTelegram() ? 'Слушатель' : 'Гость');
  const botUser = cfg?.bot.username;

  return (
    <div className="scroll h-full pb-[calc(var(--dock)+var(--mini-h)+28px)] md:pb-[calc(var(--mini-h)+40px)]">
      <ScreenHeader title="Профиль" />
      <div className="px-5">
        <div className="glass rise mb-5 flex items-center gap-4 rounded-[30px] p-4">
          {u?.photo_url
            ? <img src={u.photo_url} alt="" className="size-16 rounded-full object-cover" referrerPolicy="no-referrer" />
            : <span className="grid size-16 place-items-center rounded-full bg-accent text-2xl font-extrabold text-on-accent">{name[0]?.toUpperCase()}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold">{name}</p>
            <p className="truncate text-[13.5px] text-muted">
              {isTelegram() ? `Telegram · ${tgPlatform()} · данные синхронизируются` : 'Данные хранятся на этом устройстве'}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-accent">{favs} любимых · {lists} плейлистов</p>
          </div>
        </div>

        <Group title="Telegram и ВКонтакте">
          {botUser && !isTelegram() && (
            <SettingRow icon={<LuBot size={18} />} title={`Открыть мини-приложение`} desc={`@${botUser} в Telegram`} onClick={() => openExternal(`https://t.me/${botUser}`)} right={<LuExternalLink size={16} className="text-faint" />} />
          )}
          <SettingRow icon={<LuSend size={18} />} title={`Бот-загрузчик @${loader}`} desc="Скачивать треки через Telegram" onClick={() => openExternal(`https://t.me/${loader}`)} right={<LuExternalLink size={16} className="text-faint" />} />
          {pwa.canInstall && <SettingRow icon={<LuDownload size={18} />} title="Установить на экран «Домой»" desc="Работает как приложение, без адресной строки" onClick={pwa.install} />}
        </Group>

        <SettingsContent />

        <div className="mb-6 flex justify-center gap-3 text-[13px] text-faint">
          <button type="button" className="underline-offset-2 hover:underline" onClick={() => ui.set({ terms: true })}>Условия использования</button>
        </div>
      </div>
    </div>
  );
}
