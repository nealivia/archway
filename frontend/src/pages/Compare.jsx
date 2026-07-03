import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useCompare } from '../context/CompareContext'

// Feature families: tiers ordered low → high
// If a product has a tier, it shows that tier; lower tiers in the same family are suppressed
const FEATURE_FAMILIES = [
  {
    label: '彈性伸縮率',
    tiers: ['彈性伸縮率 200% 以上', '彈性伸縮率 300% 以上'],
  },
  {
    label: '使用年限',
    tiers: ['使用年限 3–5 年以上', '使用年限 5–7 年以上', '使用年限 7–10 年以上'],
  },
]

function getProductFamilyTier(product, family) {
  let maxIdx = -1
  family.tiers.forEach((tier, idx) => {
    if ((product.features || []).includes(tier)) maxIdx = idx
  })
  return maxIdx
}

// Build comparison rows: collapse family features into one row each
function buildFeatureRows(items) {
  const allRaw = [...new Set(items.flatMap(p => p.features || []))]
  const rows = []
  const addedFamilies = new Set()
  allRaw.forEach(f => {
    const fam = FEATURE_FAMILIES.find(fm => fm.tiers.includes(f))
    if (fam) {
      if (!addedFamilies.has(fam.label)) {
        addedFamilies.add(fam.label)
        rows.push({ type: 'family', label: fam.label, family: fam })
      }
    } else {
      rows.push({ type: 'single', label: f })
    }
  })
  return rows
}

function FeatureCell({ product, row }) {
  if (row.type === 'single') {
    const has = (product.features || []).includes(row.label)
    return (
      <div className={`flex items-center gap-2 ${has ? '' : 'opacity-25'}`}>
        {has
          ? <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        }
        <span className="text-xs text-gray-600 leading-snug">{row.label}</span>
      </div>
    )
  }
  // Family feature: show tier achieved or —
  const tierIdx = getProductFamilyTier(product, row.family)
  if (tierIdx < 0) return <span className="text-gray-300 text-xs">—</span>
  const tierSuffix = row.family.tiers[tierIdx].replace(row.label, '').trim()
  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
      <span className="text-xs text-gray-700 font-medium">{tierSuffix}</span>
    </div>
  )
}

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
  const featureRows = buildFeatureRows(items)
  const allApplications = [...new Set(items.flatMap(p => p.applications || []))]
  const gridCols = `140px repeat(${cols}, 1fr)`

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
          <button onClick={clear} className="text-sm text-gray-400 hover:text-dark transition-colors">清除全部</button>
        </div>
      </section>

      <div className="flex-1 py-10 px-4 md:px-6 overflow-x-auto pb-28 md:pb-10">
        <div className="max-w-5xl mx-auto">

          {/* Product header cards */}
          <div className="grid gap-0 mb-6" style={{ gridTemplateColumns: gridCols }}>
            <div />
            {items.map(p => (
              <div key={p.id} className="px-4 text-center">
                <div className="relative inline-block mb-3">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 mx-auto shadow-sm">
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

          {/* Comparison table */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 divide-y divide-gray-50">

            {/* Section label helper */}
            {/* 簡介 */}
            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
              <div className="py-5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-start pt-6 bg-gray-50/60">簡介</div>
              {items.map(p => (
                <div key={p.id} className="py-5 px-5 border-l border-gray-100 text-sm text-gray-600 leading-relaxed">
                  {p.short_desc || <span className="text-gray-300">—</span>}
                </div>
              ))}
            </div>

            {/* Features */}
            {featureRows.length > 0 && (
              <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                <div className="py-5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-start pt-6 bg-gray-50/60">產品特點</div>
                {items.map(p => (
                  <div key={p.id} className="py-5 px-5 border-l border-gray-100 space-y-3">
                    {featureRows.map((row, i) => (
                      <FeatureCell key={i} product={p} row={row} />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Applications */}
            {allApplications.length > 0 && (
              <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                <div className="py-5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-start pt-6 bg-gray-50/60">適用場景</div>
                {items.map(p => (
                  <div key={p.id} className="py-5 px-5 border-l border-gray-100">
                    <div className="flex flex-wrap gap-1.5">
                      {allApplications.map(a => {
                        const has = (p.applications || []).includes(a)
                        return (
                          <span key={a} className={`text-xs px-2.5 py-1 rounded-full transition-colors ${has ? 'bg-gray-100 text-gray-600' : 'text-gray-200'}`}>
                            {a}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Downloads */}
            {items.some(p => p.datasheet_url || p.installation_url) && (
              <div className="grid" style={{ gridTemplateColumns: gridCols }}>
                <div className="py-5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-start pt-6 bg-gray-50/60">文件下載</div>
                {items.map(p => (
                  <div key={p.id} className="py-5 px-5 border-l border-gray-100 space-y-2">
                    {p.datasheet_url && (
                      <a href={p.datasheet_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        技術文件
                      </a>
                    )}
                    {p.installation_url && (
                      <a href={p.installation_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        施工說明
                      </a>
                    )}
                    {!p.datasheet_url && !p.installation_url && (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Purchase */}
            <div className="grid" style={{ gridTemplateColumns: gridCols }}>
              <div className="py-5 px-5 text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-start pt-6 bg-gray-50/60">購買</div>
              {items.map(p => (
                <div key={p.id} className="py-5 px-5 border-l border-gray-100 space-y-2.5">
                  <Link to={`/products/${p.id}`} className="block text-xs font-medium text-primary hover:text-primary-dark transition-colors">
                    查看詳情 ›
                  </Link>
                  {p.shopee_url && (
                    <a href={p.shopee_url} target="_blank" rel="noopener noreferrer"
                      className="block text-xs text-orange-500 hover:text-orange-600 transition-colors">
                      蝦皮購買 ›
                    </a>
                  )}
                  <Link to="/about#contact" className="block text-xs text-gray-400 hover:text-dark transition-colors">
                    立即洽購 ›
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {items.length < 3 && (
            <div className="mt-8 text-center">
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
