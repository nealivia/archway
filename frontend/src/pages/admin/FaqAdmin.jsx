import { useState, useEffect, useCallback } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const EMPTY = { category: '', question: '', answer: '', sort_order: 0, is_active: true }

export default function FaqAdmin() {
  const [faqs, setFaqs] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)   // null = 無編輯中，'new' = 新增
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])   // 現有分類清單（供下拉選用）
  const [saving, setSaving] = useState(false)

  const fetch = useCallback(() => {
    setLoading(true)
    api.get('/faqs/admin/all')
      .then(r => {
        const data = r.data || []
        setFaqs(data)
        const cats = [...new Set(data.map(f => f.category).filter(Boolean))]
        setCategories(cats)
      })
      .catch(() => toast.error('載入失敗'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const startNew = () => {
    setForm(EMPTY)
    setEditingId('new')
  }
  const startEdit = (f) => {
    setForm({ category: f.category, question: f.question, answer: f.answer, sort_order: f.sort_order, is_active: !!f.is_active })
    setEditingId(f.id)
  }
  const cancel = () => { setEditingId(null); setForm(EMPTY) }

  const save = async () => {
    if (!form.category.trim() || !form.question.trim()) return toast.error('分類與問題為必填')
    setSaving(true)
    try {
      if (editingId === 'new') {
        await api.post('/faqs', form)
        toast.success('新增成功')
      } else {
        await api.put(`/faqs/${editingId}`, form)
        toast.success('已儲存')
      }
      cancel()
      fetch()
    } catch (err) {
      toast.error(err.message || '儲存失敗')
    } finally { setSaving(false) }
  }

  const remove = async (f) => {
    if (!confirm(`確定刪除「${f.question}」？`)) return
    try {
      await api.delete(`/faqs/${f.id}`)
      toast.success('已刪除')
      fetch()
    } catch { toast.error('刪除失敗') }
  }

  const toggleActive = async (f) => {
    try {
      await api.put(`/faqs/${f.id}`, { ...f, is_active: !f.is_active })
      fetch()
    } catch { toast.error('操作失敗') }
  }

  // Group by category for display
  const grouped = faqs.reduce((acc, f) => {
    const cat = f.category || '未分類'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(f)
    return acc
  }, {})

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">技術支援 FAQ</h1>
          <p className="text-gray-500 text-sm mt-1">共 {faqs.length} 條問答，顯示於技術支援頁面</p>
        </div>
        <button onClick={startNew} className="btn-primary text-sm py-2 px-5">+ 新增問答</button>
      </div>

      {/* 新增 / 編輯表單 */}
      {editingId !== null && (
        <div className="bg-white rounded shadow-sm p-6 mb-6 border-l-4 border-primary">
          <h2 className="font-bold text-dark mb-5">{editingId === 'new' ? '新增問答' : '編輯問答'}</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">分類 *</label>
                <input
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  list="cat-list"
                  placeholder="例：施工前準備、產品選擇"
                  className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm"
                />
                <datalist id="cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                <input
                  type="number" min="0"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">問題 *</label>
              <input
                value={form.question}
                onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                placeholder="常見問題標題"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">回答</label>
              <textarea
                rows={5}
                value={form.answer}
                onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
                placeholder="詳細解答內容"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="faq-active" checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="w-4 h-4 accent-primary" />
              <label htmlFor="faq-active" className="text-sm text-gray-700">顯示於網站</label>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={save} disabled={saving}
                className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
                {saving ? '儲存中...' : '儲存'}
              </button>
              <button onClick={cancel} className="text-sm text-gray-500 hover:text-dark px-4 py-2">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ 列表 */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">載入中...</div>
      ) : faqs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">尚無 FAQ，點擊「新增問答」開始建立</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-white rounded shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">{cat}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {items.map(f => (
                  <div key={f.id} className={`px-5 py-4 ${!f.is_active ? 'opacity-40' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-dark mb-1 leading-snug">{f.question}</p>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{f.answer}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggleActive(f)}
                          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${f.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                          {f.is_active ? '顯示' : '隱藏'}
                        </button>
                        <button onClick={() => startEdit(f)}
                          className="text-xs border border-gray-200 px-3 py-1.5 hover:bg-gray-50 rounded-sm font-medium">編輯</button>
                        <button onClick={() => remove(f)}
                          className="text-xs border border-red-200 text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-sm font-medium">刪除</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
