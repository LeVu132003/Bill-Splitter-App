'use client'

import type { SplitMode } from '@/lib/types'

interface SplitToggleProps {
  mode: SplitMode
  onChange: (mode: SplitMode) => void
}

export default function SplitToggle({ mode, onChange }: SplitToggleProps) {
  return (
    <div className="split-mode-toggle">
      <button className={`smt-btn${mode === 'equal' ? ' active' : ''}`} onClick={() => onChange('equal')}>
        ⚖️ Chia đều
      </button>
      <button className={`smt-btn${mode === 'percent' ? ' active' : ''}`} onClick={() => onChange('percent')}>
        % Theo tỉ lệ
      </button>
      <button className={`smt-btn${mode === 'fixed' ? ' active' : ''}`} onClick={() => onChange('fixed')}>
        💰 Số tiền cố định
      </button>
    </div>
  )
}
