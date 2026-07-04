import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const { login, complete2FA, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // step: 'password' | '2fa'
  const [step, setStep] = useState('password')
  const [form, setForm] = useState({ username: '', password: '' })
  const [otpCode, setOtpCode] = useState('')
  const [tempToken, setTempToken] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/admin" replace />

  const handlePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await login(form.username, form.password)
      if (result.requires2FA) {
        setTempToken(result.tempToken)
        setStep('2fa')
      } else {
        navigate('/admin')
      }
    } catch (err) {
      toast.error(err.message || '登入失敗，請確認帳號密碼')
    } finally {
      setLoading(false)
    }
  }

  const handle2FA = async (e) => {
    e.preventDefault()
    if (otpCode.replace(/\s/g, '').length !== 6) {
      toast.error('請輸入 6 位數驗證碼')
      return
    }
    setLoading(true)
    try {
      await complete2FA(tempToken, otpCode)
      navigate('/admin')
    } catch (err) {
      toast.error(err.message || '驗證碼錯誤，請重試')
      setOtpCode('')
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
          <p className="text-gray-400 text-sm mt-1">
            {step === 'password' ? '請輸入您的帳號與密碼' : '請輸入驗證器上的 6 位數驗證碼'}
          </p>
        </div>

        {step === 'password' ? (
          <form onSubmit={handlePassword} className="bg-gray-800 p-8 rounded-sm shadow-2xl">
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
              {loading ? '驗證中...' : '下一步'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FA} className="bg-gray-800 p-8 rounded-sm shadow-2xl">
            {/* 2FA 圖示 */}
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2 text-center">驗證碼</label>
              <input
                type="text"
                inputMode="numeric"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                autoFocus
                className="w-full bg-gray-700 border border-gray-600 text-white px-4 py-3 text-2xl text-center tracking-widest font-mono focus:outline-none focus:border-primary rounded-sm"
              />
              <p className="text-gray-500 text-xs text-center mt-2">請開啟驗證器 App 查看 6 位數驗證碼</p>
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 mt-6 transition-colors disabled:opacity-60 rounded-sm"
            >
              {loading ? '驗證中...' : '登入'}
            </button>

            <button
              type="button"
              onClick={() => { setStep('password'); setOtpCode(''); setTempToken('') }}
              className="w-full text-gray-500 hover:text-gray-300 text-sm mt-3 transition-colors"
            >
              ← 返回重新登入
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
