import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const STORE_KEY = 'board_store_id'
const NOTIFY_KEY = 'board_notify_enabled'
const TABS = [
  { key: 'today', label: '🚚 今日配送總覽' },
  { key: 'deliveries', label: '📅 配送單管理' },
  { key: 'stock', label: '📦 缺訂貨狀態' },
  { key: 'comments', label: '💬 留言板' },
  { key: 'history', label: '🕘 歷史紀錄查詢' }
]

const DELIVERY_STATUSES = ['待配送', '配送中', '已送達']
const DELIVERY_PERIODS = [
  { key: 'morning', label: '早上 08:00–12:00', short: '早', time: '08:00' },
  { key: 'afternoon', label: '下午 13:30–16:00', short: '午', time: '13:30' }
]
const MAX_PER_SLOT = 2
function periodOfTime(hhmm) {
  // 08:00~11:59 視為早上，其餘（含舊資料的自由時間）視為下午
  return hhmm < '12:30' ? 'morning' : 'afternoon'
}
function periodOfDeliveryTime(dt) {
  return periodOfTime((dt || '').slice(11, 16))
}
function periodInfo(key) {
  return DELIVERY_PERIODS.find(p => p.key === key) || DELIVERY_PERIODS[0]
}
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

// 後端的 to 是用字串比較（delivery_time >= from AND delivery_time <= to），
// delivery_time 實際存的是「日期T時間」，如果 to 只給日期（沒有時間），字串比較會比單純日期字串大，
// 導致當天的資料整批被濾掉。查詢某天結尾時要補上當天最後一刻。
function endOfDay(dateStr) {
  return `${dateStr}T23:59:59`
}

// 定時重新拉取最新資料：分頁在背景（切走分頁/螢幕鎖住）時暫停，省流量與電力；
// 回到前景時立刻拉一次最新資料，再繼續照間隔輪詢。
function usePollingRefresh(load, intervalMs = 10000) {
  useEffect(() => { load() }, [load])
  useEffect(() => {
    let timer = null
    const start = () => { if (!timer) timer = setInterval(load, intervalMs) }
    const stop = () => { if (timer) clearInterval(timer); timer = null }
    const onVisibilityChange = () => {
      if (document.hidden) { stop() } else { load(); start() }
    }
    if (!document.hidden) start()
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [load, intervalMs])
}

// 用 Web Audio 產生一個簡短提示音，不需要額外音檔
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
  } catch (e) { /* 瀏覽器不支援音效就略過 */ }
}

// 新資料桌面通知開關（需使用者主動授權瀏覽器通知權限）
function useBoardNotifications() {
  const [enabled, setEnabled] = useState(() =>
    localStorage.getItem(NOTIFY_KEY) === '1' && typeof Notification !== 'undefined' && Notification.permission === 'granted'
  )

  const enableNotifications = async () => {
    if (typeof Notification === 'undefined') return toast.error('這個瀏覽器不支援桌面通知')
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      localStorage.setItem(NOTIFY_KEY, '1')
      setEnabled(true)
      toast.success('已開啟新資料提醒（音效＋桌面通知）')
    } else {
      toast.error('未取得通知權限')
    }
  }

  const disableNotifications = () => {
    localStorage.setItem(NOTIFY_KEY, '0')
    setEnabled(false)
  }

  return { enabled, enableNotifications, disableNotifications }
}

// 背景偵測配送單／缺訂貨／留言板是否有新資料（不論目前停在哪個分頁都會提醒），
// 只有在使用者開啟提醒時才會實際輪詢與發出通知。
function useCrossBoardAlerts(enabled) {
  const seen = useRef({ deliveries: null, stock: null, comments: null })

  useEffect(() => {
    if (!enabled) seen.current = { deliveries: null, stock: null, comments: null }
  }, [enabled])

  const diffAndAlert = (key, items, title, msgFn) => {
    const ids = new Set(items.map(i => i.id))
    const prev = seen.current[key]
    seen.current[key] = ids
    if (prev === null) return // 第一次載入不通知，避免一開啟就跳一堆舊資料
    const newItems = items.filter(i => !prev.has(i.id))
    if (newItems.length === 0) return
    playBeep()
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const body = newItems.length === 1 ? msgFn(newItems[0]) : `有 ${newItems.length} 筆新資料`
      try { new Notification(title, { body }) } catch (e) { /* 忽略通知顯示失敗 */ }
    }
  }

  const check = useCallback(() => {
    if (!enabled) return
    Promise.all([
      api.get('/board/deliveries'),
      api.get('/board/stock'),
      api.get('/board/comments')
    ]).then(([d, s, c]) => {
      diffAndAlert('deliveries', d.data || [], '🚚 新配送單', it => `${it.store_name}・${it.location}`)
      diffAndAlert('stock', s.data || [], '⚠️ 缺訂貨狀態更新', it => `${it.store_name}・${it.item_name}（${it.status}）`)
      diffAndAlert('comments', c.data || [], '💬 新留言', it => `${it.store_name}：${it.message}`)
    }).catch(() => { /* 背景檢查失敗不影響主要功能 */ })
  }, [enabled])

  usePollingRefresh(check, 15000)
}

