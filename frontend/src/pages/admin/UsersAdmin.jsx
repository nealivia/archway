import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const EMPTY = { username: '', email: '', password: '', role: 'admin', is_active: true }

export default function UsersAdmin() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetch = () => {
    setLoading(true)
    api.get('/users').then(r => setUsers(r.data || [])).finally(() => setLoading(false))
  }

  useEffect(() => { fetch() }, [])

  const reset = () => { setForm(EMPTY); setEditId(null); setShowForm(false) }

  const startEdit = (u) => {
    setEditId(u.id)
    setForm({ username: u.username, email: u.email, password: '', role: u.role, is_active: !!u.is_active })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      if (editId) {
        await api.put(`/users/${editId}`, payload)
        toast.success('帳號已更新')
      } else {
        await api.post('/users', payload)
        toast.success('帳號已新增')
      }
      reset(); fetch()
    } catch (err) { toast.error(err.message || '操作失敗') }
  }

  const handleDelete = async (u) => {
    if (u.id === currentUser.id) return toast.error('不能刪除自己的帳號')
    if (!confirm(`確定刪除「${u.username}」？`)) return
    try {
      await api.delete(`/users/${u.id}`)
      toast.success('已刪除'); fetch()
    } catch { toast.error('刪除失敗') }
  }

  const toggleActive = async (u) => {
    if (u.id === currentUser.id) return toast.error('不能停用自己的帳號')
    try {
      await api.put(`/users/${u.id}`, { ...u, is_active: !u.is_active, password: undefined })
      fetch()
    } catch { toast.error('操作失敗') }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-7">
        <h1 className="text-2xl font-bold text-dark">帳號管理</h1>
        <button onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY) }} className="btn-primary text-sm py-2 px-5">+ 新增帳號</button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded shadow-sm p-6 mb-6">
          <h2 className="font-bold text-dark mb-5">{editId ? '編輯帳號' : '新增管理員帳號'}</h2>
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">帳號 *</label>
              <input value={form.username} onChange={e => set('username', e.target.value)}
                disabled={!!editId} placeholder="登入帳號"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm disabled:bg-gray-50" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">信箱 *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="電子郵件"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                密碼 {editId ? <span className="text-gray-400 font-normal">（留空表示不修改）</span> : '*'}
              </label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                placeholder="至少 8 個字元" minLength={editId ? 0 : 8}
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">角色</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm">
                <option value="admin">一般管理員</option>
                <option value="super_admin">超級管理員</option>
              </select>
            </div>

            {editId && (
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">帳號狀態</label>
                <div className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
                  onClick={() => set('is_active', !form.is_active)}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`}></div>
                </div>
                <span className="text-sm text-gray-500">{form.is_active ? '啟用' : '停用'}</span>
              </div>
            )}

            <div className="md:col-span-2 flex gap-3 justify-end pt-2">
              <button type="button" onClick={reset} className="px-5 py-2.5 border border-gray-200 text-sm rounded-sm hover:bg-gray-50">取消</button>
              <button type="submit" className="btn-primary text-sm py-2.5 px-6">{editId ? '更新帳號' : '新增帳號'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">帳號</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium hidden md:table-cell">信箱</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">角色</th>
              <th className="text-center px-4 py-3 text-gray-500 font-medium">狀態</th>
              <th className="text-right px-5 py-3 text-gray-500 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">載入中...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${u.id === currentUser.id ? 'bg-blue-50/30' : ''}`}>
                <td className="px-5 py-3">
                  <div className="font-medium text-dark flex items-center gap-2">
                    {u.username}
                    {u.id === currentUser.id && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">我</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${u.role === 'super_admin' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {u.role === 'super_admin' ? '⭐ 超級管理員' : '管理員'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleActive(u)}
                    disabled={u.id === currentUser.id}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors disabled:cursor-default ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                    {u.is_active ? '啟用' : '停用'}
                  </button>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(u)} className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 rounded-sm">編輯</button>
                    <button onClick={() => handleDelete(u)} disabled={u.id === currentUser.id} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-sm disabled:opacity-30">刪除</button>
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
