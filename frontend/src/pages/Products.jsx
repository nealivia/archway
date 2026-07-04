import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import api from '../api/client'

const CAT_ICONS = {
  '防水塗料':      '🎨',
  '防水砂漿':      '🧱',
  '隔熱材料':      '🌡️',
  '透明塗料':      '🔍',
  '填縫材料':      '🔧',
  '黏著劑':        '🔗',
  '砂漿改性劑':    '⚗️',
  '灌注材料':      '💧',
  '自平水泥':      '⬜',
  '結構補強':      '🏗️',
  '防水毯/瀝青/底油': '🛡️',
  'PU/EPOXY':      '🧪',
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [allProducts, setAllProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const sectionRefs = useRef({})

  const categoryId = searchParams.get('category_id') || ''

  // 載入分類
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  // 載入全部產品
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: 200 })
    if (search) params.set('search', search)
    api.get(`/products?${params}`)
      .then(r => setAllProducts(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [search])

  // 選分類
  const setCategory = (id) => {
    setSearchParams(id ? { category_id: id } : {})
    // 滾到對應 section
    if (id && sectionRefs.current[id]) {
      sectionRefs.current[id].scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchParams(search ? { search } : {})
  }

  // 過濾＆分組
  const filtered = categoryId
    ? allProducts.filter(p => String(p.category_id) === categoryId)
    : allProducts

  // 依分類分組（無搜尋且無選分類時）
  const grouped = categories.map(cat => ({
    ...cat,
    products: allProducts.filter(p => p.category_id === cat.id)
  })).filter(g => g.products.length > 0)

  const showGrouped = !categoryId && !search

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gray-50 pt-8 pb-6 md:pt-14 md:pb-10 px-6 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="section-eyebrow">ARCHWAY 松上防水</div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark tracking-tight mb-2">產品目錄</h1>
          <p className="text-base text-gray-500">完整防水材料系列，滿足各種工程需求</p>
        </div>
      </div>

      {/* ── 分類橫向捲軸（Apple 風格）── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 px-4 py-4 w-max">
            {/* 全部 */}
            <button
              onClick={() => setCategory('')}
              className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl transition-colors min-w-[76px] ${
                !categoryId ? 'bg-dark text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span className="text-3xl">🏠</span>
              <span className="text-[12px] font-medium whitespace-nowrap">全部</span>
            </button>

            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(String(c.id))}
                className={`flex flex-col items-center gap-1.5 px-5 py-3 rounded-2xl transition-colors min-w-[76px] ${
                  categoryId === String(c.id) ? 'bg-dark text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <span className="text-3xl">{CAT_ICONS[c.name] || '📦'}</span>
                <span className="text-[12px] font-medium whitespace-nowrap">{c.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 py-8 bg-white px-4">
        <div className="max-w-5xl mx-auto">

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-md">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜尋產品..."
              className="flex-1 border border-gray-200 rounded-full px-5 py-2.5 text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
            />
            <button type="submit" className="bg-dark text-white rounded-full px-5 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors">
              搜尋
            </button>
          </form>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-square"></div>
              ))}
            </div>
          ) : showGrouped ? (
            /* ── 全部：依分類橫向滑動 ── */
            <div className="space-y-10">
              {grouped.map(cat => (
                <div key={cat.id} ref={el => sectionRefs.current[cat.id] = el}>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{CAT_ICONS[cat.name] || '📦'}</span>
                      <h2 className="text-lg font-bold text-dark">{cat.name}</h2>
                      <span className="text-xs text-gray-400">{cat.products.length} 項</span>
                    </div>
                    <button onClick={() => setCategory(String(cat.id))} className="text-xs text-primary">查看全部 ›</button>
                  </div>
                  {/* 橫向滑動列 */}
                  <div className="overflow-x-auto scrollbar-hide -mx-4">
                    <div className="flex gap-3 px-4 w-max pb-2">
                      {cat.products.map(p => (
                        <div key={p.id} className="w-40 flex-shrink-0">
                          <ProductCard product={p} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <div className="text-center py-24 text-gray-300">
                  <p className="text-gray-400">目前尚無產品</p>
                </div>
              )}
            </div>
          ) : (
            /* ── 篩選結果 ── */
            <>
              <p className="text-xs text-gray-400 mb-5">共 {filtered.length} 項產品</p>
              {filtered.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filtered.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
              ) : (
                <div className="text-center py-24 text-gray-300">
                  <p className="text-gray-400">找不到相符的產品</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
