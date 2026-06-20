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
  const [page, setPage] = useState(1)
  const LIMIT = 15

  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: LIMIT, page })
    if (categoryId) params.set('category_id', categoryId)
    if (search) params.set('search', search)
    api.get(`/products/admin/all?${params}`)
      .then(r => { setProducts(r.data || []); setTotal(r.total || 0) })
      .catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [search, categoryId, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

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
        <Link to="/admin/products/new" className="btn-primary text-sm py-2 px-5">+ 新增商品</Link>
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
                <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">載入中...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">暫無商品</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt="" className="w-10 h-10 object-cover rounded border border-gray-200 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 flex-shrink-0 flex items-center justify-center text-gray-300 text-lg">📷</div>
                      )}
                      <div>
                        <div className="font-medium text-dark">{p.name}</div>
                        {p.short_desc && <div className="text-xs text-gray-400 truncate max-w-xs">{p.short_desc}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-gray-500 hidden md:table-cell">{p.category_name || '-'}</td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    {p.price ? (
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
