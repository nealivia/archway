import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ products: 0, active: 0, categories: 0 })
  const [recentProducts, setRecentProducts] = useState([])
  const [maintenance, setMaintenance] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api.get('/products/admin/all?limit=999').then(r => {
      const products = r.data || []
      setStats(s => ({
        ...s,
        products: r.total || 0,
        active: products.filter(p => p.is_active).length
      }))
      setRecentProducts(products.slice(0, 5))
    }).catch(() => {})

    api.get('/categories').then(r => {
      setStats(s => ({ ...s, categories: (r.data || []).length }))
    }).catch(() => {})

    api.get('/settings/maintenance').then(r => {
      setMaintenance(r.maintenance || false)
    }).catch(() => {})
  }, [])

  const toggleMaintenance = async () => {
    setToggling(true)
    try {
      const r = await api.post('/settings/maintenance', { enabled: !maintenance })
      setMaintenance(r.maintenance)
      toast.success(r.maintenance ? '✅ 維護模式已開啟' : '✅ 網站已恢復正常')
    } catch {
      toast.error('切換失敗')
    } finally {
      setToggling(false)
    }
  }

  const cards = [
    { label: '商品總數', value: stats.products, icon: '📦', to: '/admin/products', color: 'bg-blue-500' },
    { label: '上架中', value: stats.active, icon: '✅', to: '/admin/products', color: 'bg-green-500' },
    { label: '商品分類', value: stats.categories, icon: '🏷️', to: '/admin/categories', color: 'bg-purple-500' }
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark">儀表板</h1>
        <p className="text-gray-500 text-sm mt-1">歡迎回來，{user?.username} 👋</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {cards.map(c => (
          <Link key={c.label} to={c.to} className="bg-white rounded shadow-sm p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`${c.color} text-white w-12 h-12 rounded-lg flex items-center justify-center text-2xl flex-shrink-0`}>
              {c.icon}
            </div>
            <div>
              <div className="text-3xl font-extrabold text-dark">{c.value}</div>
              <div className="text-gray-500 text-sm">{c.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* 維護模式開關 */}
      {user?.role === 'super_admin' && (
        <div className={`mb-6 p-5 rounded shadow-sm flex items-center justify-between ${maintenance ? 'bg-red-50 border border-red-200' : 'bg-white border border-gray-100'}`}>
          <div>
            <div className="font-semibold text-dark flex items-center gap-2">
              🔧 網站維護模式
              {maintenance && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">開啟中</span>}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {maintenance ? '訪客目前看到維護頁面，後台仍可正常使用' : '網站正常對外開放'}
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            disabled={toggling}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${maintenance ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${maintenance ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-dark">最新商品</h2>
            <Link to="/admin/products" className="text-primary text-sm hover:underline">查看全部</Link>
          </div>
          {recentProducts.length > 0 ? (
            <ul className="space-y-3">
              {recentProducts.map(p => (
                <li key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-dark">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.category_name || '未分類'}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {p.price && <span className="text-primary text-sm font-bold">NT${Number(p.price).toLocaleString()}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.is_active ? '上架' : '下架'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">尚無商品</p>
          )}
        </div>

        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5">快速操作</h2>
          <div className="space-y-3">
            <Link to="/admin/products/new" className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors rounded group">
              <span className="text-2xl">➕</span>
              <div>
                <div className="font-medium text-dark group-hover:text-primary text-sm">新增商品</div>
                <div className="text-xs text-gray-400">上架新的防水材料</div>
              </div>
            </Link>
            <Link to="/admin/categories" className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors rounded group">
              <span className="text-2xl">🏷️</span>
              <div>
                <div className="font-medium text-dark group-hover:text-primary text-sm">管理分類</div>
                <div className="text-xs text-gray-400">新增或編輯商品分類</div>
              </div>
            </Link>
            {user?.role === 'super_admin' && (
              <Link to="/admin/users" className="flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors rounded group">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="font-medium text-dark group-hover:text-primary text-sm">帳號管理</div>
                  <div className="text-xs text-gray-400">新增或管理後台帳號</div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
