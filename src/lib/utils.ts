import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function isTelegram(): boolean {
  return !!(window as any).Telegram?.WebApp?.initData
}

export function getTelegramUser() {
  const tg = (window as any).Telegram?.WebApp
  return tg?.initDataUnsafe?.user ?? null
}
