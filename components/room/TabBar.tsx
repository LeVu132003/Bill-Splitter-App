'use client'

const TABS = ['👥 Thành viên', '💰 Chi tiêu', '📊 Kết quả']

interface TabBarProps {
  activeTab: number
  onTabChange: (tab: number) => void
}

export default function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="tabbar">
      {TABS.map((label, i) => (
        <button
          key={i}
          className={`tab${activeTab === i ? ' active' : ''}`}
          onClick={() => onTabChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
