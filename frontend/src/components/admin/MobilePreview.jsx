import { useState } from 'react'

const PAGES = [
  { label: '首頁', path: '/' },
  { label: '產品目錄', path: '/products' },
  { label: '關於我們', path: '/about' },
  { label: '技術支援', path: '/support' },
]

export default function MobilePreview({ onClose }) {
  const [activePage, setActivePage] = useState('/')
  const [key, setKey] = useState(0)
  const base = window.location.origin

  const navigate = (path) => {
    setActivePage(path)
    setKey(k => k + 1)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="flex flex-col items-center gap-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-800 rounded-full p-1">
            {PAGES.map(p => (
              <button
                key={p.path}
                onClick={() => navigate(p.path)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activePage === p.path
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Phone frame */}
        <div className="relative" style={{ width: 390, height: 760 }}>
          {/* Side buttons */}
          <div className="absolute -left-[5px] top-28 w-[4px] h-8 bg-gray-600 rounded-l-sm" />
          <div className="absolute -left-[5px] top-40 w-[4px] h-12 bg-gray-600 rounded-l-sm" />
          <div className="absolute -left-[5px] top-56 w-[4px] h-12 bg-gray-600 rounded-l-sm" />
          <div className="absolute -right-[5px] top-36 w-[4px] h-16 bg-gray-600 rounded-r-sm" />

          {/* Outer shell */}
          <div
            className="absolute inset-0 bg-gray-800 shadow-2xl"
            style={{ borderRadius: 44, padding: 10 }}
          >
            {/* Dynamic island / notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 rounded-full z-10" />

            {/* Screen */}
            <div className="w-full h-full bg-white overflow-hidden" style={{ borderRadius: 36 }}>
              <iframe
                key={key}
                src={`${base}${activePage}`}
                className="w-full h-full border-0"
                title="手機預覽"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500">點擊外部區域關閉</p>
      </div>
    </div>
  )
}
