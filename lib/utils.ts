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

export function calcBal(txs: Tx[], memberNames: string[]): Record<string, number> {
  const b: Record<string, number> = {}
  memberNames.forEach(m => { b[m] = 0 })
  txs.forEach(t => {
    const k = t.amountK || 0
    if (t.splits && Object.keys(t.splits).length) {
      Object.entries(t.splits).forEach(([p, sh]) => {
        if (b[p] !== undefined) b[p] -= sh
      })
    } else {
      const sh = k / t.parts.length
      t.parts.forEach(p => { if (b[p] !== undefined) b[p] -= sh })
    }
    if (b[t.payer] !== undefined) b[t.payer] += k
  })
  return b
}

export function calcTf(bal: Record<string, number>): Transfer[] {
  const deb = Object.entries(bal).filter(([, v]) => v < -0.01).map(([n, v]) => ({ n, v })).sort((a, b) => a.v - b.v)
  const cre = Object.entries(bal).filter(([, v]) => v > 0.01).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v)
  const out: Transfer[] = []
  let i = 0, j = 0
  while (i < deb.length && j < cre.length) {
    const d = deb[i], c = cre[j]
    const a = Math.min(-d.v, c.v)
    out.push({ from: d.n, to: c.n, amountK: a })
    d.v += a; c.v -= a
    if (Math.abs(d.v) < 0.01) i++
    if (Math.abs(c.v) < 0.01) j++
  }
  return out
}
