import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/admin" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.username, form.password)
      navigate('/admin')
    } catch (err) {
      toast.error(err.message || '登入失敗，請確認帳號密碼')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary flex items-center justify-center rounded-sm mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9 fill-white">
              <path d="M12 2C8.5 8 4 11.5 4 15a8 8 0 0016 0c0-3.5-4.5-7-8-13z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">松上防水 後台管理</h1>
          <p className="text-gray-400 text-sm mt-1">請輸入您的帳號與密碼</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-sm shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">帳號</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                placeholder="輸入帳號"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 text-sm focus:outline-none focus:border-primary rounded-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">密碼</label>
              <input
                type="password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="輸入密碼"
                required
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 text-sm focus:outline-none focus:border-primary rounded-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 mt-6 transition-colors disabled:opacity-60 rounded-sm"
          >
            {loading ? '登入中...' : '登入'}
          </button>

        </form>
      </div>
    </div>
  )
}
