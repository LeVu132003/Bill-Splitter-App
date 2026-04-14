'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import { fmtK, ini, cc, ADMIN_NAME } from '@/lib/utils'
import { calculateBalances } from '@/lib/balance'

export default function BalanceList() {
  const { st, myName, isAdmin, syncToServer } = useRoom()
  const [openBal, setOpenBal] = useState<Record<string, boolean>>({})

  const txs = st.txs || []
  const members = st.members.filter(m => m.name !== ADMIN_NAME)
  const balancesMap = txs.length ? calculateBalances(members, txs) : null

  if (!members.length) {
    return <div className="empty"><div className="ei">👤</div>Chưa có thành viên</div>
  }

  function toggleBal(name: string) {
    setOpenBal(prev => ({ ...prev, [name]: !prev[name] }))
  }

  async function handleToggleSettled(name: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (name !== myName && !isAdmin) {
      alert('⚠ Chỉ chính bạn hoặc admin mới xác nhận được!')
      return
    }
    const newSettled = { ...(st.settled || {}) }
    newSettled[name] = !newSettled[name]
    await syncToServer({ ...st, settled: newSettled })
  }

  return (
    <div>
      {members.map((m, i) => {
        const row = balancesMap?.get(m.name)
        const b = row?.net || 0
        const spent = row?.spent || 0
        const owed = row?.owed || 0
        
        const col = b > 0.01 ? 'var(--green)' : b < -0.01 ? 'var(--red)' : 'var(--t3)'
        const lbl = b > 0.01 ? 'được nhận' : b < -0.01 ? 'cần trả' : 'hòa vốn'
        
        const isOpen = !!openBal[m.name]
        const settled = !!(st.settled && st.settled[m.name])
        const canSettle = m.name === myName || isAdmin

        const breakdowns = row?.breakdown || []

        return (
          <div key={m.name} style={{ borderBottom: '1px solid var(--border)' }}>
            <div 
              className={`brow ${settled ? 'brow-settled' : ''}`} 
              style={{ borderBottom: 'none', cursor: 'pointer', transition: 'background .12s' }}
              onClick={() => toggleBal(m.name)}
            >
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div className={`av ${cc(i)}`}>{ini(m.name)}</div>
                {settled && (
                  <span style={{ position: 'absolute', bottom: -2, right: -2, background: 'var(--green)', color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid var(--surface)' }}>✓</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.name}
                  {settled && <span className="settled-badge">✓ Đã xong</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                  Trả: {fmtK(spent)} · Tham gia: {fmtK(owed)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="bamt" style={{ color: col }}>
                    {b > 0.01 ? '+' : ''}{fmtK(Math.abs(b))}
                  </div>
                  <div className="blbl">{lbl}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--t3)', flexShrink: 0 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </div>
            
            <div className={`bdetail ${isOpen ? 'open' : ''}`}>
              {breakdowns.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--t3)', padding: '4px 0' }}>Chưa tham gia khoản nào</div>
              ) : (
                breakdowns.map(item => (
                  <div key={item.txId} className="bdi">
                    <div className="bdi-row1">
                      <span className="bdi-name" title={item.desc}>{item.desc}</span>
                    </div>
                    <div className="bdi-row2">
                      <span className="bdi-payer">
                        {item.payer ? `${item.payer} trả` : ''}
                      </span>
                      <span className={`bdi-role ${item.role}`}>
                        {item.role === 'paid' ? 'Người trả' : item.role === 'owed' ? 'Tham gia' : 'Trả + tham gia'}
                      </span>
                      <span className="bdi-amt" style={{ color: item.amountColor }}>
                        {item.amount > 0 ? '+' : ''}{fmtK(item.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
              
              {canSettle && (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <button 
                    className={`settle-btn ${settled ? 'done' : ''}`}
                    onClick={e => handleToggleSettled(m.name, e)}
                  >
                    {settled ? '✓ Đã quyết toán — bỏ xác nhận' : '☐ Xác nhận đã quyết toán'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
