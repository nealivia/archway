import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const EMPTY = { name: '', address: '', phone: '', hours: '', sort_order: 0, is_active: true }

export default function StoresAdmin() {
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { mode: 'add'|'edit', data: {} }
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const fetchStores = () => {
    setLoading(true)
    api.get('/stores/all')
      .then(r => setStores(r.data?.data || []))
      .catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchStores() }, [])

  const openAdd = () => {
    setForm(EMPTY)
    setModal({ mode: 'add' })
  }

  const openEdit = (store) => {
    setForm({ ...store, is_active: store.is_active === 1 })
    setModal({ mode: 'edit', id: store.id })
  }

  const closeModal = () => setModal(null)

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('門市名稱為必填')
    setSaving(true)
    try {
      if (modal.mode === 'add') {
        await api.post('/stores', form)
        toast.success('門市新增成功')
      } else {
        await api.put(`/stores/${modal.id}`, form)
        toast.success('門市更新成功')
      }
      closeModal()
      fetchStores()
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (store) => {
    if (!window.confirm(`確定要刪除「${store.name}」？`)) return
    try {
      await api.delete(`/stores/${store.id}`)
      toast.success('門市已刪除')
      fetchStores()
    } catch {
      toast.error('刪除失敗')
    }
  }

  const toggleActive = async (store) => {
    try {
      await api.put(`/stores/${store.id}`, { ...store, is_active: !store.is_active })
      fetchStores()
    } catch {
      toast.error('更新失敗')
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">門市管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stores.length} 間門市</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <span className="text-lg leading-none">+</span> 新增門市
        </button>
      </div>

      {/* Store cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin" />
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">尚無門市資料</div>
      ) : (
        <div className="space-y-3">
          {stores.map(store => (
            <div key={store.id} className={`bg-white border rounded-xl p-5 flex items-start gap-4 transition-opacity ${store.is_active ? '' : 'opacity-50'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">{store.name}</span>
                  {!store.is_active && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">下架</span>}
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {store.address && <div>📍 {store.address}</div>}
                  {store.phone && <div>📞 {store.phone}</div>}
                  {store.hours && <div>🕐 {store.hours}</div>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleActive(store)}
                  title={store.is_active ? '點擊下架' : '點擊上架'}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${store.is_active ? 'border-green-200 text-green-600 hover:bg-red-50 hover:text-red-500 hover:border-red-200' : 'border-gray-200 text-gray-400 hover:bg-green-50 hover:text-green-600 hover:border-green-200'}`}>
                  {store.is_active ? '上架中' : '已下架'}
                </button>
                <button onClick={() => openEdit(store)} className="text-xs text-gray-500 hover:text-dark border border-gray-200 px-2.5 py-1 rounded-full hover:border-gray-400 transition-colors">
                  編輯
                </button>
                <button onClick={() => handleDelete(store)} className="text-xs text-red-400 hover:text-red-600 border border-red-100 hover:border-red-300 px-2.5 py-1 rounded-full transition-colors">
                  刪除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5">
              {modal.mode === 'add' ? '新增門市' : '編輯門市'}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">門市名稱 *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="例：和平店"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">地址</label>
                <input
                  value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="例：台北市中正區和平西路一段136號1樓"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">電話</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="例：02-2365-0047"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">營業時間</label>
                <input
                  value={form.hours}
                  onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
                  placeholder="例：週一至週六 07:00–19:00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">排序</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-xs text-gray-600">上架顯示</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                取消
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
