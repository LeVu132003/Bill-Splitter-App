'use client'

import { useState } from 'react'
import { useRoom } from '../RoomProvider'
import SplitToggle from './SplitToggle'
import { uid, getNames, fmtK, ADMIN_NAME } from '@/lib/utils'
import type { SplitMode, Tx } from '@/lib/types'

export default function AddTxForm() {
  const { st, myName, syncToServer } = useRoom()
  const [desc, setDesc] = useState('')
  const [note, setNote] = useState('')
  const [amtK, setAmtK] = useState('')
  const [payer, setPayer] = useState<string | null>(null)
  const [selParts, setSelParts] = useState<string[]>([])
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({})
  const [error, setError] = useState('')

  const members = getNames(st.members).filter(n => n !== ADMIN_NAME)

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

  async function handleAdd() {
    setError('')
    const amt = parseFloat(amtK)
    if (!desc.trim()) { setError('Nhập tên khoản chi!'); return }
    if (!amt || amt <= 0) { setError('Nhập số tiền hợp lệ!'); return }
    if (!payer) { setError('Chọn người trả!'); return }

    let parts: string[] = []
    let splits: Record<string, number> | null = null

    if (splitMode === 'equal') {
      parts = selParts.length ? [...selParts] : members
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

    const newTx: Tx = {
      id: uid(),
      desc: desc.trim(),
      note: note.trim() || undefined,
      amountK: amt,
      payer,
      parts,
      splits,
      splitMode,
      by: myName,
      ts: Date.now(),
      comments: [],
    }

    const newState = { ...st, txs: [...(st.txs || []), newTx] }
    setDesc(''); setNote(''); setAmtK(''); setPayer(null); setSelParts([])
    setCustomSplits({}); setSplitMode('equal')
    await syncToServer(newState)
  }

  const summary = splitMode !== 'equal' ? getSplitSummary() : null

  return (
    <div className="card" style={{ marginBottom: '.875rem' }}>
      <div className="cb">
        <div className="slbl">Thêm khoản chi</div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 8 }}>{error}</div>}

        <div className="field">
          <label className="flbl">Tên khoản chi</label>
          <input type="text" placeholder="Cà phê, Ăn tối, Xăng xe..." value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div className="field">
          <label className="flbl">Mô tả <span className="fhint">tuỳ chọn</span></label>
          <textarea placeholder="Ghi chú thêm..." rows={2} style={{ fontSize: 13, padding: '7px 10px' }} value={note} onChange={e => setNote(e.target.value)} />
        </div>

        <div className="field">
          <label className="flbl">Số tiền <span className="fhint">nghìn đồng</span></label>
          <div className="amt-wrap">
            <input type="number" placeholder="150" min="0" inputMode="decimal" value={amtK} onChange={e => setAmtK(e.target.value)} />
            <span className="amt-sfx">k</span>
          </div>
        </div>

        <div className="field">
          <label className="flbl">Người trả</label>
          <div className="chips">
            {members.map(m => (
              <button key={m} className={`chip pay${payer === m ? ' on' : ''}`} onClick={() => setPayer(m)}>{m}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="flbl">Cách chia tiền</label>
          <SplitToggle mode={splitMode} onChange={mode => { setSplitMode(mode); setCustomSplits({}) }} />
        </div>

        {splitMode === 'equal' ? (
          <div className="field">
            <label className="flbl">Người tham gia <span className="fhint">bỏ trống = tất cả</span></label>
            <div className="chips">
              {members.map(m => (
                <button key={m} className={`chip${selParts.includes(m) ? ' on' : ''}`} onClick={() => togglePart(m)}>{m}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="field">
            <label className="flbl">
              {splitMode === 'percent' ? 'Tỉ lệ từng người (%)' : 'Số tiền từng người (k)'}
            </label>
            {members.map((m, i) => (
              <div key={m} className="part-row">
                <span className={`av xs c${i % 8}`} style={{ width: 22, height: 22, fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontFamily: 'DM Mono', flexShrink: 0 }}>
                  {m.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </span>
                <span className="part-name">{m}</span>
                <input
                  type="number"
                  className="part-input"
                  placeholder="0"
                  min="0"
                  inputMode="decimal"
                  value={customSplits[m] || ''}
                  onChange={e => updateCustomSplit(m, e.target.value)}
                />
                <span className="part-unit">{splitMode === 'percent' ? '%' : 'k'}</span>
              </div>
            ))}
            {summary && (
              <div className="split-summary" style={{ display: 'flex' }}>
                <span>Tổng: <strong>{summary.label}</strong></span>
                <span className={summary.ok ? 'split-ok' : 'split-warn'}>
                  {summary.ok ? '✓ Đúng' : '⚠ Chưa khớp'}
                </span>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-p btn-full" style={{ marginTop: '.6rem' }} onClick={handleAdd}>
          + Thêm khoản
        </button>
      </div>
    </div>
  )
}
