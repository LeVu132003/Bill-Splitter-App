import type { Tx, Transfer, Member } from './types'

export function fmtK(k: number): string {
  k = Math.round(k * 10) / 10
  if (k >= 1000) {
    const m = k / 1000
    return (Number.isInteger(m) ? m : m.toFixed(1)) + 'M'
  }
  return (Number.isInteger(k) ? k : k.toFixed(1)) + 'k'
}

export function timeAgo(ts: number): string {
  const d = Date.now() - ts
  const s = Math.floor(d / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (s < 60) return 'vừa xong'
  if (m < 60) return m + 'ph trước'
  if (h < 24) return h + 'g trước'
  return new Date(ts).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

export const ini = (n: string): string =>
  n.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()

export const cc = (i: number): string => 'c' + (i % 8)

export const uid = (): string => Math.random().toString(36).slice(2, 10)

export const uid6 = (): string => Math.random().toString(36).slice(2, 8).toUpperCase()

export function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// djb2 hash — giữ nguyên từ code gốc để PIN cũ vẫn work
export function hashPin(p: string): string {
  let h = 5381
  for (let i = 0; i < p.length; i++) {
    h = (((h << 5) + h) + p.charCodeAt(i)) >>> 0
  }
  return h.toString(16)
}

export function getMembers(members: Array<Member | string>): Member[] {
  return members.map(m => typeof m === 'string' ? { name: m, pin: '' } : m)
}

export function getNames(members: Array<Member | string>): string[] {
  return getMembers(members).map(m => m.name)
}

export const ADMIN_NAME = 'admin'
export const ADMIN_PIN = '132003'


/**
 * Generate deep link URL for room access
 * @param roomCode - The room code (6 characters)
 * @param baseUrl - Optional base URL (defaults to current origin)
 * @returns Full deep link URL with room code parameter
 */
export function generateRoomDeepLink(roomCode: string, baseUrl?: string): string {
  const base = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return `${base}/guest?r=${roomCode.toUpperCase()}`
}
