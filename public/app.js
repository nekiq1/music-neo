// PocketBase (необязательно): 'http://127.0.0.1:8090'. Пусто = избранное в браузере.
const PB = '';
const $ = s => document.querySelector(s), au = $('#au');
const I = n => `<svg class="i"><use href="#i-${n}"/></svg>`; let lastP;
CanvasRenderingContext2D.prototype.roundRect ||= function (x, y, w, h) { this.rect(x, y, w, h); };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dev = localStorage.dev ||= crypto.randomUUID();
let favs = JSON.parse(localStorage.favs || '[]'), shown = [], queue = [], qi = -1, view = 'home';
const same = (a, b) => a.src === b.src && a.id === b.id, isFav = t => favs.some(f => same(f, t)), save = () => localStorage.favs = JSON.stringify(favs);
const tg = window.Telegram?.WebApp; if (tg) { tg.ready(); tg.expand(); tg.disableVerticalSwipes?.(); document.documentElement.dataset.theme = tg.colorScheme || 'dark'; }
if (localStorage.theme) document.documentElement.dataset.theme = localStorage.theme;
$('#th').onclick = () => { const d = document.documentElement, n = d.dataset.theme === 'dark' ? 'light' : 'dark'; d.dataset.theme = localStorage.theme = n; };
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
async function pb(t, add) { if (!PB) return; try { const key = t.src + ':' + t.id, u = PB + '/api/collections/favorites/records'; if (add) await fetch(u, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: dev, key, track: t }) }); else for (const i of (await (await fetch(`${u}?filter=${encodeURIComponent(`device="${dev}" && key="${key}"`)}`)).json()).items || []) await fetch(`${u}/${i.id}`, { method: 'DELETE' }); } catch {} }
const card = (t, i) => `<article class="c glass" data-i="${i}" tabindex="0"><button class="p" aria-label="В плейлист">${I('plus')}</button><button class="h ${isFav(t) ? 'on' : ''}" aria-label="В коллекцию">${I(isFav(t) ? 'heart-f' : 'heart')}</button>${t.cover ? `<img src="${esc(t.cover)}" alt="" loading="lazy">` : '<div class="ph"></div>'}<b>${esc(t.title)}</b><span>${esc(t.artist)}</span></article>`;
const section = (title, l, cls = 'grid') => { if (!l?.length) return ''; const o = shown.length; shown.push(...l); return `<h2>${esc(title)}</h2><div class="${cls}">${l.map((t, i) => card(t, o + i)).join('')}</div>`; };
const say = m => { $('#msg').textContent = m || ''; $('#msg').hidden = !m; };
async function go(v, q) {
  view = v; shown = []; say(''); document.querySelectorAll('#side [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  if (v === 'fav') $('#view').innerHTML = section('Коллекция', favs), favs.length || say('Пока пусто. Нажмите ♡ на треке.');
  else if (v === 'queue') $('#view').innerHTML = section('Очередь', queue), queue.length || say('Очередь пуста.');
  else if (v === 'account') acc();
  else if (v === 'upload') upl();
  else if (v === 'lists') lists();
  else if (v === 'search') { if (!q) return $('#view').innerHTML = '', say('Введите запрос — ищем во всех подключённых сервисах.'); $('#view').innerHTML = '<div class="grid">' + '<div class="sk"></div>'.repeat(10) + '</div>'; try { const r = await fetch('/api/search?src=all&q=' + encodeURIComponent(q)); const j = await r.json(); if (!r.ok) throw j.error; $('#view').innerHTML = section('Результаты', j); j.length || say('Ничего не найдено.'); } catch (e) { $('#view').innerHTML = ''; say('Ошибка: ' + e); } }
  else { $('#view').innerHTML = '<div class="grid">' + '<div class="sk"></div>'.repeat(10) + '</div>'; try { const [j, ch, rc] = await Promise.all([fetch('/api/new').then(r => r.json()), fetch('/api/charts').then(r => r.json()).catch(() => []), recs()]); if (j.error) throw j.error; $('#view').innerHTML = section('Для вас', rc, 'row') + section('Чарт', ch, 'row') + section('Загрузки сообщества', j.neo, 'row') + section('Новые релизы Spotify', j.spotify, 'row') + section('Свежее на SoundCloud', j.soundcloud, 'grid'); if (!shown.length) say('Подключите ключи в .env, чтобы увидеть новинки.'); } catch (e) { $('#view').innerHTML = ''; say('Ошибка: ' + e); } }
}
// ===== Плеер: аудио + Spotify Premium SDK, синхронные тексты =====
let cfg = {}, spTok = JSON.parse(localStorage.spTok || 'null'), sp, spDev, spSt, spAt = 0, cur = null, shuf = false, rep = 0, lrc = [], plain = '', li = -1, endLock = 0;
fetch('/api/config').then(r => r.json()).then(c => { cfg = c; spInit(); }).catch(() => {});
const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function spLogin() { const v = b64(crypto.getRandomValues(new Uint8Array(48))); sessionStorage.cv = v; const ch = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))); location.href = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({ client_id: cfg.spotify, response_type: 'code', redirect_uri: location.origin + '/', code_challenge_method: 'S256', code_challenge: ch, scope: 'streaming user-read-email user-read-private user-modify-playback-state user-read-playback-state' }); }
async function spReq(body) { const r = await fetch('https://accounts.spotify.com/api/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: cfg.spotify, ...body }) }); if (!r.ok) return null; const j = await r.json(); spTok = { a: j.access_token, r: j.refresh_token || spTok?.r, x: Date.now() + (j.expires_in - 60) * 1e3 }; localStorage.spTok = JSON.stringify(spTok); return spTok; }
const spToken = async () => (spTok && spTok.x > Date.now() ? spTok : spTok?.r && await spReq({ grant_type: 'refresh_token', refresh_token: spTok.r }))?.a;
$('#spb').onclick = () => spTok ? (spTok = null, localStorage.removeItem('spTok'), location.reload()) : cfg.spotify ? spLogin() : say('Укажите SPOTIFY_CLIENT_ID в .env.');
async function spInit() {
  if (tg?.initData || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) { $('#spb').hidden = true; return; } // Web Playback SDK не работает на телефонах и в Telegram
  const code = new URLSearchParams(location.search).get('code');
  if (code && sessionStorage.cv) { await spReq({ grant_type: 'authorization_code', code, redirect_uri: location.origin + '/', code_verifier: sessionStorage.cv }); history.replaceState({}, '', '/'); }
  $('#spt').textContent = spTok ? '● Spotify подключён' : 'Подключить Spotify'; if (!spTok || sp) return;
  window.onSpotifyWebPlaybackSDKReady = () => {
    sp = new Spotify.Player({ name: 'Neo Music', getOAuthToken: async cb => cb(await spToken()), volume: +$('#vol').value / 100 });
    sp.addListener('ready', e => spDev = e.device_id); sp.addListener('account_error', () => say('Полный Spotify доступен только с Premium.'));
    sp.addListener('player_state_changed', s => { spSt = s; spAt = Date.now(); if (s && cur?.mode === 'sp' && s.paused && s.position === 0 && s.track_window.previous_tracks.some(p => p.id === s.track_window.current_track.id) && Date.now() - endLock > 3000) { endLock = Date.now(); ended(); } });
    sp.connect(); };
  const s = document.createElement('script'); s.src = 'https://sdk.scdn.co/spotify-player.js'; document.head.append(s);
}
const pos = () => cur?.mode === 'sp' ? (spSt ? (spSt.paused ? spSt.position : spSt.position + Date.now() - spAt) / 1e3 : 0) : au.currentTime || 0;
const dur = () => (cur?.mode === 'sp' ? (spSt?.duration || 0) / 1e3 : au.duration) || 0;
const isP = () => cur?.mode === 'sp' ? !!spSt && !spSt.paused : !au.paused;
const fmt = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const seek = s => cur?.mode === 'sp' ? sp.seek(s * 1e3) : (au.currentTime = s);
const spPlay = async t => fetch('https://api.spotify.com/v1/me/player/play?device_id=' + spDev, { method: 'PUT', headers: { Authorization: 'Bearer ' + await spToken(), 'Content-Type': 'application/json' }, body: JSON.stringify(t.ctx ? { context_uri: t.uri } : { uris: [t.uri] }) });
async function play(l, i) {
  queue = l; qi = i; let t = l[i]; sp?.activateElement?.(); const P = $('#player'); P.hidden = false;
  $('#tt').textContent = t.title; $('#ar').textContent = t.artist; $('#cv').src = t.cover || 'icon.svg'; $('#rp').hidden = t.src !== 'neo'; $('#lk').innerHTML = I(isFav(t) ? 'heart-f' : 'heart');
  au.pause(); sp?.pause?.(); cur = { t, mode: 'if' }; loadLyr(l[i]);
  if (t.src === 'deezer' && spDev) try { const r = await (await fetch('/api/search?src=spotify&q=' + encodeURIComponent(t.title + ' ' + t.artist))).json(); if (r[0]?.uri) t = { ...t, uri: r[0].uri }; } catch {}
  if (t.uri && spDev) { cur.mode = 'sp'; await spPlay(t); } else if (t.audio) { cur.mode = 'au'; au.src = t.audio; au.play().catch(() => {}); }
  P.classList.toggle('if', cur.mode === 'if'); $('#fr').hidden = cur.mode !== 'if'; $('#fr').src = cur.mode === 'if' ? t.embed : '';
  if ('mediaSession' in navigator) { navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: t.cover ? [{ src: t.cover }] : [] }); [['nexttrack', next], ['previoustrack', prev], ['play', () => $('#pp').click()], ['pause', () => $('#pp').click()]].forEach(([a, f]) => navigator.mediaSession.setActionHandler(a, f)); }
}
const next = () => shuf && queue.length > 1 ? play(queue, (qi + 1 + Math.random() * (queue.length - 1) | 0) % queue.length) : qi < queue.length - 1 ? play(queue, qi + 1) : rep === 1 && play(queue, 0);
const prev = () => pos() > 3 ? seek(0) : qi > 0 && play(queue, qi - 1);
const ended = () => rep === 2 ? play(queue, qi) : next();
au.onended = ended; au.onerror = () => cur?.mode === 'au' && next();
$('#nx').onclick = next; $('#pv').onclick = prev;
$('#pp').onclick = () => cur?.mode === 'sp' ? sp.togglePlay() : au.paused ? au.play() : au.pause();
$('#sk').oninput = e => dur() && seek(dur() * e.target.value / 1000);
$('#vol').oninput = e => { au.volume = e.target.value / 100; sp?.setVolume(e.target.value / 100); };
$('#sh').onclick = e => e.currentTarget.classList.toggle('on', shuf = !shuf);
$('#rpt').onclick = e => { rep = (rep + 1) % 3; e.currentTarget.innerHTML = I(rep === 2 ? 'repeat1' : 'repeat'); e.currentTarget.classList.toggle('on', rep > 0); };
$('#lk').onclick = e => { const t = queue[qi], had = isFav(t); favs = had ? favs.filter(f => !same(f, t)) : [t, ...favs]; save(); pb(t, !had); e.currentTarget.innerHTML = I(had ? 'heart' : 'heart-f'); };
$('#shr').onclick = () => { const t = queue[qi], u = t.url || location.href, x = `${t.title} — ${t.artist}`; navigator.share ? navigator.share({ title: x, url: u }).catch(() => {}) : navigator.clipboard.writeText(x + ' ' + u).then(() => say('Ссылка скопирована.')); };
$('#qb').onclick = () => { $('#lv').hidden = true; go('queue'); };
$('#lb').onclick = () => $('#lv').hidden = !$('#lv').hidden; $('#lc').onclick = () => $('#lv').hidden = true;
$('#ll').onclick = e => { const p = e.target.closest('p[data-k]'); p && seek(lrc[p.dataset.k].t); };
$('#x').onclick = () => { au.pause(); sp?.pause?.(); $('#fr').src = ''; $('#player').hidden = true; $('#lv').hidden = true; cur = null; };
addEventListener('keydown', e => { if (!cur || e.target.matches('input,textarea')) return; if (e.code === 'Space') { e.preventDefault(); $('#pp').click(); } if (e.code === 'ArrowRight') seek(pos() + 10); if (e.code === 'ArrowLeft') seek(pos() - 10); });
const parseLrc = s => s.split('\n').map(l => l.match(/^\[(\d+):(\d+(?:\.\d+)?)\](.*)/)).filter(Boolean).map(m => ({ t: +m[1] * 60 + +m[2], s: m[3].trim() }));
function drawLyr() { $('#ll').innerHTML = lrc.length ? lrc.map((l, k) => `<p data-k="${k}">${esc(l.s) || '♪'}</p>`).join('') : plain ? `<pre>${esc(plain)}</pre>` : '<p class="e">Текст не найден.</p>'; }
async function loadLyr(t) {
  lrc = []; plain = ''; li = -1; $('#lt').textContent = t.title + ' — ' + t.artist; $('#lg').href = 'https://genius.com/search?q=' + encodeURIComponent(t.title + ' ' + t.artist); drawLyr();
  let j = {}; if (t.lyrics) j = /^\[\d+:\d+/m.test(t.lyrics) ? { synced: t.lyrics } : { plain: t.lyrics }; else try { j = await (await fetch(`/api/lyrics?t=${encodeURIComponent(t.title)}&a=${encodeURIComponent((t.artist || '').split(',')[0])}`)).json(); } catch {}
  if (queue[qi] !== t) return; lrc = j.synced ? parseLrc(j.synced) : []; plain = j.plain || ''; drawLyr();
}
setInterval(() => { if (!cur) return; const p = pos(), d = dur(); const pl = isP(); if (pl !== lastP) { lastP = pl; $('#pp').innerHTML = I(pl ? 'pause' : 'play'); } $('#t1').textContent = fmt(p); $('#t2').textContent = fmt(d); if (!$('#sk').matches(':active')) $('#sk').value = d ? p / d * 1000 : 0;
  if (lrc.length) { let n = -1; for (let k = 0; k < lrc.length && lrc[k].t <= p + .25; k++) n = k; if (n !== li) { li = n; const ps = document.querySelectorAll('#ll p'); ps.forEach((el, k) => el.classList.toggle('on', k === n)); if (!$('#lv').hidden) ps[n]?.scrollIntoView({ block: 'center', behavior: 'smooth' }); } } }, 250);
async function recs() { const a = [...new Set(favs.map(f => (f.artist || '').split(',')[0]).filter(Boolean))].sort(() => Math.random() - .5).slice(0, 2); if (!a.length) return []; const seen = new Set(favs.map(f => f.src + f.id)); return (await Promise.all(a.map(x => fetch('/api/search?src=all&q=' + encodeURIComponent(x)).then(r => r.json()).catch(() => [])))).flat().filter(t => t.id && !seen.has(t.src + t.id)).slice(0, 20); }
$('#f').onsubmit = e => { e.preventDefault(); go('search', $('#q').value.trim()); };
$('#side').onclick = e => { const b = e.target.closest('[data-v]'); b && go(b.dataset.v); };
$('#view').onclick = e => {
  const c = e.target.closest('.c'); if (!c) return; const t = shown[c.dataset.i];
  if (e.target.closest('.p')) addTo(t);
  else if (e.target.closest('.h')) { const had = isFav(t); favs = had ? favs.filter(f => !same(f, t)) : [t, ...favs]; save(); pb(t, !had); view === 'fav' ? go('fav') : (e.target.closest('.h').innerHTML = I(had ? 'heart' : 'heart-f'), e.target.closest('.h').classList.toggle('on', !had)); }
  else play(shown, +c.dataset.i);
};
let auth = JSON.parse(localStorage.auth || 'null'), pls = [];
const H = () => auth ? { Authorization: auth.token } : {}, J = { 'Content-Type': 'application/json' };
const form = h => { $('#view').innerHTML = `<form class="glass box" id="bx">${h}</form>`; };
const noPB = () => (say('Сервер аккаунтов не подключён: укажите PB в app.js.'), true);
function acc() {
  if (!PB) return noPB();
  if (auth) { form(`<h2>${esc(auth.record.email)}</h2><button id="lo" type="button">Выйти</button>`); $('#lo').onclick = () => { auth = null; localStorage.removeItem('auth'); go('account'); }; return; }
  form('<h2>Аккаунт</h2><input id="em" type="email" placeholder="Email" required><input id="pw" type="password" placeholder="Пароль, от 8 символов" minlength="8" required><button>Войти</button><button id="su" type="button">Создать аккаунт</button>');
  const call = async reg => { const email = $('#em').value, password = $('#pw').value; try {
    if (reg && !(await fetch(PB + '/api/collections/users/records', { method: 'POST', headers: J, body: JSON.stringify({ email, password, passwordConfirm: password }) })).ok) throw 'Не удалось создать аккаунт: email занят или пароль короткий';
    const r = await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: J, body: JSON.stringify({ identity: email, password }) }); if (!r.ok) throw 'Неверный email или пароль';
    auth = await r.json(); localStorage.auth = JSON.stringify(auth); go('account'); } catch (e) { say(e); } };
  $('#bx').onsubmit = e => { e.preventDefault(); call(false); }; $('#su').onclick = () => $('#bx').reportValidity() && call(true);
}
function upl() {
  if (!PB) return noPB(); if (!auth) { acc(); return say('Войдите, чтобы загружать треки.'); }
  form('<h2>Загрузить трек</h2><input id="tt1" placeholder="Название" maxlength="120" required><input id="ar1" placeholder="Исполнитель" maxlength="120" required><textarea id="ly1" rows="4" placeholder="Текст (необязательно, только ваш собственный)"></textarea><label>Аудио (mp3, m4a, ogg, wav, до 30 МБ)<input id="au1" type="file" accept="audio/*" required></label><label>Обложка<input id="cv1" type="file" accept="image/*"></label><label><input id="rt" type="checkbox" required>Я автор или правообладатель и разрешаю публичное прослушивание этого трека.</label><button>Отправить на проверку</button><small>Треки появляются в общей базе после проверки модератором. Нарушающие права удаляем по жалобе.</small>');
  $('#bx').onsubmit = async e => { e.preventDefault(); const a = $('#au1').files[0]; if (a.size > 30 * 1048576) return say('Файл больше 30 МБ.');
    const d = new FormData(); d.append('title', $('#tt1').value); d.append('artist', $('#ar1').value); d.append('lyrics', $('#ly1').value); d.append('audio', a); if ($('#cv1').files[0]) d.append('cover', $('#cv1').files[0]);
    d.append('owner', auth.record.id); d.append('ownerName', auth.record.email.split('@')[0]); d.append('status', 'pending'); d.append('rights', 'true'); say('Загрузка…');
    const r = await fetch(PB + '/api/collections/tracks/records', { method: 'POST', headers: H(), body: d }); say(r.ok ? 'Готово: трек отправлен на проверку и скоро появится в базе.' : 'Не удалось загрузить: проверьте формат файла и вход в аккаунт.'); r.ok && e.target.reset(); };
}
async function lists() {
  if (!PB) return noPB(); if (!auth) { acc(); return say('Войдите, чтобы создавать плейлисты.'); }
  pls = (await (await fetch(PB + '/api/collections/playlists/records?perPage=100', { headers: H() })).json()).items || [];
  form(`<h2>Плейлисты</h2>${pls.map((p, i) => `<button type="button" data-p="${i}">▶ ${esc(p.name)} (${(p.tracks || []).length})</button>`).join('') || '<small>Пока нет плейлистов.</small>'}<button type="button" id="np">＋ Новый плейлист</button>`);
  $('#bx').onclick = async e => { if (e.target.id === 'np') { const n = prompt('Название плейлиста'); if (n) { await fetch(PB + '/api/collections/playlists/records', { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ name: n, owner: auth.record.id, tracks: [] }) }); lists(); } } const b = e.target.closest('[data-p]'); if (b) { const p = pls[b.dataset.p]; p.tracks?.length && play(p.tracks, 0); } };
}
async function addTo(t) {
  if (!PB || !auth) return alert('Войдите в аккаунт, чтобы добавлять в плейлисты.');
  const l = (await (await fetch(PB + '/api/collections/playlists/records?perPage=100', { headers: H() })).json()).items || [];
  if (!l.length) return alert('Сначала создайте плейлист в разделе «Плейлисты».');
  const p = l[+prompt('Номер плейлиста:\n' + l.map((x, i) => `${i + 1}. ${x.name}`).join('\n')) - 1]; if (!p) return;
  await fetch(`${PB}/api/collections/playlists/records/${p.id}`, { method: 'PATCH', headers: { ...H(), ...J }, body: JSON.stringify({ tracks: [...(p.tracks || []), t] }) });
}
$('#rp').onclick = async () => { const t = queue[qi]; if (!auth) return alert('Войдите, чтобы отправить жалобу.'); const r = prompt('Причина жалобы (нарушение прав, спам…)'); if (r) { await fetch(PB + '/api/collections/reports/records', { method: 'POST', headers: { ...H(), ...J }, body: JSON.stringify({ trackId: t.id, reason: r, reporter: auth.record.id }) }); alert('Спасибо, жалоба отправлена.'); } };
// Карточка строки: красивая картинка с текущей строкой песни для сторис и чатов
async function lineCard(noImg) {
  const t = queue[qi]; if (!t) return; const line = lrc[Math.max(li, 0)]?.s || plain.split('\n').find(Boolean) || t.title;
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
  const img = noImg || !t.cover ? null : await new Promise(r => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => r(i); i.onerror = () => r(null); i.src = t.cover; });
  const gr = g.createLinearGradient(0, 0, 1080, 1350); gr.addColorStop(0, '#5b4bff'); gr.addColorStop(1, '#ff4b8b'); g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
  if (img) { g.filter = 'blur(60px) saturate(1.6)'; g.drawImage(img, -150, -150, 1380, 1650); g.filter = 'none'; }
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = 'rgba(255,255,255,.14)'; g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 3; g.beginPath(); g.roundRect(70, 170, 940, 1010, 56); g.fill(); g.stroke();
  if (img) { g.save(); g.beginPath(); g.roundRect(120, 220, 170, 170, 28); g.clip(); g.drawImage(img, 120, 220, 170, 170); g.restore(); }
  g.fillStyle = '#fff'; g.font = '700 40px -apple-system,Inter,sans-serif'; g.fillText(t.title.slice(0, 26), img ? 320 : 120, 290);
  g.fillStyle = 'rgba(255,255,255,.72)'; g.font = '34px -apple-system,Inter,sans-serif'; g.fillText(t.artist.slice(0, 30), img ? 320 : 120, 345);
  g.fillStyle = '#fff'; g.font = '700 70px -apple-system,Inter,sans-serif'; let y = 560, row = '';
  for (const w of line.split(' ')) { if (g.measureText(row + w).width > 820 && row) { g.fillText(row, 120, y); y += 92; row = ''; } row += w + ' '; } g.fillText(row, 120, y);
  g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '30px -apple-system,Inter,sans-serif'; g.fillText('Neo Music', 120, 1120);
  c.toBlob(async b => { if (!b) return noImg ? say('Не удалось создать карточку.') : lineCard(true); const f = new File([b], 'neo-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) navigator.share({ files: [f] }).catch(() => {}); else { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'neo-card.png'; a.click(); } });
}
$('#lcard').onclick = () => lineCard();
go('home');
