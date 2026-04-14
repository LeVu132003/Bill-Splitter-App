'use client'

import { useState } from 'react'
import SplitToggle from './SplitToggle'
import { getNames, fmtK, ADMIN_NAME } from '@/lib/utils'
import type { Tx, SplitMode, Member } from '@/lib/types'

interface EditFormProps {
  tx: Tx
  members: Member[]
  onSave: (updated: Tx) => Promise<void>
  onCancel: () => void
}

export default function EditForm({ tx, members, onSave, onCancel }: EditFormProps) {
  const [desc, setDesc] = useState(tx.desc)
  const [note, setNote] = useState(tx.note || '')
  const [amtK, setAmtK] = useState(String(tx.amountK))
  const [payer, setPayer] = useState(tx.payer)
  const [splitMode, setSplitMode] = useState<SplitMode>(tx.splitMode)
  const [selParts, setSelParts] = useState<string[]>(tx.parts)
  const [customSplits, setCustomSplits] = useState<Record<string, number>>(
    tx.splits || {}
  )
  const [error, setError] = useState('')

  const nonAdminMembers = getNames(members).filter(m => m !== ADMIN_NAME)

  function togglePart(name: string) {
    setSelParts(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    )
  }

  function updateCustomSplit(name: string, val: string) {
    setCustomSplits(prev => ({ ...prev, [name]: parseFloat(val) || 0 }))
  }

  function getSplitSummary(): { total: number; ok: boolean; label: string } {
    const amt = parseFloat(amtK) || 0
    const vals = Object.values(customSplits).filter(v => v > 0)
    const total = vals.reduce((a, b) => a + b, 0)
    if (splitMode === 'percent') {
      return { total, ok: Math.abs(total - 100) < 0.01, label: `${Math.round(total * 10) / 10}% / 100%` }
    }
    return { total, ok: amt > 0 && Math.abs(total - amt) < 0.01, label: `${fmtK(total)} / ${amt ? fmtK(amt) : '?'}` }
  }

  async function handleSave() {
    setError('')
    const amt = parseFloat(amtK)
    if (!desc.trim()) { setError('Nhập tên khoản chi!'); return }
    if (!amt || amt <= 0) { setError('Nhập số tiền hợp lệ!'); return }
    if (!payer) { setError('Chọn người trả!'); return }

    let parts: string[] = []
    let splits: Record<string, number> | null = null

    if (splitMode === 'equal') {
      parts = selParts.length ? [...selParts] : nonAdminMembers
      splits = null
    } else if (splitMode === 'percent') {
      const entries = Object.entries(customSplits).filter(([, v]) => v > 0)
      if (!entries.length) { setError('Nhập tỉ lệ cho ít nhất 1 người!'); return }
      const total = entries.reduce((s, [, v]) => s + v, 0)
      if (Math.abs(total - 100) > 0.5) { setError(`Tổng tỉ lệ phải = 100% (hiện: ${Math.round(total)}%)`); return }
      parts = entries.map(([n]) => n)
      splits = {}
      entries.forEach(([n, pct]) => { splits![n] = Math.round(amt * pct / 100 * 100) / 100 })
    } else {
      const entries = Object.entries(customSplits).filter(([, v]) => v > 0)
      if (!entries.length) { setError('Nhập số tiền cho ít nhất 1 người!'); return }
      const total = entries.reduce((s, [, v]) => s + v, 0)
      if (Math.abs(total - amt) > 0.05) { setError(`Tổng phải = ${fmtK(amt)} (hiện: ${fmtK(total)})`); return }
      parts = entries.map(([n]) => n)
      splits = {}
      entries.forEach(([n, v]) => { splits![n] = v })
    }

    const updated: Tx = {
      ...tx,
      desc: desc.trim(),
      note: note.trim() || undefined,
      amountK: amt,
      payer,
      parts,
      splits,
      splitMode,
      edited: Date.now(),
    }

    await onSave(updated)
  }

  const summary = splitMode !== 'equal' ? getSplitSummary() : null

  return (
    <div className="edit-form">
      <div className="slbl" style={{ marginBottom: '.5rem' }}>✏️ Chỉnh sửa</div>
      
      {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

      <div className="edit-row">
        <div style={{ flex: 1 }}>
          <label className="flbl" style={{ fontSize: 11 }}>Tên khoản</label>
          <input 
            type="text" 
            value={desc} 
            onChange={e => setDesc(e.target.value)} 
            style={{ fontSize: 13, padding: '7px 10px' }} 
          />
        </div>
        <div style={{ width: 110 }}>
          <label className="flbl" style={{ fontSize: 11 }}>Tiền (k)</label>
          <div className="amt-wrap">
            <input 
              type="number" 
              value={amtK} 
              onChange={e => setAmtK(e.target.value)} 
              style={{ fontSize: 13, padding: '7px 30px 7px 10px', fontFamily: 'DM Mono' }} 
            />
            <span className="amt-sfx" style={{ right: 8, fontSize: 11 }}>k</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="flbl" style={{ fontSize: 11 }}>Mô tả</label>
        <textarea 
          rows={2} 
          value={note} 
          onChange={e => setNote(e.target.value)} 
          style={{ fontSize: 13, padding: '7px 10px' }} 
        />
      </div>

      <div style={{ marginBottom: 6 }}>
        <label className="flbl" style={{ fontSize: 11 }}>Người trả</label>
        <div className="chips" style={{ marginTop: 4 }}>
          {nonAdminMembers.map(m => (
            <button 
              key={m} 
              className={`chip pay${payer === m ? ' on' : ''}`} 
              onClick={() => setPayer(m)} 
              style={{ padding: '4px 10px', fontSize: 12 }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label className="flbl" style={{ fontSize: 11 }}>Cách chia tiền</label>
        <SplitToggle 
          mode={splitMode} 
          onChange={mode => { 
            setSplitMode(mode)
            if (mode === 'equal') {
              setCustomSplits({})
            }
          }} 
        />
      </div>

      {splitMode === 'equal' ? (
        <div style={{ marginBottom: 8 }}>
          <label className="flbl" style={{ fontSize: 11 }}>Người tham gia</label>
          <div className="chips" style={{ marginTop: 4 }}>
            {nonAdminMembers.map(m => (
              <button 
                key={m} 
                className={`chip${selParts.includes(m) ? ' on' : ''}`}
                onClick={() => togglePart(m)}
                style={{ padding: '4px 10px', fontSize: 12 }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <label className="flbl" style={{ fontSize: 11 }}>
            {splitMode === 'percent' ? 'Tỉ lệ từng người (%)' : 'Số tiền từng người (k)'}
          </label>
          <div style={{ marginTop: '.45rem' }}>
            {nonAdminMembers.map((m, i) => {
              const isChecked = customSplits[m] !== undefined && customSplits[m] > 0
              return (
                <div key={m} className="part-row">
                  <input
                    type="checkbox"
                    className="part-check"
                    id={`edit-pc-${i}`}
                    checked={isChecked}
                    onChange={e => {
                      if (!e.target.checked) {
                        setCustomSplits(prev => {
                          const next = { ...prev }
                          delete next[m]
                          return next
                        })
                      } else {
                        setCustomSplits(prev => ({ ...prev, [m]: 0 }))
                      }
                    }}
                  />
                  <span className={`av xs c${i % 8}`} style={{ flexShrink: 0 }}>
                    {m.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                  <label className="part-name" htmlFor={`edit-pc-${i}`}>{m}</label>
                  <input
                    type="number"
                    className="part-input"
                    placeholder="0"
                    min="0"
                    inputMode="decimal"
                    value={customSplits[m] || ''}
                    disabled={!isChecked}
                    onChange={e => updateCustomSplit(m, e.target.value)}
                    onFocus={e => {
                      if (e.target.value === '0') e.target.value = ''
                    }}
                  />
                  <span className="part-unit">{splitMode === 'percent' ? '%' : 'k'}</span>
                </div>
              )
            })}
          </div>
          {summary && summary.total > 0 && (
            <div className="split-summary">
              <span>Tổng: <strong>{summary.label}</strong></span>
              <span className={summary.ok ? 'split-ok' : 'split-warn'}>
                {summary.ok ? '✓ Đúng' : '⚠ Chưa khớp'}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 7 }}>
        <button className="btn btn-p btn-sm" onClick={handleSave}>Lưu</button>
        <button className="btn btn-sm" onClick={onCancel}>Hủy</button>
      </div>
    </div>
  )
}
