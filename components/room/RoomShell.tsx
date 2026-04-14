'use client'

import { useState } from 'react'
import Topbar from './Topbar'
import TabBar from './TabBar'
import MembersTab from './tabs/MembersTab'
import SpendTab from './tabs/SpendTab'
import ResultTab from './tabs/ResultTab'

type Tab = 0 | 1 | 2

export default function RoomShell() {
  const [activeTab, setActiveTab] = useState<Tab>(0)

  return (
    <div>
      <Topbar />
      <TabBar activeTab={activeTab} onTabChange={(t) => setActiveTab(t as Tab)} />
      <div className="shell">
        {activeTab === 0 && <MembersTab />}
        {activeTab === 1 && <SpendTab />}
        {activeTab === 2 && <ResultTab />}
      </div>
    </div>
  )
}