export default function Board() {
  const { user, logout } = useAuth()
  const isStoreAccount = user?.role === 'store'
  const isRealDriver = user?.role === 'driver'
  const isRealSuperAdmin = user?.role === 'super_admin'

  // store 角色：身分固定為自己帳號綁定的分店。admin/super_admin（總部）：可自行切換代操分店。
  // driver（司機）不綁定分店，不需要選店，也不會有 storeId。
  const [pickedStoreId, setPickedStoreId] = useState(() => localStorage.getItem(STORE_KEY) || '')
  const [stores, setStores] = useState([])
  const [activeTab, setActiveTab] = useState('today')
  const { enabled: notifyEnabled, enableNotifications, disableNotifications } = useBoardNotifications()
  useCrossBoardAlerts(notifyEnabled)

  // 超級管理員專用：「身分預覽」模式，可以完整模擬和平/板橋/樹林/司機實際會看到的畫面
  // （不套用超級管理員的萬用權限），方便上線前確認各分店看到的內容是否正確。
  // previewIdentity 為 null 表示沒有在預覽，是平常代操分店的模式（保留原本的萬用權限）。
  const [previewIdentity, setPreviewIdentity] = useState(null) // null | { type: 'store', id } | { type: 'driver' }
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false)
  const previewing = isRealSuperAdmin && !!previewIdentity

  const isDriver = isRealDriver || (previewing && previewIdentity.type === 'driver')

  useEffect(() => {
    api.get('/stores').then(r => setStores(r.data || [])).catch(() => toast.error('分店清單載入失敗'))
  }, [])

  const rawStoreId = isStoreAccount ? String(user.store_id) : (isRealDriver ? '' : pickedStoreId)
  const storeId = previewing
    ? (previewIdentity.type === 'driver' ? '' : String(previewIdentity.id))
    : rawStoreId

  // 所有配送都由和平店（總店）統一控制司機排程，只有和平店帳號、司機帳號、或超級管理員能切換配送狀態；
  // 預覽模式底下不套用「超級管理員一律可以」這條，才能如實模擬被預覽的分店實際看得到什麼。
  const controlStoreId = stores.find(s => s.name === '和平店')?.id
  const canChangeDeliveryStatus = previewing
    ? (isDriver || (!!controlStoreId && String(storeId) === String(controlStoreId)))
    : (isRealSuperAdmin || isRealDriver || (!!controlStoreId && String(storeId) === String(controlStoreId)))

  // 預覽模式下也不給超級管理員的「可編輯/刪除任何一筆」萬用權限，才能如實模擬
  const isSuperAdminPowers = isRealSuperAdmin && !previewing

  const chooseStore = (id) => {
    setPickedStoreId(String(id))
    localStorage.setItem(STORE_KEY, String(id))
  }

  const currentStoreName = previewing
    ? `🔍 預覽中：${previewIdentity.type === 'driver' ? '司機' : storeName(stores, previewIdentity.id)}`
    : isStoreAccount
      ? (stores.find(s => String(s.id) === storeId)?.name || user.username)
      : isRealDriver
        ? `🚚 ${user.username}（司機）`
        : (stores.find(s => String(s.id) === String(storeId))?.name || '')

  const visibleTabs = isDriver
    ? TABS.filter(t => t.key !== 'stock' && t.key !== 'comments')
    : (isRealSuperAdmin && !previewing ? [...TABS, { key: 'holidays', label: '⚙️ 假日設定' }] : TABS)

  if (!isStoreAccount && !isRealDriver && !previewing && !storeId) {
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
        {isRealSuperAdmin && stores.length > 0 && (
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">或直接以「身分預覽」檢視各分店/司機實際看到的畫面：</p>
            <div className="flex flex-wrap gap-2">
              {stores.map(s => (
                <button key={s.id} onClick={() => setPreviewIdentity({ type: 'store', id: s.id })}
                  className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-500 hover:border-primary hover:text-primary transition-colors">
                  🔍 {s.name}
                </button>
              ))}
              <button onClick={() => setPreviewIdentity({ type: 'driver' })}
                className="text-xs border border-gray-200 rounded-full px-3 py-1.5 text-gray-500 hover:border-primary hover:text-primary transition-colors">
                🔍 🚚 司機
              </button>
            </div>
          </div>
        )}
        <button onClick={logout} className="text-xs text-gray-400 underline mt-6">登出</button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {previewing && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded-sm px-4 py-2.5 mb-4 flex items-center justify-between flex-wrap gap-2">
          <span>🔍 目前是「身分預覽」模式，畫面會如實模擬 <b>{previewIdentity.type === 'driver' ? '司機' : storeName(stores, previewIdentity.id)}</b> 實際登入看到的內容（不套用超級管理員的萬用權限）。</span>
          <button onClick={() => setPreviewIdentity(null)} className="text-amber-800 underline font-medium shrink-0">結束預覽</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-dark">📋 分店電子佈告欄</h1>
        <div className="flex items-center flex-wrap gap-x-1 gap-y-1 text-sm text-gray-500">
          <span>目前身分：<span className="font-semibold text-dark">{currentStoreName}</span></span>
          <button onClick={() => (notifyEnabled ? disableNotifications() : enableNotifications())}
            title="開啟後，新增配送單/缺貨狀態/留言時會有音效與桌面通知提醒"
            className={`ml-2 underline text-xs py-1.5 px-0.5 ${notifyEnabled ? 'text-primary' : 'text-gray-400'}`}>
            {notifyEnabled ? '🔔 新資料提醒已開啟' : '🔕 開啟新資料提醒'}
          </button>
          {!isStoreAccount && !isRealDriver && !previewing && (
            <button onClick={() => { setPickedStoreId(''); localStorage.removeItem(STORE_KEY) }}
              className="ml-2 text-primary underline text-xs py-1.5 px-0.5">切換分店</button>
          )}
          {isRealSuperAdmin && !previewing && (
            <span className="relative ml-2">
              <button onClick={() => setPreviewMenuOpen(o => !o)} className="text-primary underline text-xs py-1.5 px-0.5">🔍 身分預覽</button>
              {previewMenuOpen && (
                <span className="absolute right-0 top-full bg-white border border-gray-200 rounded-sm shadow-lg py-1 z-10 min-w-[160px]">
                  {stores.map(s => (
                    <button key={s.id} onClick={() => { setPreviewIdentity({ type: 'store', id: s.id }); setPreviewMenuOpen(false) }}
                      className="block w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-primary whitespace-nowrap">
                      {s.name}
                    </button>
                  ))}
                  <button onClick={() => { setPreviewIdentity({ type: 'driver' }); setPreviewMenuOpen(false) }}
                    className="block w-full text-left px-4 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-primary whitespace-nowrap">
                    🚚 司機
                  </button>
                </span>
              )}
            </span>
          )}
          <button onClick={logout} className="ml-2 text-gray-400 underline text-xs py-1.5 px-0.5">登出</button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {visibleTabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              activeTab === t.key ? 'border-primary text-primary font-medium' : 'border-transparent text-gray-500 hover:text-dark'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'today' && <TodayOverviewTab stores={stores} storeId={storeId} canChangeStatus={canChangeDeliveryStatus} />}
      {activeTab === 'deliveries' && <DeliveriesTab storeId={storeId} stores={stores} canChangeStatus={canChangeDeliveryStatus} isSuperAdmin={isSuperAdminPowers} />}
      {activeTab === 'stock' && <StockTab storeId={storeId} stores={stores} />}
      {activeTab === 'comments' && <CommentsTab storeId={storeId} />}
      {activeTab === 'history' && <HistoryTab stores={stores} />}
      {activeTab === 'holidays' && isRealSuperAdmin && !previewing && <HolidaysTab />}
    </div>
  )
}

