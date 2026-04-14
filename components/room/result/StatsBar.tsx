'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, ADMIN_NAME } from '@/lib/utils'
import { calculateBalances, calculateTransfers } from '@/lib/balance'

export default function StatsBar() {
  const { st } = useRoom()
  const txs = st.txs || []
  const totalK = txs.reduce((s, t) => s + (t.amountK || 0), 0)
  const members = st.members.filter(m => m.name !== ADMIN_NAME)
  const balancesMap = txs.length ? calculateBalances(members, txs) : null
  const tfs = balancesMap ? calculateTransfers(balancesMap) : []

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-n">{txs.length ? fmtK(totalK) : '—'}</div>
        <div className="stat-l">Tổng chi</div>
      </div>
      <div className="stat">
        <div className="stat-n">{txs.length || '—'}</div>
        <div className="stat-l">Khoản</div>
      </div>
      <div className="stat">
        <div className="stat-n">{txs.length ? tfs.length : '—'}</div>
        <div className="stat-l">Chuyển CK</div>
      </div>
    </div>
  )
}
