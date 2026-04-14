'use client'

import { useRoom } from '../RoomProvider'
import TxCard from './TxCard'

export default function TxList() {
  const { st } = useRoom()
  const txs = [...(st.txs || [])].reverse()

  if (!txs.length) {
    return (
      <div className="empty">
        <div className="ei">🧾</div>
        Chưa có khoản nào
      </div>
    )
  }

  return (
    <div>
      {txs.map(tx => <TxCard key={tx.id} tx={tx} />)}
    </div>
  )
}
