'use client'

import StatsBar from '../result/StatsBar'
import BalanceList from '../result/BalanceList'
import TransferList from '../result/TransferList'
import { useRoom } from '../RoomProvider'
import { calcBal, calcTf, fmtK, getNames, ADMIN_NAME } from '@/lib/utils'

export default function ResultTab() {
  const { st } = useRoom()

  function copyResult() {
    const txs = st.txs || []
    const members = getNames(st.members).filter(m => m !== ADMIN_NAME)
    const bal = calcBal(txs, members)
    const tfs = calcTf({ ...bal })
    const totalK = txs.reduce((s, t) => s + (t.amountK || 0), 0)
    let text = `💸 ${st.name}\nTổng chi: ${fmtK(totalK)}\n\nSố dư:\n`
    members.forEach(m => {
      const b = bal[m] || 0
      text += `  ${m}: ${b > 0 ? '+' : ''}${fmtK(b)}\n`
    })
    if (tfs.length) {
      text += '\nChuyển khoản:\n'
      tfs.forEach(tf => { text += `  ${tf.from} → ${tf.to}: ${fmtK(tf.amountK)}\n` })
    }
    navigator.clipboard.writeText(text)
  }

  return (
    <div>
      <StatsBar />

      <div className="slbl" style={{ marginBottom: '.6rem' }}>Số dư từng người</div>
      <div className="card" style={{ marginBottom: '.875rem' }}>
        <div className="cb" style={{ paddingTop: '.75rem', paddingBottom: '.75rem' }}>
          <BalanceList />
        </div>
      </div>

      <div className="slbl" style={{ marginBottom: '.6rem' }}>Ai cần chuyển tiền cho ai</div>
      <div className="card" style={{ marginBottom: '.875rem' }}>
        <div className="cb" style={{ paddingTop: '.75rem', paddingBottom: '.75rem' }}>
          <TransferList />
        </div>
      </div>

      {(st.txs || []).length > 0 && (
        <button className="sharebtn" onClick={copyResult} style={{ width: '100%', padding: '12px', borderRadius: 'var(--rsm)', border: '1.5px solid var(--border2)', background: 'var(--surface)', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
          📋 Copy kết quả gửi nhóm chat
        </button>
      )}
    </div>
  )
}
