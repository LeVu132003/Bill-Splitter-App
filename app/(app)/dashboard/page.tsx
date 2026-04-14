'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtK } from '@/lib/utils'

interface MonthData {
  totalK: number
  rooms: Record<string, { name: string; amountK: number }>
}

export default function DashboardPage() {
  const router = useRouter()
  const [months, setMonths] = useState<Record<string, MonthData>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(d => {
        setMonths(d.months || {})
        // Auto-select current month
        const now = new Date()
        const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        if (d.months?.[cur]) setSelected(cur)
        else {
          const keys = Object.keys(d.months || {}).sort().reverse()
          if (keys.length) setSelected(keys[0])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const sortedMonths = Object.keys(months).sort().reverse()
  const maxK = Math.max(...sortedMonths.map(m => months[m].totalK), 1)

  function formatMonth(key: string) {
    const [y, m] = key.split('-')
    return `Tháng ${parseInt(m)}/${y}`
  }

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '1rem 1rem 4rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', paddingTop: '.5rem' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 18, padding: '4px 8px', borderRadius: 'var(--rxs)' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>Thống kê chi tiêu</h1>
          <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Phần bạn phải trả theo tháng</p>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', color: 'var(--t3)', padding: '3rem 0' }}>Đang tải...</div>
      )}

      {!loading && sortedMonths.length === 0 && (
        <div className="empty">
          <div className="ei">📊</div>
          Chưa có dữ liệu chi tiêu
        </div>
      )}

      {!loading && sortedMonths.length > 0 && (
        <>
          {/* Bar chart */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="cb">
              <div className="slbl">6 tháng gần nhất</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
                {sortedMonths.slice(0, 6).reverse().map(key => {
                  const pct = (months[key].totalK / maxK) * 100
                  const isSelected = selected === key
                  return (
                    <div
                      key={key}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}
                      onClick={() => setSelected(key)}
                    >
                      <div style={{ fontSize: 9, color: isSelected ? 'var(--accent)' : 'var(--t3)', fontWeight: 600, fontFamily: 'DM Mono' }}>
                        {fmtK(months[key].totalK)}
                      </div>
                      <div style={{
                        width: '100%',
                        height: `${Math.max(pct, 4)}%`,
                        background: isSelected ? 'var(--accent)' : 'var(--bg3)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'all .2s',
                        minHeight: 4,
                      }} />
                      <div style={{ fontSize: 9, color: isSelected ? 'var(--accent)' : 'var(--t3)', fontWeight: isSelected ? 600 : 400 }}>
                        T{key.split('-')[1]}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Month selector */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: '1rem' }}>
            {sortedMonths.map(key => (
              <button
                key={key}
                className={`chip${selected === key ? ' on' : ''}`}
                onClick={() => setSelected(key)}
                style={{ fontSize: 12 }}
              >
                {formatMonth(key)}
              </button>
            ))}
          </div>

          {/* Detail of selected month */}
          {selected && months[selected] && (
            <div className="card">
              <div className="cb">
                <div className="slbl">{formatMonth(selected)}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, color: 'var(--t2)' }}>Tổng bạn phải trả</span>
                  <span style={{ fontFamily: 'DM Mono', fontSize: 20, fontWeight: 600, color: 'var(--accent)' }}>
                    {fmtK(months[selected].totalK)}
                  </span>
                </div>
                <div className="slbl" style={{ marginBottom: '.5rem' }}>Chi tiết theo phòng</div>
                {Object.entries(months[selected].rooms)
                  .sort((a, b) => b[1].amountK - a[1].amountK)
                  .map(([code, room]) => (
                    <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--abg)', border: '1px solid var(--aborder)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        💸
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{room.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono' }}>{code}</div>
                      </div>
                      <div style={{ fontFamily: 'DM Mono', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {fmtK(room.amountK)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
