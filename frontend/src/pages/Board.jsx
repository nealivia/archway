import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STORE_KEY = 'board_store_id'
const TABS = [
  { key: 'deliveries', label: '🚚 配送單' },
  { key: 'stock', label: '📦 缺訂貨狀態' },
  { key: 'comments', label: '💬 留言板' },
  { key: 'history', label: '🕘 歷史紀錄查詢' }
]

const DELIVERY_STATUSES = ['待配送', '配送中', '已送達']
const STOCK_STATUSES = ['缺貨', '已叫貨待補', '已到貨']
const STORE_COLORS = ['#E8000B', '#185FA5', '#0F6E56', '#854F0B', '#534AB7', '#993C1D', '#3B6D11', '#993556']
const storeColor = (id) => STORE_COLORS[Number(id) % STORE_COLORS.length]
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function dateKey(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function buildMonthGrid(viewMonth) {
  const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1)
  const start = new Date(first)
  start.setDate(start.getDate() - start.getDay())
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

const badgeClass = (status) => {
  if (status === '待配送' || status === '缺貨') return 'bg-red-100 text-red-600'
  if (status === '配送中' || status === '已叫貨待補') return 'bg-amber-100 text-amber-600'
  if (status === '已送達' || status === '已到貨') return 'bg-green-100 text-green-600'
  return 'bg-gray-100 text-gray-600'
}

function fmtTime(v) {
  if (!v) return ''
  const d = new Date(v.replace(' ', 'T'))
  if (isNaN(d)) return v
  return d.toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function withStore(storeId) {
  return { headers: { 'X-Store-Id': storeId } }
}

export default function Board() {
  const { user, logout } = useAuth()
  const isStoreAccount = user?.role === 'store'

  // store 角色：身分固定為自己帳號綁定的分店。admin/super_admin（總部）：可自行切換代操分店。
  const [pickedStoreId, setPickedStoreId] = useState(() => localStorage.getItem(STORE_KEY) || '')
  const [stores, setStores] = useState([])
  const [activeTab, setActiveTab] = useState('deliveries')

  useEffect(() => {
    api.get('/stores').then(r => setStores(r.data || [])).catch(() => toast.error('分店清單載入失敗'))
  }, [])

  const storeId = isStoreAccount ? String(user.store_id) : pickedStoreId

  const chooseStore = (id) => {
    setPickedStoreId(String(id))
    localStorage.setItem(STORE_KEY, String(id))
  }

  const currentStoreName = isStoreAccount
    ? (stores.find(s => String(s.id) === storeId)?.name || user.username)
    : (stores.find(s => String(s.id) === String(storeId))?.name || '')

  if (!isStoreAccount && !storeId) {
    return (
      <div className="max-w-sm mx-auto mt-24 px-4">
        <h1 className="text-xl font-bold text-dark mb-1">分店電子佈告欄</h1>
        <p className="text-sm text-gray-500 mb-6">總部人員請選擇要代操的分店</p>
        <div className="space-y-2">
          {stores.map(s => (
            <button key={s.id} onClick={() => chooseStore(s.id)}
              className="w-full text-left border border-gray-200 rounded-sm px-4 py-3 text-sm hover:border-primary hover:text-primary transition-colors">
              {s.name}
            </button>
          ))}
          {stores.length === 0 && <p className="text-sm text-gray-400">載入中...</p>}
        </div>
        <button onClick={logout} className="text-xs text-gray-400 underline mt-6">登出</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-dark">📋 分店電子佈告欄</h1>
        <div className="text-sm text-gray-500">
          目前身分：<span className="font-semibold text-dark">{currentStoreName}</span>
          {!isStoreAccount && (
            <button onClick={() => { setPickedStoreId(''); localStorage.removeItem(STORE_KEY) }}
              className="ml-2 text-primary underline text-xs">切換分店</button>
          )}
          <button onClick={logout} className="ml-2 text-gray-400 underline text-xs">登出</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-gray-500 hover:text-dark'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'deliveries' && <DeliveriesTab storeId={storeId} stores={stores} />}
      {activeTab === 'stock' && <StockTab storeId={storeId} stores={stores} />}
      {activeTab === 'comments' && <CommentsTab storeId={storeId} />}
      {activeTab === 'history' && <HistoryTab stores={stores} />}
    </div>
  )
}

// ================= 配送單（行事曆檢視） =================
const EMPTY_DELIVERY_FORM = { delivery_time: '', location: '', content: '', status: '待配送', customer_name: '', customer_contact: '' }

function DeliveriesTab({ storeId, stores }) {
  const [list, setList] = useState([])
  const [filterStore, setFilterStore] = useState('')
  const [form, setForm] = useState(EMPTY_DELIVERY_FORM)
  const [saving, setSaving] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))

  const load = useCallback(() => {
    api.get('/board/deliveries').then(r => setList(r.data || [])).catch(() => toast.error('載入失敗'))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  const visibleList = filterStore ? list.filter(i => String(i.store_id) === String(filterStore)) : list

  const byDate = visibleList.reduce((acc, item) => {
    const k = (item.delivery_time || '').slice(0, 10)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})

  const submit = async (e) => {
    e.preventDefault()
    if (!form.delivery_time || !form.location) return toast.error('配送時間與地點為必填')
    setSaving(true)
    try {
      await api.post('/board/deliveries', form, withStore(storeId))
      toast.success('已新增配送單')
      setForm(EMPTY_DELIVERY_FORM)
      load()
    } catch (err) { toast.error(err.message || '新增失敗') }
    finally { setSaving(false) }
  }

  const cycleStatus = async (item) => {
    const next = DELIVERY_STATUSES[(DELIVERY_STATUSES.indexOf(item.status) + 1) % DELIVERY_STATUSES.length]
    try {
      await api.put(`/board/deliveries/${item.id}`, { ...item, status: next }, withStore(storeId))
      load()
    } catch (err) { toast.error(err.message || '更新失敗') }
  }

  const remove = async (item) => {
    if (!confirm('確定刪除這筆配送單？')) return
    try {
      await api.delete(`/board/deliveries/${item.id}`, withStore(storeId))
      toast.success('已刪除')
      load()
    } catch (err) { toast.error(err.message || '刪除失敗') }
  }

  const pickDay = (d) => {
    const k = dateKey(d)
    setSelectedDate(k)
    setForm(f => ({ ...f, delivery_time: f.delivery_time ? f.delivery_time : `${k}T09:00` }))
  }

  const today = dateKey(new Date())
  const days = buildMonthGrid(viewMonth)
  const monthLabel = `${viewMonth.getFullYear()} 年 ${viewMonth.getMonth() + 1} 月`
  const dayItems = (byDate[selectedDate] || []).sort((a, b) => a.delivery_time.localeCompare(b.delivery_time))

  return (
    <div>
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">新增配送單（與客人約定的送貨時間）</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">配送時間</label>
            <input type="datetime-local" value={form.delivery_time}
              onChange={e => setForm(f => ({ ...f, delivery_time: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">狀態</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
              {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">地點</label>
          <input value={form.location} placeholder="例如：客戶工地 / 中山店 後門收貨區"
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">客戶名稱</label>
            <input value={form.customer_name} placeholder="例如：王先生"
              onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">客戶聯絡方式</label>
            <input value={form.customer_contact} placeholder="例如：0912-345-678"
              onChange={e => setForm(f => ({ ...f, customer_contact: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">貨物內容</label>
          <textarea value={form.content} rows={2} placeholder="例如：防水塗料 5桶、矽利康 2箱"
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary resize-none" />
        </div>
        <button disabled={saving} className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
          {saving ? '送出中...' : '送出配送單'}
        </button>
      </form>

      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="text-gray-400 hover:text-dark px-1">‹</button>
          <span className="text-sm font-semibold text-dark min-w-[110px] text-center">{monthLabel}</span>
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="text-gray-400 hover:text-dark px-1">›</button>
        </div>
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="border border-gray-200 text-xs px-2 py-1.5 rounded-sm">
          <option value="">全部分店</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* 月曆格狀檢視 */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-sm overflow-hidden text-xs">
        {WEEKDAYS.map(w => (
          <div key={w} className="bg-gray-50 text-center py-1.5 text-gray-500 font-medium">{w}</div>
        ))}
        {days.map((d, idx) => {
          const k = dateKey(d)
          const items = byDate[k] || []
          const inMonth = d.getMonth() === viewMonth.getMonth()
          return (
            <div key={idx} onClick={() => pickDay(d)}
              className={`bg-white min-h-[64px] p-1 cursor-pointer hover:bg-gray-50 ${k === selectedDate ? 'ring-2 ring-inset ring-primary' : ''}`}>
              <div className={`text-[11px] mb-1 ${inMonth ? (k === today ? 'text-primary font-bold' : 'text-gray-600') : 'text-gray-300'}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 2).map(it => (
                  <div key={it.id} className="truncate text-white rounded-sm px-1 py-0.5 text-[10px]"
                    style={{ background: storeColor(it.store_id) }}>
                    {it.delivery_time.slice(11, 16)} {it.store_name}
                  </div>
                ))}
                {items.length > 2 && <div className="text-[10px] text-gray-400">+{items.length - 2} 筆</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* 分店顏色圖例 */}
      <div className="flex flex-wrap gap-3 mt-3 mb-6">
        {stores.map(s => (
          <span key={s.id} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: storeColor(s.id) }} />
            {s.name}
          </span>
        ))}
      </div>

      {/* 選定日期明細 */}
      <h2 className="text-sm font-semibold text-dark mb-3">{selectedDate} 配送明細</h2>
      <div className="space-y-3">
        {dayItems.length === 0 && <div className="text-center text-gray-400 text-sm py-10">這天尚無配送安排</div>}
        {dayItems.map(item => (
          <div key={item.id} className="border border-gray-200 rounded-sm p-4"
            style={{ borderLeft: `4px solid ${storeColor(item.store_id)}` }}>
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span className="text-sm font-semibold text-dark">{item.store_name}</span>
              <span className="text-xs text-gray-400">{fmtTime(item.delivery_time)}</span>
            </div>
            <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass(item.status)}`}>{item.status}</span>
            <p className="text-sm text-dark mt-2 whitespace-pre-wrap">📍 {item.location}{item.content ? `\n${item.content}` : ''}</p>
            {(item.customer_name || item.customer_contact) && (
              <p className="text-xs text-gray-500 mt-1">👤 {item.customer_name}{item.customer_contact ? `｜${item.customer_contact}` : ''}</p>
            )}
            {String(item.store_id) === String(storeId) && (
              <div className="flex gap-4 mt-2">
                <button onClick={() => cycleStatus(item)} className="text-xs text-gray-500 underline">切換狀態</button>
                <button onClick={() => remove(item)} className="text-xs text-red-500 underline">刪除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= 缺訂貨狀態 =================
function StockTab({ storeId, stores }) {
  const [list, setList] = useState([])
  const [filterStore, setFilterStore] = useState('')
  const [form, setForm] = useState({ item_name: '', status: '缺貨', note: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    const params = filterStore ? { store: filterStore } : {}
    api.get('/board/stock', { params }).then(r => setList(r.data || [])).catch(() => toast.error('載入失敗'))
  }, [filterStore])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.item_name) return toast.error('品項為必填')
    setSaving(true)
    try {
      await api.post('/board/stock', form, withStore(storeId))
      toast.success('已送出')
      setForm({ item_name: '', status: '缺貨', note: '' })
      load()
    } catch (err) { toast.error(err.message || '新增失敗') }
    finally { setSaving(false) }
  }

  const cycleStatus = async (item) => {
    const next = STOCK_STATUSES[(STOCK_STATUSES.indexOf(item.status) + 1) % STOCK_STATUSES.length]
    try {
      await api.put(`/board/stock/${item.id}`, { ...item, status: next }, withStore(storeId))
      load()
    } catch (err) { toast.error(err.message || '更新失敗') }
  }

  const remove = async (item) => {
    if (!confirm('確定刪除這筆缺訂貨紀錄？')) return
    try {
      await api.delete(`/board/stock/${item.id}`, withStore(storeId))
      toast.success('已刪除')
      load()
    } catch (err) { toast.error(err.message || '刪除失敗') }
  }

  return (
    <div>
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">標示缺訂貨狀態</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">品項</label>
          <input value={form.item_name} placeholder="例如：矽利康 白色 300ml"
            onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">狀態</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
            {STOCK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">備註</label>
          <input value={form.note} placeholder="例如：預計明日到貨 / 可向A店借調"
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
        </div>
        <button disabled={saving} className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
          {saving ? '送出中...' : '送出'}
        </button>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark">缺訂貨狀態列表</h2>
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="border border-gray-200 text-xs px-2 py-1.5 rounded-sm">
          <option value="">全部分店</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {list.length === 0 && <div className="text-center text-gray-400 text-sm py-10">尚無缺訂貨資料</div>}
        {list.map(item => (
          <div key={item.id} className={`border rounded-sm p-4 ${String(item.store_id) === String(storeId) ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span className="text-sm font-semibold text-dark">{item.store_name}</span>
              <span className="text-xs text-gray-400">更新：{fmtTime(item.updated_at)}</span>
            </div>
            <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass(item.status)}`}>{item.status}</span>
            <p className="text-sm text-dark mt-2">🧾 {item.item_name}</p>
            {item.note && <p className="text-xs text-gray-500 mt-1">備註：{item.note}</p>}
            {String(item.store_id) === String(storeId) && (
              <div className="flex gap-4 mt-2">
                <button onClick={() => cycleStatus(item)} className="text-xs text-gray-500 underline">切換狀態</button>
                <button onClick={() => remove(item)} className="text-xs text-red-500 underline">刪除</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= 留言板 =================
function CommentsTab({ storeId }) {
  const [list, setList] = useState([])
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    api.get('/board/comments').then(r => setList(r.data || [])).catch(() => toast.error('載入失敗'))
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [load])

  const submit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return toast.error('留言內容不可為空')
    setSaving(true)
    try {
      await api.post('/board/comments', { message }, withStore(storeId))
      setMessage('')
      load()
    } catch (err) { toast.error(err.message || '送出失敗') }
    finally { setSaving(false) }
  }

  const remove = async (item) => {
    if (!confirm('確定刪除這則留言？')) return
    try {
      await api.delete(`/board/comments/${item.id}`, withStore(storeId))
      load()
    } catch (err) { toast.error(err.message || '刪除失敗') }
  }

  return (
    <div>
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">留言 / 備註</h2>
        <textarea value={message} rows={3} placeholder="例如：中山店庫存充足，可協助A店調貨"
          onChange={e => setMessage(e.target.value)}
          className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary resize-none" />
        <button disabled={saving} className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
          {saving ? '送出中...' : '送出留言'}
        </button>
      </form>

      <h2 className="text-sm font-semibold text-dark mb-3">留言列表</h2>
      <div className="space-y-3">
        {list.length === 0 && <div className="text-center text-gray-400 text-sm py-10">尚無留言</div>}
        {list.map(item => (
          <div key={item.id} className={`border rounded-sm p-4 ${String(item.store_id) === String(storeId) ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span className="text-sm font-semibold text-dark">{item.store_name}</span>
              <span className="text-xs text-gray-400">{fmtTime(item.created_at)}</span>
            </div>
            <p className="text-sm text-dark mt-2 whitespace-pre-wrap">{item.message}</p>
            {String(item.store_id) === String(storeId) && (
              <button onClick={() => remove(item)} className="text-xs text-red-500 underline mt-2">刪除</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= 歷史紀錄查詢 =================
function HistoryTab({ stores }) {
  const [store, setStore] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [merged, setMerged] = useState(null)

  const search = async () => {
    const params = {}
    if (store) params.store = store
    if (from) params.from = `${from} 00:00:00`
    if (to) params.to = `${to} 23:59:59`

    try {
      const [deliveries, stock, comments] = await Promise.all([
        api.get('/board/deliveries', { params }),
        api.get('/board/stock', { params }),
        api.get('/board/comments', { params })
      ])
      const rows = [
        ...(deliveries.data || []).map(i => ({ type: '配送單', color: 'bg-blue-500', time: i.delivery_time, store: i.store_name,
          text: `📍 ${i.location} — ${i.status}${(i.customer_name || i.customer_contact) ? `\n👤 ${i.customer_name}${i.customer_contact ? '｜' + i.customer_contact : ''}` : ''}${i.content ? '\n' + i.content : ''}` })),
        ...(stock.data || []).map(i => ({ type: '缺訂貨', color: 'bg-amber-500', time: i.updated_at, store: i.store_name,
          text: `🧾 ${i.item_name} — ${i.status}${i.note ? '\n備註：' + i.note : ''}` })),
        ...(comments.data || []).map(i => ({ type: '留言', color: 'bg-green-500', time: i.created_at, store: i.store_name,
          text: i.message }))
      ].sort((a, b) => new Date(b.time.replace(' ', 'T')) - new Date(a.time.replace(' ', 'T')))
      setMerged(rows)
    } catch (err) { toast.error(err.message || '查詢失敗') }
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-sm p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">查詢條件</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">分店</label>
            <select value={store} onChange={e => setStore(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm">
              <option value="">全部分店</option>
              {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">起始日期</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">結束日期</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm" />
          </div>
        </div>
        <button onClick={search} className="btn-primary text-sm py-2 px-6">查詢</button>
      </div>

      <div className="space-y-3">
        {merged === null && <div className="text-center text-gray-400 text-sm py-10">請設定條件後查詢</div>}
        {merged && merged.length === 0 && <div className="text-center text-gray-400 text-sm py-10">查無符合條件的紀錄</div>}
        {merged && merged.map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-sm p-4">
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span>
                <span className={`text-white text-[11px] px-2 py-0.5 rounded mr-2 ${item.color}`}>{item.type}</span>
                <span className="text-sm font-semibold text-dark">{item.store}</span>
              </span>
              <span className="text-xs text-gray-400">{fmtTime(item.time)}</span>
            </div>
            <p className="text-sm text-dark mt-2 whitespace-pre-wrap">{item.text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
