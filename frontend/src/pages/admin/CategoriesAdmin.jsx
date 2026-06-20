import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({ name: '', description: '', sort_order: 0 })
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = () => {
    setLoading(true)
    api.get('/categories').then(r => setCategories(r.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const reset = () => { setForm({ name: '', description: '', sort_order: 0 }); setEditId(null) }

  const startEdit = (c) => {
    setEditId(c.id)
    setForm({ name: c.name, description: c.description || '', sort_order: c.sort_order || 0 })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('分類名稱為必填')
    try {
      if (editId) {
        await api.put(`/categories/${editId}`, form)
        toast.success('分類已更新')
      } else {
        await api.post('/categories', form)
        toast.success('分類已新增')
      }
      reset(); fetch()
    } catch (err) { toast.error(err.message || '操作失敗') }
  }

  const handleDelete = async (c) => {
    if (!confirm(`確定刪除「${c.name}」分類？旗下商品將變為未分類。`)) return
    try {
      await api.delete(`/categories/${c.id}`)
      toast.success('已刪除'); fetch()
    } catch { toast.error('刪除失敗') }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-dark mb-7">分類管理</h1>

      {/* Form */}
      <div className="bg-white rounded shadow-sm p-6 mb-6">
        <h2 className="font-bold text-dark mb-5">{editId ? '編輯分類' : '新增分類'}</h2>
        <form onSubmit={handleSubmit} className="grid md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">分類名稱 *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="例：防水塗料"
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">說明</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="簡短說明（選填）"
              className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">排序</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} min="0"
                className="w-full border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            </div>
          </div>
          <div className="md:col-span-3 flex gap-2 justify-end">
            {editId && <button type="button" onClick={reset} className="px-4 py-2 border border-gray-200 text-sm rounded-sm hover:bg-gray-50">取消</button>}
            <button type="submit" className="btn-primary text-sm py-2 px-5">{editId ? '更新' : '新增分類'}</button>
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">名稱</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">說明</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">排序</th>
              <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">載入中...</td></tr>
            ) : categories.map(c => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-dark">{c.name}</td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{c.description || '-'}</td>
                <td className="px-4 py-3 text-center text-gray-500">{c.sort_order}</td>
                <td className="px-5 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(c)} className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 rounded-sm">編輯</button>
                    <button onClick={() => handleDelete(c)} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-sm">刪除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
