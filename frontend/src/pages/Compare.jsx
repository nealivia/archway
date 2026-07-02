import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCompare } from '../context/CompareContext'

const Row = ({ label, children }) => (
  <div className="grid border-b border-gray-100 last:border-0" style={{ gridTemplateColumns: '120px repeat(var(--cols), 1fr)' }}>
    <div className="py-4 pr-4 text-xs font-medium text-gray-400 uppercase tracking-wide flex items-start pt-5">{label}</div>
    {children}
  </div>
)

const Cell = ({ children }) => (
  <div className="py-4 px-3 border-l border-gray-100 text-sm text-gray-600">{children}</div>
)

export default function Compare() {
  const { items, toggle, clear } = useCompare()

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-center px-6 pb-20">
          <div>
            <div className="text-5xl mb-4 text-gray-200">⊘</div>
            <h2 className="text-xl font-semibold text-dark mb-2">尚未選擇商品</h2>
            <p className="text-sm text-gray-400 mb-6">請在產品頁面點選「比較」按鈕</p>
            <Link to="/products" className="btn-primary inline-block">瀏覽產品</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  const cols = items.length
  const allFeatures = [...new Set(items.flatMap(p => p.features || []))]
  const allApplications = [...new Set(items.flatMap(p => p.applications || []))]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <section className="bg-gray-50 pt-8 pb-8 md:pt-14 md:pb-10 px-6 border-b border-gray-200">
        <div className="max-w-5xl mx-auto flex items-end justify-between">
          <div>
            <div className="section-eyebrow">商品比較</div>
            <h1 className="text-4xl md:text-5xl font-bold text-dark tracking-tight">規格比較</h1>
          </div>
          <button onClick={clear} className="text-sm text-gray-400 hover:text-dark transition-colors">
            清除全部
          </button>
        </div>
      </section>

      <div className="flex-1 py-10 px-4 md:px-6 overflow-x-auto pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto" style={{ '--cols': cols }}>

          {/* Product images row */}
          <div className="grid mb-2" style={{ gridTemplateColumns: '120px repeat(' + cols + ', 1fr)' }}>
            <div />
            {items.map(p => (
              <div key={p.id} className="px-3 text-center">
                <div className="relative inline-block mb-3">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden bg-gray-100 mx-auto">
                    {p.images?.[0]
                      ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                    }
                  </div>
                  <button onClick={() => toggle(p)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-gray-300 hover:bg-gray-400 rounded-full flex items-center justify-center transition-colors">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {p.category_name && (
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{p.category_name}</div>
                )}
                <Link to={`/products/${p.id}`} className="text-sm font-semibold text-dark hover:text-primary transition-colors leading-snug block">
                  {p.name}
                </Link>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">

            {/* Short desc */}
            <Row label="簡介">
              {items.map(p => (
                <Cell key={p.id}>{p.short_desc || <span className="text-gray-300">—</span>}</Cell>
              ))}
            </Row>

            {/* Features */}
            {allFeatures.length > 0 && (
              <Row label="產品特點">
                {items.map(p => (
                  <Cell key={p.id}>
                    <div className="space-y-1.5">
                      {allFeatures.map(f => {
                        const has = (p.features || []).includes(f)
                        return (
                          <div key={f} className={`flex items-start gap-2 ${has ? '' : 'opacity-30'}`}>
                            {has
                              ? <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                              : <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            }
                            <span className="text-xs leading-relaxed">{f}</span>
                          </div>
                        )
                      })}
                    </div>
                  </Cell>
                ))}
              </Row>
            )}

            {/* Applications */}
            {allApplications.length > 0 && (
              <Row label="適用場景">
                {items.map(p => (
                  <Cell key={p.id}>
                    <div className="flex flex-wrap gap-1">
                      {allApplications.map(a => {
                        const has = (p.applications || []).includes(a)
                        return (
                          <span key={a} className={`text-xs px-2 py-0.5 rounded-full ${has ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-300'}`}>
                            {a}
                          </span>
                        )
                      })}
                    </div>
                  </Cell>
                ))}
              </Row>
            )}

            {/* Shopee */}
            <Row label="購買">
              {items.map(p => (
                <Cell key={p.id}>
                  <div className="flex flex-col gap-2">
                    <Link to={`/products/${p.id}`} className="text-xs text-primary hover:text-primary-dark transition-colors">
                      查看詳情 ›
                    </Link>
                    {p.shopee_url && (
                      <a href={p.shopee_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-orange-500 hover:text-orange-600 transition-colors">
                        蝦皮購買 ›
                      </a>
                    )}
                    <Link to="/about#contact" className="text-xs text-gray-500 hover:text-dark transition-colors">
                      立即詢價 ›
                    </Link>
                  </div>
                </Cell>
              ))}
            </Row>
          </div>

          {/* Add more */}
          {items.length < 3 && (
            <div className="mt-6 text-center">
              <Link to="/products" className="text-sm text-primary hover:text-primary-dark transition-colors">
                ＋ 再加入一件商品比較
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
