import { useNavigate, useLocation } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

export default function CompareBar() {
  const { items, toggle, clear } = useCompare()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (items.length === 0 || pathname === '/compare') return null

  return (
    <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 px-4 pb-3 md:pb-4 pointer-events-none">
      <div className="max-w-2xl mx-auto bg-dark/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl pointer-events-auto"
        style={{ backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">

          {/* Slots */}
          <div className="flex gap-2 flex-1">
            {[0, 1, 2].map(i => {
              const p = items[i]
              return (
                <div key={i} className="relative flex-1 aspect-square max-w-[60px]">
                  {p ? (
                    <>
                      <div className="w-full h-full rounded-xl overflow-hidden bg-gray-700">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                        }
                      </div>
                      <button onClick={() => toggle(p)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-500 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full rounded-xl border border-dashed border-gray-600 flex items-center justify-center">
                      <span className="text-gray-600 text-lg">+</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/compare')}
              disabled={items.length < 2}
              className="bg-primary hover:bg-primary-dark disabled:opacity-40 text-white text-sm font-medium px-5 py-2 rounded-full transition-colors whitespace-nowrap">
              比較 {items.length > 0 && `(${items.length})`}
            </button>
            <button onClick={clear}
              className="text-gray-500 hover:text-gray-300 text-xs text-center transition-colors">
              清除
            </button>
          </div>
        </div>

        {items.length < 2 && (
          <p className="text-xs text-gray-500 mt-2 text-center">再選 {2 - items.length} 件商品即可比較</p>
        )}
      </div>
    </div>
  )
}
