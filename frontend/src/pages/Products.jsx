import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import api from '../api/client'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const categoryId = searchParams.get('category_id') || ''
  const page = Number(searchParams.get('page') || 1)
  const LIMIT = 12

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, page })
    if (categoryId) params.set('category_id', categoryId)
    if (search) params.set('search', search)
    api.get(`/products?${params}`)
      .then(r => { setProducts(r.data || []); setTotal(r.total || 0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [categoryId, page, search])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearchParams(prev => {
      const p = new URLSearchParams(prev)
      p.set('search', search)
      p.delete('page')
      return p
    })
  }

  const setCategory = (id) => setSearchParams(id ? { category_id: id } : {})
  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Header */}
      <div className="bg-gray-50 pt-8 pb-8 md:pt-14 md:pb-10 px-6 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="section-eyebrow">ARCHWAY 松上防水</div>
          <h1 className="text-4xl md:text-5xl font-bold text-dark tracking-tight mb-2">產品目錄</h1>
          <p className="text-base md:text-lg text-gray-500">完整防水材料系列，滿足各種工程需求</p>
        </div>
      </div>

      <div className="flex-1 py-10 bg-white px-6">
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

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${!categoryId ? 'bg-dark text-white border-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
            >
              全部
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(String(c.id))}
                className={`px-4 py-1.5 text-sm rounded-full border transition-colors ${categoryId === String(c.id) ? 'bg-dark text-white border-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 mb-6">共 {total} 項產品</p>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-gray-100 animate-pulse rounded-2xl aspect-video"></div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-24 text-gray-300">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <p className="text-gray-400">找不到相符的產品</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('page', i + 1); return p })}
                  className={`w-9 h-9 text-sm rounded-full border transition-colors ${page === i + 1 ? 'bg-dark text-white border-dark' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
