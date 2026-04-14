'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, calcTf, getNames, ADMIN_NAME } from '@/lib/utils'

export default function StatsBar() {
  const { st } = useRoom()
  const txs = st.txs || []
  const totalK = txs.reduce((s, t) => s + (t.amountK || 0), 0)
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}
  const tfs = txs.length ? calcTf({ ...bal }) : []

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
