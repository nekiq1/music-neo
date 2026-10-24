import { showToast } from './toast';
import type { Track } from './types';

/** Картинка 1080×1350 с текущей строкой песни — для сторис и чатов (Liquid Glass). */
export async function shareLineCard(t: Track, line: string, accent = '#9d8fff', noImage = false) {
  const c = document.createElement('canvas');
  c.width = 1080; c.height = 1350;
  const g = c.getContext('2d');
  if (!g) return;
  const cover = t.coverLg || t.cover;
  const img = noImage || !cover ? null : await new Promise<HTMLImageElement | null>(r => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => r(i); i.onerror = () => r(null); i.src = cover; setTimeout(() => r(null), 4000);
  });

  const bg = g.createLinearGradient(0, 0, 1080, 1350);
  bg.addColorStop(0, '#1b1450'); bg.addColorStop(0.55, accent); bg.addColorStop(1, '#ff5fa2');
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  if (img) { g.filter = 'blur(70px) saturate(1.7)'; g.drawImage(img, -180, -180, 1440, 1710); g.filter = 'none'; }
  g.fillStyle = 'rgba(5,4,16,.38)'; g.fillRect(0, 0, 1080, 1350);

  const rr = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  rr(70, 150, 940, 1050, 64);
  const glass = g.createLinearGradient(70, 150, 1010, 1200);
  glass.addColorStop(0, 'rgba(255,255,255,.28)'); glass.addColorStop(1, 'rgba(255,255,255,.08)');
  g.fillStyle = glass; g.fill();
  g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 3; g.stroke();

  const font = '-apple-system, "SF Pro Display", Inter, "Segoe UI", Roboto, sans-serif';
  if (img) { g.save(); rr(120, 210, 180, 180, 36); g.clip(); g.drawImage(img, 120, 210, 180, 180); g.restore(); }
  const x0 = img ? 330 : 120;
  g.fillStyle = '#fff'; g.font = `700 42px ${font}`; g.fillText(t.title.slice(0, 26), x0, 285);
  g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `500 34px ${font}`; g.fillText(t.artist.slice(0, 32), x0, 340);

  g.fillStyle = '#fff'; g.font = `800 74px ${font}`;
  let y = 560, row = '';
  const words = (line || t.title).split(' ');
  for (const w of words) {
    if (g.measureText(row + w).width > 820 && row) { g.fillText(row.trim(), 120, y); y += 96; row = ''; }
    row += w + ' ';
    if (y > 1040) break;
  }
  g.fillText(row.trim(), 120, y);
  g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `600 30px ${font}`; g.fillText('Neo Music', 120, 1140);

  c.toBlob(async b => {
    if (!b) { if (!noImage) return shareLineCard(t, line, accent, true); showToast('Не удалось создать карточку', 'error'); return; }
    const f = new File([b], 'neo-card.png', { type: 'image/png' });
    if (navigator.canShare?.({ files: [f] })) { try { await navigator.share({ files: [f] }); return; } catch (e) { if ((e as Error).name === 'AbortError') return; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'neo-card.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast('Карточка сохранена', 'ok');
  });
}
