'use client'

import { useRoom } from '../RoomProvider'
import { fmtK, calcBal, calcTf, ini, cc, getNames, ADMIN_NAME } from '@/lib/utils'

export default function TransferList() {
  const { st } = useRoom()
  const txs = st.txs || []
  const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
  const bal = txs.length ? calcBal(txs, members) : {}
  const tfs = txs.length ? calcTf({ ...bal }) : []

  if (!tfs.length) {
    return <div className="empty"><div className="ei">💸</div>{txs.length ? 'Mọi người hòa vốn!' : 'Chưa có dữ liệu'}</div>
  }

  return (
    <div>
      {tfs.map((tf, i) => {
        const fromIdx = members.indexOf(tf.from)
        const toIdx = members.indexOf(tf.to)
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div className={`av ${cc(fromIdx >= 0 ? fromIdx : 0)}`}>{ini(tf.from)}</div>
            <div style={{ flex: 1, fontSize: 14 }}>
              <strong>{tf.from}</strong>
              <span style={{ color: 'var(--t3)', margin: '0 6px' }}>→</span>
              <strong>{tf.to}</strong>
            </div>
            <div style={{ fontFamily: 'DM Mono', fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
              {fmtK(tf.amountK)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
