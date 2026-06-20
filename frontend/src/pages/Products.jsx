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

  const setCategory = (id) => {
    setSearchParams(id ? { category_id: id } : {})
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Page Header */}
      <div className="bg-dark py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-extrabold text-white mb-2">產品目錄</h1>
          <p className="text-gray-400">完整防水材料系列，滿足各種工程需求</p>
        </div>
      </div>

      <div className="flex-1 py-10 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="搜尋產品..."
                className="flex-1 border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              <button type="submit" className="bg-dark text-white px-5 py-2.5 text-sm font-medium hover:bg-primary transition-colors">
                搜尋
              </button>
            </form>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setCategory('')}
              className={`px-4 py-2 text-sm font-medium border transition-colors ${!categoryId ? 'bg-dark text-white border-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-dark'}`}
            >
              全部
            </button>
            {categories.map(c => (
              <button
                key={c.id}
                onClick={() => setCategory(String(c.id))}
                className={`px-4 py-2 text-sm font-medium border transition-colors ${categoryId === String(c.id) ? 'bg-dark text-white border-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-dark'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Results count */}
          <p className="text-gray-500 text-sm mb-6">共 {total} 項產品</p>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-gray-200 animate-pulse aspect-video rounded"></div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-lg">找不到相符的產品</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-12">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSearchParams(prev => { const p = new URLSearchParams(prev); p.set('page', i + 1); return p })}
                  className={`w-10 h-10 text-sm font-medium border transition-colors ${page === i + 1 ? 'bg-dark text-white border-dark' : 'bg-white text-gray-600 border-gray-200 hover:border-dark'}`}
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