// ================= 今日配送總覽（給司機看的整合路線表，合併全分店、依時段/時間排序） =================
function TodayOverviewTab({ stores, storeId, canChangeStatus }) {
  const [date, setDate] = useState(() => dateKey(new Date()))
  const [list, setList] = useState([])

  const load = useCallback(() => {
    api.get('/board/deliveries', { params: { from: date, to: endOfDay(date) } })
      .then(r => setList(r.data || []))
      .catch(() => toast.error('載入失敗'))
  }, [date])

  usePollingRefresh(load)

  // 這頁是給司機看的整合路線表，切換狀態不分是哪家店的單（司機/和平店/超級管理員才看得到按鈕）
  const cycleStatus = async (item) => {
    const next = DELIVERY_STATUSES[(DELIVERY_STATUSES.indexOf(item.status) + 1) % DELIVERY_STATUSES.length]
    if (!confirm(`確定要將狀態從「${item.status}」改成「${next}」嗎？`)) return
    try {
      await api.put(`/board/deliveries/${item.id}`, { ...item, status: next }, withStore(storeId))
      load()
    } catch (err) { toast.error(err.message || '更新失敗') }
  }

  // 預設依「排序值→建立順序」排；排序值都還沒調整過時剛好等同建立順序，使用者可以再用上下箭頭手動調整司機路線
  const sorted = [...list].sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id))
  const byPeriod = DELIVERY_PERIODS.reduce((acc, p) => {
    acc[p.key] = sorted.filter(it => periodOfDeliveryTime(it.delivery_time) === p.key)
    return acc
  }, {})

  // 全公司共用一位司機，順序是跨分店的（不分是哪家店的單），上下移動會把同時段的整批新順序送到後端存起來
  const moveItem = async (periodKey, index, direction) => {
    const items = byPeriod[periodKey]
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const reordered = [...items]
    ;[reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]]
    const ids = reordered.map(it => it.id)
    const idToOrder = new Map(ids.map((id, i) => [id, i]))
    setList(prev => prev.map(it => idToOrder.has(it.id) ? { ...it, sort_order: idToOrder.get(it.id) } : it))
    try {
      await api.put('/board/deliveries/reorder', { ids })
    } catch (err) {
      toast.error('排序更新失敗，重新整理後可能會還原')
      load()
    }
  }

  const shiftDate = (days) => {
    const d = new Date(`${date}T00:00:00`)
    d.setDate(d.getDate() + days)
    setDate(dateKey(d))
  }

  const isToday = date === dateKey(new Date())

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDate(-1)} className="text-gray-400 hover:text-dark text-lg px-2 py-1">‹</button>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="border border-gray-200 text-sm px-3 py-2 rounded-sm" />
          <button onClick={() => shiftDate(1)} className="text-gray-400 hover:text-dark text-lg px-2 py-1">›</button>
          {!isToday && (
            <button onClick={() => setDate(dateKey(new Date()))} className="text-xs text-primary underline py-1 px-0.5">回今天</button>
          )}
        </div>
        <span className="text-xs text-gray-400">司機整合路線表・全分店合計 {sorted.length} 筆・可用▲▼調整跑單順序</span>
      </div>

      {DELIVERY_PERIODS.map(p => (
        <div key={p.key} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold text-dark">{p.label}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${byPeriod[p.key].length >= MAX_PER_SLOT ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
              {byPeriod[p.key].length} 筆{byPeriod[p.key].length >= MAX_PER_SLOT ? '（已達司機上限）' : ''}
            </span>
          </div>
          {byPeriod[p.key].length === 0 ? (
            <p className="text-xs text-gray-400 pl-1">這個時段尚無配送</p>
          ) : (
            <div className="space-y-2">
              {byPeriod[p.key].map((item, idx) => (
                <div key={item.id} className="border border-gray-200 rounded-sm p-3 flex gap-2"
                  style={{ borderLeft: `4px solid ${storeColor(item.store_id)}` }}>
                  {byPeriod[p.key].length > 1 && (
                    <div className="flex flex-col justify-center gap-0.5 shrink-0">
                      <button onClick={() => moveItem(p.key, idx, -1)} disabled={idx === 0}
                        title="往前移" className="text-gray-400 hover:text-dark disabled:opacity-20 disabled:hover:text-gray-400 px-1.5 py-1 leading-none">▲</button>
                      <span className="text-[10px] text-gray-300 text-center">{idx + 1}</span>
                      <button onClick={() => moveItem(p.key, idx, 1)} disabled={idx === byPeriod[p.key].length - 1}
                        title="往後移" className="text-gray-400 hover:text-dark disabled:opacity-20 disabled:hover:text-gray-400 px-1.5 py-1 leading-none">▼</button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline flex-wrap gap-1">
                      <span className="text-xs text-gray-400">{item.store_name}{item.created_by && <span>・上傳者 {item.created_by}</span>}</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass(item.status)}`}>{item.status}</span>
                    </div>
                    {item.delivery_type === '分店調撥' ? (
                      <>
                        <p className="text-sm text-dark mt-1">🔄 {transferTargetLabel(item, stores)}</p>
                        {item.transfer_item && <p className="text-xs text-gray-500 mt-0.5">📦 {item.transfer_item}</p>}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-dark mt-1">
                          📍 {item.location}
                          {item.location && (
                            <a href={mapLink(item.location)} target="_blank" rel="noopener noreferrer"
                              className="ml-2 text-xs text-primary underline whitespace-nowrap">在地圖開啟</a>
                          )}
                        </p>
                        {(item.customer_name || item.customer_contact) && (
                          <p className="text-xs text-gray-500 mt-0.5">👤 {item.customer_name}{item.customer_contact ? `｜${item.customer_contact}` : ''}</p>
                        )}
                        {item.content && <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">{item.content}</p>}
                      </>
                    )}
                    {canChangeStatus && (
                      <button onClick={() => cycleStatus(item)} className="text-xs text-gray-500 underline mt-1.5 py-1.5 px-0.5">切換狀態</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// 地址開地圖：直接組 Google Maps 搜尋連結，不用申請地圖API金鑰、不用把地址轉經緯度，
// 司機點了就會跳轉到 Google Maps App／網頁幫忙導航，免費、不會有額外的用量費用問題。
function mapLink(address) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

// ================= 配送單（行事曆檢視） =================
const DELIVERY_TYPES = ['客人配送', '分店調撥']
const EMPTY_DELIVERY_FORM = { delivery_date: '', period: 'morning', delivery_type: '客人配送', location: '', content: '', status: '待配送', customer_name: '', customer_contact: '', transfer_from: '', transfer_to: '', transfer_item: '' }
function storeName(stores, id) {
  return stores.find(s => String(s.id) === String(id))?.name || ''
}
// 調撥起點/終點：新資料直接存文字（transfer_from / transfer_to），可以是分店或泰山倉/富友倉這類非分店倉庫；
// 舊資料（改版前建立的）沒有 transfer_from，退回用建立這筆資料的分店（store_name）當作起點；
// 更早以前的資料連 transfer_to 都沒有，退回用 transfer_to_store_id 查分店名稱顯示
function transferTargetLabel(item, stores) {
  const from = item.transfer_from || item.store_name || ''
  const to = item.transfer_to || storeName(stores, item.transfer_to_store_id) || '（未指定）'
  return from ? `${from} → ${to}` : to
}

function DeliveriesTab({ storeId, stores, canChangeStatus, isSuperAdmin }) {
  const [list, setList] = useState([])
  const [filterStore, setFilterStore] = useState('')
  const [form, setForm] = useState(EMPTY_DELIVERY_FORM)
  // 調撥目標清單：分店 + 倉庫（例如泰山倉、富友倉），跟後端驗證用同一份名單
  const [transferTargets, setTransferTargets] = useState([])
  useEffect(() => {
    api.get('/board/transfer-targets').then(r => setTransferTargets(r.data || [])).catch(() => toast.error('調撥目標清單載入失敗'))
  }, [])
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()))
  const formRef = useRef(null)

  // 月曆只顯示某個月份（含前後補齊的格子），依區間向後端查詢，避免每次輪詢都抓全部歷史配送單
  const load = useCallback(() => {
    const days = buildMonthGrid(viewMonth)
    const from = dateKey(days[0])
    const to = endOfDay(dateKey(days[days.length - 1]))
    api.get('/board/deliveries', { params: { from, to } }).then(r => setList(r.data || [])).catch(() => toast.error('載入失敗'))
  }, [viewMonth])

  usePollingRefresh(load)

  const visibleList = filterStore ? list.filter(i => String(i.store_id) === String(filterStore)) : list

  const byDate = visibleList.reduce((acc, item) => {
    const k = (item.delivery_time || '').slice(0, 10)
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})

  // 全公司只有一位配送司機，同一天、同一時段的配送量是全分店共用的額度（編輯時不算自己這筆）。
  // 月曆現在只載入當月資料，所以額度改成即時向後端查詢，不管使用者選的日期是不是在目前這個月都能算對。
  const [slotCount, setSlotCount] = useState(0)

  useEffect(() => {
    if (!form.delivery_date) { setSlotCount(0); return }
    let cancelled = false
    api.get('/board/deliveries/slot-count', { params: { date: form.delivery_date, period: form.period, exclude: editingId || '' } })
      .then(r => { if (!cancelled) setSlotCount(r.count || 0) })
      .catch(() => { /* 查詢失敗就不顯示警告，送出時仍會再檢查一次 */ })
    return () => { cancelled = true }
  }, [form.delivery_date, form.period, editingId])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.delivery_date) return toast.error('配送日期為必填')
    if (form.delivery_type === '分店調撥') {
      if (!form.transfer_from) return toast.error('請選擇調撥起點')
      if (!form.transfer_to) return toast.error('請選擇調撥終點')
      if (form.transfer_from === form.transfer_to) return toast.error('調撥起點與終點不能相同')
    } else if (!form.location) {
      return toast.error('配送地點為必填')
    }
    let existing = slotCount
    try {
      const r = await api.get('/board/deliveries/slot-count', { params: { date: form.delivery_date, period: form.period, exclude: editingId || '' } })
      existing = r.count || 0
    } catch (e) { /* 查詢失敗就用畫面上目前顯示的數字 */ }
    if (existing >= MAX_PER_SLOT) {
      const p = periodInfo(form.period)
      if (!confirm(`⚠️ 全公司只有一位配送司機，${form.delivery_date}「${p.label}」時段全分店合計已有 ${existing} 筆配送，確定仍要新增嗎？`)) return
    }
    setSaving(true)
    try {
      const payload = form.delivery_type === '分店調撥'
        ? {
            delivery_time: `${form.delivery_date}T${periodInfo(form.period).time}`,
            status: form.status,
            delivery_type: '分店調撥',
            transfer_from: form.transfer_from,
            transfer_to: form.transfer_to,
            transfer_item: form.transfer_item.trim()
          }
        : {
            delivery_time: `${form.delivery_date}T${periodInfo(form.period).time}`,
            location: form.location,
            content: form.content,
            status: form.status,
            customer_name: form.customer_name,
            customer_contact: form.customer_contact,
            delivery_type: '客人配送'
          }
      if (editingId) {
        await api.put(`/board/deliveries/${editingId}`, payload, withStore(storeId))
        toast.success('已更新配送單')
      } else {
        await api.post('/board/deliveries', payload, withStore(storeId))
        toast.success('已新增配送單')
      }
      setForm(EMPTY_DELIVERY_FORM)
      setEditingId(null)
      load()
    } catch (err) { toast.error(err.message || '儲存失敗') }
    finally { setSaving(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setForm({
      delivery_date: (item.delivery_time || '').slice(0, 10),
      period: periodOfDeliveryTime(item.delivery_time),
      delivery_type: item.delivery_type === '分店調撥' ? '分店調撥' : '客人配送',
      location: item.location || '',
      content: item.content || '',
      status: item.status,
      customer_name: item.customer_name || '',
      customer_contact: item.customer_contact || '',
      transfer_from: item.transfer_from || '',
      transfer_to: item.transfer_to || storeName(stores, item.transfer_to_store_id) || '',
      transfer_item: item.transfer_item || ''
    })
    // 表單在頁面下方，點編輯後如果沒捲過去，使用者會以為按了沒反應
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_DELIVERY_FORM)
  }

  const cycleStatus = async (item) => {
    const next = DELIVERY_STATUSES[(DELIVERY_STATUSES.indexOf(item.status) + 1) % DELIVERY_STATUSES.length]
    if (!confirm(`確定要將狀態從「${item.status}」改成「${next}」嗎？`)) return
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
      if (editingId === item.id) cancelEdit()
      load()
    } catch (err) { toast.error(err.message || '刪除失敗') }
  }

  const pickDay = (d) => {
    const k = dateKey(d)
    setSelectedDate(k)
    if (!editingId) setForm(f => ({ ...f, delivery_date: f.delivery_date || k }))
  }

  const today = dateKey(new Date())
  const days = buildMonthGrid(viewMonth)
  const monthLabel = `${viewMonth.getFullYear()} 年 ${viewMonth.getMonth() + 1} 月`
  const dayItems = (byDate[selectedDate] || []).sort((a, b) => a.delivery_time.localeCompare(b.delivery_time))

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className="text-gray-400 hover:text-dark text-lg px-2 py-1">‹</button>
          <span className="text-sm font-semibold text-dark min-w-[110px] text-center">{monthLabel}</span>
          <button onClick={() => setViewMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className="text-gray-400 hover:text-dark text-lg px-2 py-1">›</button>
        </div>
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="border border-gray-200 text-xs px-2 py-2 rounded-sm">
          <option value="">全部分店</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* 月曆格狀檢視（週六日不配送，反灰標示） */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-sm overflow-hidden text-xs">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`text-center py-1.5 font-medium ${(i === 0 || i === 6) ? 'bg-gray-200 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>{w}</div>
        ))}
        {days.map((d, idx) => {
          const k = dateKey(d)
          const items = byDate[k] || []
          const inMonth = d.getMonth() === viewMonth.getMonth()
          const isWeekend = d.getDay() === 0 || d.getDay() === 6
          return (
            <div key={idx} onClick={() => pickDay(d)}
              className={`min-h-[64px] p-1 cursor-pointer ${isWeekend ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white hover:bg-gray-50'} ${k === selectedDate ? 'ring-2 ring-inset ring-primary' : ''}`}>
              <div className={`text-[11px] mb-1 ${!inMonth ? 'text-gray-300' : isWeekend ? 'text-gray-400' : (k === today ? 'text-primary font-bold' : 'text-gray-600')}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 2).map(it => (
                  <div key={it.id} className="truncate text-white rounded-sm px-1 py-0.5 text-[10px]"
                    style={{ background: storeColor(it.store_id) }}>
                    {periodInfo(periodOfDeliveryTime(it.delivery_time)).short} {it.delivery_type === '分店調撥' ? '🔄' : ''}{it.store_name}
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
              <span className="text-xs text-gray-400">{item.store_name}{item.created_by && <span>・上傳者 {item.created_by}</span>}</span>
              <span className="text-xs text-gray-400">{item.delivery_time.slice(0, 10)}・{periodInfo(periodOfDeliveryTime(item.delivery_time)).label}</span>
            </div>
            <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass(item.status)}`}>{item.status}</span>
            {item.delivery_type === '分店調撥' ? (
              <>
                <p className="text-sm text-dark mt-2">🔄 {transferTargetLabel(item, stores)}</p>
                {item.transfer_item && <p className="text-xs text-gray-500 mt-1">📦 {item.transfer_item}</p>}
              </>
            ) : (
              <>
                <p className="text-sm text-dark mt-2 whitespace-pre-wrap">
                  📍 {item.location}{item.content ? `\n${item.content}` : ''}
                  {item.location && (
                    <a href={mapLink(item.location)} target="_blank" rel="noopener noreferrer"
                      className="ml-2 text-xs text-primary underline whitespace-nowrap">在地圖開啟</a>
                  )}
                </p>
                {(item.customer_name || item.customer_contact) && (
                  <p className="text-xs text-gray-500 mt-1">👤 {item.customer_name}{item.customer_contact ? `｜${item.customer_contact}` : ''}</p>
                )}
              </>
            )}
            {(canChangeStatus || isSuperAdmin || String(item.store_id) === String(storeId)) && (
              <div className="flex gap-4 mt-2">
                {canChangeStatus && (
                  <button onClick={() => cycleStatus(item)} className="text-xs text-gray-500 underline py-1.5 px-0.5">切換狀態</button>
                )}
                {(isSuperAdmin || String(item.store_id) === String(storeId)) && (
                  <>
                    <button onClick={() => startEdit(item)} className="text-xs text-primary underline py-1.5 px-0.5">編輯</button>
                    <button onClick={() => remove(item)} className="text-xs text-red-500 underline py-1.5 px-0.5">刪除</button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {storeId && (
      <form ref={formRef} onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-5 mt-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">{editingId ? '編輯配送單' : '新增配送單'}</h2>
        <div>
          <label className="block text-xs text-gray-500 mb-1">類型</label>
          <div className="flex gap-2">
            {DELIVERY_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setForm(f => ({
                  ...f,
                  delivery_type: t,
                  // 切到分店調撥時，起點預設填自己目前的分店（可以再改），方便手動輸入
                  transfer_from: (t === '分店調撥' && !f.transfer_from) ? (storeName(stores, storeId) || '') : f.transfer_from
                }))}
                className={`flex-1 text-sm px-3 py-2 rounded-sm border transition-colors ${
                  form.delivery_type === t ? 'border-primary text-primary bg-primary/5 font-medium' : 'border-gray-200 text-gray-500'
                }`}>
                {t === '客人配送' ? '🚚 配送貨物給客人' : '🔄 分店調撥'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">配送日期</label>
            <input type="date" value={form.delivery_date}
              onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">配送時段</label>
            <select value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
              {DELIVERY_PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>

        {form.delivery_type === '分店調撥' ? (
          <>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">調撥起點 A</label>
                <select value={form.transfer_from} onChange={e => setForm(f => ({ ...f, transfer_from: e.target.value }))}
                  className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
                  <option value="">請選擇起點</option>
                  {transferTargets.filter(name => name !== form.transfer_to).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">調撥終點 B</label>
                <select value={form.transfer_to} onChange={e => setForm(f => ({ ...f, transfer_to: e.target.value }))}
                  className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
                  <option value="">請選擇終點</option>
                  {transferTargets.filter(name => name !== form.transfer_from).map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">調撥貨物</label>
              <input value={form.transfer_item} placeholder="富友倉提貨請註明，其他調撥省略"
                onChange={e => setForm(f => ({ ...f, transfer_item: e.target.value }))}
                className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
            </div>
          </>
        ) : null}

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">狀態</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary">
              {DELIVERY_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          {form.delivery_date && slotCount >= MAX_PER_SLOT && (
            <div className="flex items-end">
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-sm px-2 py-2">
                ⚠️ 全公司只有一位司機，這個時段全分店合計已有 {slotCount} 筆配送
              </p>
            </div>
          )}
        </div>

        {form.delivery_type === '客人配送' && (
          <>
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
          </>
        )}
        <div className="flex gap-3">
          <button disabled={saving} className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
            {saving ? '儲存中...' : (editingId ? '更新配送單' : '送出配送單')}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:text-dark px-4 py-2">取消編輯</button>
          )}
        </div>
      </form>
      )}
    </div>
  )
}

// ================= 缺訂貨狀態 =================
const EMPTY_STOCK_FORM = { item_name: '', status: '缺貨', note: '' }

function StockTab({ storeId, stores }) {
  const [list, setList] = useState([])
  const [filterStore, setFilterStore] = useState('')
  const [form, setForm] = useState(EMPTY_STOCK_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    const params = filterStore ? { store: filterStore } : {}
    api.get('/board/stock', { params }).then(r => setList(r.data || [])).catch(() => toast.error('載入失敗'))
  }, [filterStore])

  usePollingRefresh(load)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.item_name) return toast.error('品項為必填')
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/board/stock/${editingId}`, form, withStore(storeId))
        toast.success('已更新')
      } else {
        await api.post('/board/stock', form, withStore(storeId))
        toast.success('已送出')
      }
      setForm(EMPTY_STOCK_FORM)
      setEditingId(null)
      load()
    } catch (err) { toast.error(err.message || '儲存失敗') }
    finally { setSaving(false) }
  }

  const startEdit = (item) => {
    setEditingId(item.id)
    setForm({ item_name: item.item_name, status: item.status, note: item.note || '' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm(EMPTY_STOCK_FORM)
  }

  const cycleStatus = async (item) => {
    const next = STOCK_STATUSES[(STOCK_STATUSES.indexOf(item.status) + 1) % STOCK_STATUSES.length]
    if (!confirm(`確定要將狀態從「${item.status}」改成「${next}」嗎？`)) return
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
      if (editingId === item.id) cancelEdit()
      load()
    } catch (err) { toast.error(err.message || '刪除失敗') }
  }

  return (
    <div>
      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-sm p-5 mb-6 space-y-3">
        <h2 className="font-semibold text-dark text-sm mb-1">{editingId ? '編輯缺訂貨狀態' : '標示缺訂貨狀態'}</h2>
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
        <div className="flex gap-3">
          <button disabled={saving} className="btn-primary text-sm py-2 px-6 disabled:opacity-50">
            {saving ? '儲存中...' : (editingId ? '更新' : '送出')}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-gray-500 hover:text-dark px-4 py-2">取消編輯</button>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-dark">缺訂貨狀態列表</h2>
        <select value={filterStore} onChange={e => setFilterStore(e.target.value)}
          className="border border-gray-200 text-xs px-2 py-2 rounded-sm">
          <option value="">全部分店</option>
          {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {list.length === 0 && <div className="text-center text-gray-400 text-sm py-10">尚無缺訂貨資料</div>}
        {list.map(item => (
          <div key={item.id} className={`border rounded-sm p-4 ${String(item.store_id) === String(storeId) ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200'}`}>
            <div className="flex justify-between items-baseline flex-wrap gap-1">
              <span className="text-xs text-gray-400">{item.store_name}{item.created_by && <span>・上傳者 {item.created_by}</span>}</span>
              <span className="text-xs text-gray-400">更新：{fmtTime(item.updated_at)}</span>
            </div>
            <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${badgeClass(item.status)}`}>{item.status}</span>
            <p className="text-sm text-dark mt-2">🧾 {item.item_name}</p>
            {item.note && <p className="text-xs text-gray-500 mt-1">備註：{item.note}</p>}
            {String(item.store_id) === String(storeId) && (
              <div className="flex gap-4 mt-2">
                <button onClick={() => cycleStatus(item)} className="text-xs text-gray-500 underline py-1.5 px-0.5">切換狀態</button>
                <button onClick={() => startEdit(item)} className="text-xs text-primary underline py-1.5 px-0.5">編輯</button>
                <button onClick={() => remove(item)} className="text-xs text-red-500 underline py-1.5 px-0.5">刪除</button>
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

  usePollingRefresh(load)

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
              <span className="text-xs text-gray-400">{item.store_name}{item.created_by && <span>・上傳者 {item.created_by}</span>}</span>
              <span className="text-xs text-gray-400">{fmtTime(item.created_at)}</span>
            </div>
            <p className="text-sm text-dark mt-2 whitespace-pre-wrap">{item.message}</p>
            {String(item.store_id) === String(storeId) && (
              <button onClick={() => remove(item)} className="text-xs text-red-500 underline mt-2 py-1.5 px-0.5">刪除</button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ================= 假日設定（僅超級管理員）=================
// 自動改期功能判斷「下一個可配送日」時，除了跳過週六日，也會跳過這裡設定的日期，
// 避免逾時未出車的配送單被系統誤排到國定假日（司機當天通常沒出車）。
function HolidaysTab() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: '', note: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/holidays').then(r => setList(r.data || [])).catch(() => toast.error('假日清單載入失敗')).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.date) return toast.error('請選擇日期')
    setSaving(true)
    try {
      await api.post('/holidays', form)
      toast.success('已新增假日')
      setForm({ date: '', note: '' })
      load()
    } catch (err) { toast.error(err.message || '新增失敗') }
    finally { setSaving(false) }
  }

  const remove = async (date) => {
    if (!confirm(`確定要移除 ${date} 這個假日設定嗎？`)) return
    try {
      await api.delete(`/holidays/${date}`)
      toast.success('已移除')
      load()
    } catch { toast.error('移除失敗') }
  }

  return (
    <div className="max-w-xl">
      <p className="text-xs text-gray-500 mb-4">
        逾時未出車的配送單自動改期到「下一個可配送日」時，除了跳過週六日，也會跳過這裡設定的日期。
        國定假日每年不一樣，建議年初或連假前先把當年度的國定假日/連假加進來。
      </p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2 mb-6 bg-white border border-gray-200 rounded-sm p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">日期</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-gray-500 mb-1">備註（選填）</label>
          <input value={form.note} placeholder="例如：中秋節"
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            className="w-full border border-gray-200 px-3 py-2 text-sm rounded-sm focus:outline-none focus:border-primary" />
        </div>
        <button disabled={saving} className="btn-primary text-sm py-2 px-5 disabled:opacity-60">新增</button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-400">載入中...</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-400">目前沒有設定任何假日</p>
      ) : (
        <div className="space-y-2">
          {list.map(h => (
            <div key={h.date} className="flex items-center justify-between border border-gray-200 rounded-sm px-4 py-2.5 bg-white">
              <span className="text-sm text-dark">{h.date}{h.note && <span className="text-gray-400">・{h.note}</span>}</span>
              <button onClick={() => remove(h.date)} className="text-xs text-red-500 underline">移除</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ================= 歷史紀錄查詢 =================
const HISTORY_PAGE_SIZE = 50

function HistoryTab({ stores }) {
  const [store, setStore] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [merged, setMerged] = useState(null)
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE)

  const [exporting, setExporting] = useState(false)

  const buildParams = () => {
    const params = {}
    if (store) params.store = store
    if (from) params.from = `${from} 00:00:00`
    // 配送單的 delivery_time 存的是 T 分隔格式（例如 2026-09-20T08:00），其他資料表則是空白分隔。
    // 後端用字串比較日期區間，結束時間要用 endOfDay()（T 分隔）才能同時涵蓋兩種格式，
    // 用空白分隔會讓當天的配送單被字串比較誤判成「比結束時間晚」而被濾掉。
    if (to) params.to = endOfDay(to)
    return params
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const blob = await api.get('/board/export', { params: buildParams(), responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `配送紀錄匯出_${from || '全部'}_${to || dateKey(new Date())}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) { toast.error(err.message || '匯出失敗') }
    finally { setExporting(false) }
  }

  const search = async () => {
    const params = buildParams()
    try {
      const [deliveries, stock, comments, statusLog] = await Promise.all([
        api.get('/board/deliveries', { params }),
        api.get('/board/stock', { params }),
        api.get('/board/comments', { params }),
        api.get('/board/status-log', { params })
      ])
      const typeLabel = { delivery: '配送單', stock: '缺訂貨' }
      const withUploader = (name, createdBy) => createdBy ? `${name}・上傳者 ${createdBy}` : name
      const rows = [
        ...(deliveries.data || []).map(i => ({ type: i.delivery_type === '分店調撥' ? '分店調撥' : '配送單', color: i.delivery_type === '分店調撥' ? 'bg-cyan-600' : 'bg-blue-500', time: i.delivery_time, store: withUploader(i.store_name, i.created_by),
          text: i.delivery_type === '分店調撥'
            ? `🔄 ${transferTargetLabel(i, stores)} — ${i.status}${i.transfer_item ? `\n📦 ${i.transfer_item}` : ''}`
            : `📍 ${i.location} — ${i.status}${(i.customer_name || i.customer_contact) ? `\n👤 ${i.customer_name}${i.customer_contact ? '｜' + i.customer_contact : ''}` : ''}${i.content ? '\n' + i.content : ''}` })),
        ...(stock.data || []).map(i => ({ type: '缺訂貨', color: 'bg-amber-500', time: i.updated_at, store: withUploader(i.store_name, i.created_by),
          text: `🧾 ${i.item_name} — ${i.status}${i.note ? '\n備註：' + i.note : ''}` })),
        ...(comments.data || []).map(i => ({ type: '留言', color: 'bg-green-500', time: i.created_at, store: withUploader(i.store_name, i.created_by),
          text: i.message })),
        ...(statusLog.data || []).map(i => ({ type: '狀態變更', color: 'bg-purple-500', time: i.created_at, store: i.store_name,
          text: `${typeLabel[i.resource_type] || i.resource_type}狀態：${i.from_status || '（新建立）'} → ${i.to_status}（操作人：${i.changed_by}）` }))
      ].sort((a, b) => new Date(b.time.replace(' ', 'T')) - new Date(a.time.replace(' ', 'T')))
      setMerged(rows)
      setVisibleCount(HISTORY_PAGE_SIZE)
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
        <div className="flex gap-2">
          <button onClick={search} className="btn-primary text-sm py-2 px-6">查詢</button>
          <button onClick={exportCsv} disabled={exporting}
            className="text-sm py-2 px-6 border border-gray-200 rounded-sm text-gray-600 hover:border-primary hover:text-primary disabled:opacity-60">
            {exporting ? '匯出中...' : '📥 匯出 CSV（可用 Excel 開啟）'}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {merged === null && <div className="text-center text-gray-400 text-sm py-10">請設定條件後查詢</div>}
        {merged && merged.length === 0 && <div className="text-center text-gray-400 text-sm py-10">查無符合條件的紀錄</div>}
        {merged && merged.slice(0, visibleCount).map((item, idx) => (
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
        {merged && merged.length > visibleCount && (
          <button onClick={() => setVisibleCount(v => v + HISTORY_PAGE_SIZE)}
            className="w-full text-sm text-primary border border-gray-200 rounded-sm py-2.5 hover:border-primary transition-colors">
            載入更多（還有 {merged.length - visibleCount} 筆）
          </button>
        )}
      </div>
    </div>
  )
}
