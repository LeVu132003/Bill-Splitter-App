'use client'

import AddTxForm from '../spend/AddTxForm'
import TxList from '../spend/TxList'

export default function SpendTab() {
  return (
    <div>
      <AddTxForm />
      <div className="slbl">Lịch sử chi tiêu</div>
      <TxList />
    </div>
  )
}
