'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, ini, cc, getNames, ADMIN_NAME } from '@/lib/utils'

export default function BalanceList() {
  const { st } = useRoom()
  const txs = st.txs || []
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}

  if (!members.length) {
    return <div className="empty"><div className="ei">👤</div>Chưa có thành viên</div>
  }

  return (
    <div>
      {members.map((m, i) => {
        const b = bal[m] || 0
        const col = b > 0.01 ? 'var(--green)' : b < -0.01 ? 'var(--red)' : 'var(--t3)'
        const lbl = b > 0.01 ? 'được nhận' : b < -0.01 ? 'cần trả' : 'hòa vốn'
        return (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className={`av ${cc(i)}`}>{ini(m)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: 14 }}>{m}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)' }}>{lbl}</div>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600, color: col }}>
              {b > 0.01 ? '+' : ''}{fmtK(Math.abs(b))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
