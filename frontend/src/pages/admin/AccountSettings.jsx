import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function AccountSettings() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 2FA setup state
  const [setupStep, setSetupStep] = useState('idle') // idle | scanning | confirming
  const [qrCode, setQrCode] = useState('')
  const [backupSecret, setBackupSecret] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [showDisable, setShowDisable] = useState(false)
  const [saving, setSaving] = useState(false)

  // Change password state
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)

  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r.user))
      .catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  // ── 2FA Setup ─────────────────────────────────────────────────────────────
  const handleStartSetup = async () => {
    setSaving(true)
    try {
      const res = await api.post('/auth/2fa/setup')
      setQrCode(res.qrCode)
      setBackupSecret(res.secret)
      setSetupStep('scanning')
    } catch { toast.error('設定失敗') }
    finally { setSaving(false) }
  }

  const handleConfirmSetup = async () => {
    if (confirmCode.length !== 6) return toast.error('請輸入 6 位數驗證碼')
    setSaving(true)
    try {
      await api.post('/auth/2fa/confirm-setup', { code: confirmCode })
      toast.success('雙因素驗證已啟用！')
      setUser(u => ({ ...u, totp_enabled: 1 }))
      setSetupStep('idle')
      setQrCode('')
      setConfirmCode('')
    } catch (err) {
      toast.error(err.message || '驗證碼錯誤')
      setConfirmCode('')
    }
    finally { setSaving(false) }
  }

  const handleDisable = async () => {
    if (disableCode.length !== 6) return toast.error('請輸入 6 位數驗證碼')
    setSaving(true)
    try {
      await api.post('/auth/2fa/disable', { code: disableCode })
      toast.success('雙因素驗證已停用')
      setUser(u => ({ ...u, totp_enabled: 0 }))
      setShowDisable(false)
      setDisableCode('')
    } catch (err) {
      toast.error(err.message || '驗證碼錯誤')
      setDisableCode('')
    }
    finally { setSaving(false) }
  }

  // ── Change Password ────────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword)
      return toast.error('新密碼與確認密碼不符')
    if (pwForm.newPassword.length < 8)
      return toast.error('密碼至少需要 8 個字元')
    setPwSaving(true)
    try {
      await api.put('/auth/change-password', { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword })
      toast.success('密碼修改成功')
      setPwForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.message || '修改失敗')
    }
    finally { setPwSaving(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-900">帳號設定</h1>

      {/* ── 2FA ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">雙因素驗證（2FA）</h2>
            <p className="text-xs text-gray-500 mt-1">啟用後登入需搭配驗證器 App（Google Authenticator、Authy 等）</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user?.totp_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {user?.totp_enabled ? '已啟用' : '未啟用'}
          </span>
        </div>

        {/* 未啟用 */}
        {!user?.totp_enabled && setupStep === 'idle' && (
          <button onClick={handleStartSetup} disabled={saving}
            className="bg-dark text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? '處理中...' : '啟用雙因素驗證'}
          </button>
        )}

        {/* 步驟一：掃描 QR code */}
        {setupStep === 'scanning' && (
          <div>
            <p className="text-sm text-gray-600 mb-4">請用驗證器 App 掃描下方 QR code：</p>
            <div className="flex justify-center mb-4">
              <img src={qrCode} alt="QR Code" className="w-48 h-48 border border-gray-200 rounded-lg" />
            </div>
            <details className="mb-4">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">無法掃描？手動輸入金鑰</summary>
              <div className="mt-2 bg-gray-50 rounded px-3 py-2 font-mono text-xs text-gray-600 break-all select-all">{backupSecret}</div>
            </details>
            <button onClick={() => setSetupStep('confirming')}
              className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
              已掃描，下一步 →
            </button>
            <button onClick={() => { setSetupStep('idle'); setQrCode('') }}
              className="ml-3 text-sm text-gray-400 hover:text-gray-600">取消</button>
          </div>
        )}

        {/* 步驟二：確認驗證碼 */}
        {setupStep === 'confirming' && (
          <div>
            <p className="text-sm text-gray-600 mb-3">請輸入驗證器 App 上的 6 位數驗證碼以完成設定：</p>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                inputMode="numeric"
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:border-primary"
              />
              <button onClick={handleConfirmSetup} disabled={saving || confirmCode.length !== 6}
                className="bg-primary text-white text-sm px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? '驗證中...' : '確認啟用'}
              </button>
              <button onClick={() => setSetupStep('scanning')} className="text-sm text-gray-400 hover:text-gray-600">← 上一步</button>
            </div>
          </div>
        )}

        {/* 已啟用 → 停用 */}
        {user?.totp_enabled && !showDisable && (
          <button onClick={() => setShowDisable(true)}
            className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 px-4 py-2 rounded-lg transition-colors">
            停用雙因素驗證
          </button>
        )}

        {user?.totp_enabled && showDisable && (
          <div>
            <p className="text-sm text-gray-600 mb-3">輸入驗證器目前的 6 位數驗證碼以確認停用：</p>
            <div className="flex gap-3 items-center">
              <input
                type="text"
                inputMode="numeric"
                value={disableCode}
                onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                autoFocus
                className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-center text-xl tracking-widest font-mono focus:outline-none focus:border-red-400"
              />
              <button onClick={handleDisable} disabled={saving || disableCode.length !== 6}
                className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
                {saving ? '處理中...' : '確認停用'}
              </button>
              <button onClick={() => { setShowDisable(false); setDisableCode('') }}
                className="text-sm text-gray-400 hover:text-gray-600">取消</button>
            </div>
          </div>
        )}
      </div>

      {/* ── 修改密碼 ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 text-sm mb-4">修改密碼</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">目前密碼</label>
            <input type="password" value={pwForm.oldPassword}
              onChange={e => setPwForm(f => ({ ...f, oldPassword: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">新密碼（至少 8 字元）</label>
            <input type="password" value={pwForm.newPassword}
              onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400" required />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">確認新密碼</label>
            <input type="password" value={pwForm.confirmPassword}
              onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400" required />
          </div>
          <button type="submit" disabled={pwSaving}
            className="bg-dark text-white text-sm px-5 py-2.5 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {pwSaving ? '修改中...' : '更新密碼'}
          </button>
        </form>
      </div>
    </div>
  )
}
