import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function ProductsAdmin() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [total, setTotal] = useState(0)
  const [featuredTotal, setFeaturedTotal] = useState(0)
  const [page, setPage] = useState(1)
  const LIMIT = 15

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, page })
    if (categoryId) params.set('category_id', categoryId)
    if (search) params.set('search', search)
    api.get(`/products/admin/all?${params}`)
      .then(r => { setProducts(r.data || []); setTotal(r.total || 0); setFeaturedTotal(r.featuredTotal || 0) })
      .catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [search, categoryId, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  const featuredCount = featuredTotal

  const toggleActive = async (p) => {
    try {
      await api.put(`/products/${p.id}`, {
        ...p,
        features: p.features || [],
        applications: p.applications || [],
        images: p.images || [],
        is_active: !p.is_active
      })
      toast.success(p.is_active ? '已下架' : '已上架')
      fetchProducts()
    } catch { toast.error('操作失敗') }
  }

  const toggleFeatured = async (p) => {
    if (!p.is_featured && featuredCount >= 3) {
      toast.error('首頁最多展示 3 件精選商品，請先取消其他精選')
      return
    }
    try {
      await api.put(`/products/${p.id}`, {
        ...p,
        features: p.features || [],
        applications: p.applications || [],
        images: p.images || [],
        is_featured: !p.is_featured
      })
      toast.success(p.is_featured ? '已移除精選' : '已加入精選首頁')
      fetchProducts()
    } catch { toast.error('操作失敗') }
  }

  const handleDelete = async (p) => {
    if (!confirm(`確定刪除「${p.name}」？此操作無法復原。`)) return
    try {
      await api.delete(`/products/${p.id}`)
      toast.success('已刪除')
      fetchProducts()
    } catch { toast.error('刪除失敗') }
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">商品管理</h1>
          <p className="text-gray-500 text-sm mt-1">共 {total} 項商品</p>
        </div>
        <div className="flex items-center gap-4">
          {/* Featured slots indicator */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <span>首頁精選</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < featuredCount ? 'bg-primary' : 'bg-gray-200'}`} />
              ))}
            </div>
            <span className="text-xs text-gray-400">{featuredCount}/3</span>
          </div>
          <Link to="/admin/products/new" className="btn-primary text-sm py-2 px-5">+ 新增商品</Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded shadow-sm p-4 mb-5 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="搜尋商品名稱..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-200 px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:border-primary rounded-sm"
        />
        <select
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value); setPage(1) }}
          className="border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm"
        >
          <option value="">全部分類</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">商品</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">分類</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">定價</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">狀態</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">首頁精選</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">載入中...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400">暫無商品</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.is_featured ? 'bg-red-50/30' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center text-gray-300 text-lg">📷</div>
                      )}
                      <div>
                        <div className="font-medium text-dark flex items-center gap-1.5">
                          {p.name}
                        </div>
                        {p.short_desc && <div className="text-xs text-gray-400 truncate max-w-xs">{p.short_desc}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 hidden md:table-cell">{p.category_name || '-'}</td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {p.prices?.length > 0 ? (
                      <div className="space-y-0.5">
                        {p.prices.map((tier, i) => (
                          <div key={i} className="text-xs">
                            {tier.size && <span className="text-gray-400 mr-1">{tier.size}</span>}
                            <span className="text-primary font-bold">NT${Number(tier.price).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ) : p.price ? (
                      <span className="text-primary font-bold">NT${Number(p.price).toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">洽詢</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${p.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                    >
                      {p.is_active ? '上架中' : '已下架'}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button
                      onClick={() => toggleFeatured(p)}
                      title={p.is_featured ? '取消精選' : '加入首頁精選'}
                      className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all ${
                        p.is_featured
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 text-gray-300 hover:bg-gray-200 hover:text-gray-400'
                      }`}
                    >
                      <svg className="w-4 h-4" fill={p.is_featured ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/admin/products/${p.id}/edit`} className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 rounded-sm font-medium">編輯</Link>
                      <button onClick={() => handleDelete(p)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-sm font-medium">刪除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">第 {page} / {totalPages} 頁</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-sm">上一頁</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-gray-200 hover:bg-gray-50 disabled:opacity-40 rounded-sm">下一頁</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
