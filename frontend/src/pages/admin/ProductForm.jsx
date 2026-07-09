import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', category_id: '', short_desc: '', description: '',
  features: [], applications: [], shopee_url: '',
  images: [], datasheet_url: '', installation_url: '', youtube_url: '', colors: [], is_active: true, is_featured: false, price: '', prices: [], sort_order: 0
}

const FEATURE_SUGGESTIONS = [
  { group: '性能', items: ['彈性伸縮率 200% 以上', '彈性伸縮率 300% 以上', '耐水壓 5m 水柱', '使用年限 3–5 年以上', '使用年限 5–7 年以上', '使用年限 7–10 年以上', '乾燥時間快（4 小時可踩踏）'] },
  { group: '材質', items: ['無毒環保，可接觸飲用水', '水性配方，無刺鼻氣味', '溶劑型，穿透力強', '單液型，免調配直接使用', '雙液型（A+B 混合）'] },
  { group: '耐候', items: ['耐紫外線，適合曝曬屋頂', '耐酸鹼腐蝕', '可在潮濕面施工', '抗凍融循環'] },
]

const APP_OPTIONS = [
  {
    group: '正水壓防水',
    desc: '水從外部施壓，防水層承受水壓',
    color: 'blue',
    items: ['屋頂／頂樓平台', '外牆／帷幕牆', '陽台／露台', '橋梁／停車場車道板', '游泳池外壁', '地下室外牆（迎水面）']
  },
  {
    group: '負水壓防水',
    desc: '水從結構背面施壓，防水層在乾燥面',
    color: 'orange',
    items: ['地下室內壁（背水面）', '電梯坑底', '隧道／地下道內壁', '蓄水槽／水塔內壁', '游泳池內壁']
  },
  {
    group: '室內防水',
    desc: '無明顯水壓，防潮與防漏',
    color: 'green',
    items: ['浴室／衛浴地板與牆面', '廚房地板', '陽台地板', '魚池／景觀水池']
  }
]

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [form, setForm] = useState(EMPTY)
  const [categories, setCategories] = useState([])
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [featureInput, setFeatureInput] = useState('')
  const [customAppInput, setCustomAppInput] = useState('')
  const [pdfUploading, setPdfUploading] = useState(false)
  const [installationPdfUploading, setInstallationPdfUploading] = useState(false)
  const [colorInput, setColorInput] = useState('')

  useEffect(() => {
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
    if (isEdit) {
      api.get(`/products/${id}`).then(r => {
        const p = r.data
        setForm({
          name: p.name || '',
          category_id: p.category_id || '',
          short_desc: p.short_desc || '',
          description: p.description || '',
          features: p.features || [],
          applications: p.applications || [],
          shopee_url: p.shopee_url || '',
          images: p.images || [],
          datasheet_url: p.datasheet_url || '',
          installation_url: p.installation_url || '',
          youtube_url: p.youtube_url || '',
          colors: Array.isArray(p.colors) ? p.colors : [],
          is_active: !!p.is_active,
          is_featured: !!p.is_featured,
          price: p.price || '',
          prices: Array.isArray(p.prices) ? p.prices : [],
          sort_order: p.sort_order || 0
        })
      }).catch(() => toast.error('載入商品失敗'))
    }
  }, [id, isEdit])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const addFeature = () => {
    if (!featureInput.trim()) return
    set('features', [...form.features, featureInput.trim()])
    setFeatureInput('')
  }
  const removeFeature = (i) => set('features', form.features.filter((_, idx) => idx !== i))

  const toggleApp = (item) => {
    const apps = form.applications
    if (apps.includes(item)) {
      set('applications', apps.filter(a => a !== item))
    } else {
      set('applications', [...apps, item])
    }
  }
  const addCustomApp = () => {
    if (!customAppInput.trim()) return
    if (!form.applications.includes(customAppInput.trim())) {
      set('applications', [...form.applications, customAppInput.trim()])
    }
    setCustomAppInput('')
  }
  const removeApp = (item) => set('applications', form.applications.filter(a => a !== item))

  const addPriceTier = () => set('prices', [...form.prices, { size: '', price: '' }])
  const updatePriceTier = (i, key, val) => set('prices', form.prices.map((t, idx) => idx === i ? { ...t, [key]: val } : t))
  const removePriceTier = (i) => set('prices', form.prices.filter((_, idx) => idx !== i))

  const detectColorHex = (name) => {
    const n = name.toLowerCase()
    if (/白/.test(n) && /米|乳|象牙/.test(n)) return '#FFFDE7'
    if (/象牙/.test(n)) return '#FFFFF0'
    if (/米|乳白/.test(n)) return '#FAF7F0'
    if (/白/.test(n)) return '#F5F5F5'
    if (/淺灰|淡灰|亮灰/.test(n)) return '#D1D5DB'
    if (/深灰|炭灰|碳灰|暗灰/.test(n)) return '#4B5563'
    if (/水泥|混凝土/.test(n)) return '#9CA3AF'
    if (/灰/.test(n)) return '#9CA3AF'
    if (/黑/.test(n)) return '#1F2937'
    if (/磚紅|土紅|暗紅/.test(n)) return '#B91C1C'
    if (/紅|朱/.test(n)) return '#DC2626'
    if (/橘|橙/.test(n)) return '#F97316'
    if (/黃/.test(n)) return '#EAB308'
    if (/深綠|墨綠/.test(n)) return '#166534'
    if (/綠|翠/.test(n)) return '#22C55E'
    if (/深藍|海軍藍|靛/.test(n)) return '#1D4ED8'
    if (/藍|青/.test(n)) return '#3B82F6'
    if (/紫/.test(n)) return '#A855F7'
    if (/粉/.test(n)) return '#F9A8D4'
    if (/棕|咖啡|茶/.test(n)) return '#92400E'
    if (/銀/.test(n)) return '#C0C0C0'
    if (/金/.test(n)) return '#D4AF37'
    if (/透明/.test(n)) return '#E5E7EB'
    return '#9CA3AF'
  }
  const addColor = () => {
    if (!colorInput.trim()) return
    set('colors', [...form.colors, { name: colorInput.trim(), hex: detectColorHex(colorInput) }])
    setColorInput('')
  }
  const removeColor = (i) => set('colors', form.colors.filter((_, idx) => idx !== i))

  const handleImageUpload = async (e) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('images', f))
      const res = await api.post('/upload/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      set('images', [...form.images, ...(res.urls || [])])
      toast.success('圖片上傳成功')
    } catch { toast.error('圖片上傳失敗') }
    finally { setUploading(false) }
  }

  const removeImage = (i) => set('images', form.images.filter((_, idx) => idx !== i))

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfUploading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await api.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      set('datasheet_url', res.url)
      toast.success(`已上傳：${res.originalName}`)
    } catch { toast.error('PDF 上傳失敗') }
    finally { setPdfUploading(false) }
  }

  const handleInstallationPdfUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setInstallationPdfUploading(true)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      const res = await api.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      set('installation_url', res.url)
      toast.success(`已上傳：${res.originalName}`)
    } catch { toast.error('PDF 上傳失敗') }
    finally { setInstallationPdfUploading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('商品名稱為必填')
    setSaving(true)
    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        sort_order: Number(form.sort_order) || 0
      }
      if (isEdit) {
        await api.put(`/products/${id}`, payload)
        toast.success('商品更新成功')
      } else {
        await api.post('/products', payload)
        toast.success('商品新增成功')
      }
      navigate('/admin/products')
    } catch (err) {
      toast.error(err.message || '儲存失敗', { duration: 5000 })
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-4 mb-7">
        <button onClick={() => navigate('/admin/products')} className="text-gray-400 hover:text-dark">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-dark">{isEdit ? '編輯商品' : '新增商品'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5 pb-3 border-b border-gray-100">基本資訊</h2>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">商品名稱 *</label>
              <p className="text-xs text-gray-400 mb-1.5">建議格式：品牌／系列 ＋ 型號 ＋ 類型，例：<span className="text-gray-500">ProWater 901 彈性防水塗料</span>、<span className="text-gray-500">Sika-107 水泥基防水材</span></p>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="例：ProWater 901 彈性防水塗料" required
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">商品分類</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)}
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm">
                <option value="">未分類</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">售價規格</label>
              <p className="text-xs text-gray-400 mb-3">可依包裝容量設定多組售價，例：4kg / NT$1,000。留空則商品頁顯示「洽詢」。</p>
              <div className="space-y-2 mb-3">
                {form.prices.map((tier, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={tier.size}
                      onChange={e => updatePriceTier(i, 'size', e.target.value)}
                      placeholder="規格（例：4kg）"
                      className="w-32 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm"
                    />
                    <span className="text-gray-400 text-sm">NT$</span>
                    <input
                      type="number"
                      value={tier.price}
                      onChange={e => updatePriceTier(i, 'price', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-32 border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-primary rounded-sm"
                    />
                    <button type="button" onClick={() => removePriceTier(i)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addPriceTier}
                className="text-sm text-gray-500 hover:text-dark border border-dashed border-gray-300 hover:border-gray-400 px-4 py-2 rounded-sm transition-colors">
                ＋ 新增規格
              </button>
            </div>

            {/* Colors */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">顏色選項</label>
              <p className="text-xs text-gray-400 mb-3">輸入顏色名稱，自動對應色票。例：白色、水泥灰、深藍。</p>
              <div className="flex gap-2 mb-3">
                {colorInput && (
                  <span className="w-10 h-10 rounded border border-gray-200 flex-shrink-0" style={{ background: detectColorHex(colorInput) }} />
                )}
                <input
                  value={colorInput}
                  onChange={e => setColorInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addColor())}
                  placeholder="例：白色、水泥灰、透明"
                  className="flex-1 border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm"
                />
                <button type="button" onClick={addColor}
                  className="bg-dark text-white px-4 py-2.5 text-sm rounded-sm hover:bg-gray-700 flex-shrink-0">新增</button>
              </div>
              {form.colors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.colors.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-full pl-1 pr-3 py-1">
                      <span className="w-6 h-6 rounded-full border border-gray-200 flex-shrink-0" style={{ background: c.hex }} />
                      <span className="text-sm text-dark">{c.name}</span>
                      <button type="button" onClick={() => removeColor(i)} className="text-gray-300 hover:text-red-500 transition-colors text-xs ml-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">簡短描述</label>
              <p className="text-xs text-gray-400 mb-1.5">顯示在商品列表卡片上，建議 30–50 字，點出最大賣點。例：<span className="text-gray-500">高彈性水性聚氨酯，適合屋頂平台與浴室，無毒環保，乾燥快速。</span></p>
              <input value={form.short_desc} onChange={e => set('short_desc', e.target.value)}
                placeholder="例：高彈性水性聚氨酯，適合屋頂平台與浴室，無毒環保，乾燥快速。"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
              <p className="text-xs text-gray-400 mt-1 text-right">{form.short_desc.length} / 80 字</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">詳細說明</label>
              <p className="text-xs text-gray-400 mb-1.5">建議包含：產品概述、適用基材、施工步驟、注意事項、保固條件。可分段書寫。</p>
              <textarea rows={6} value={form.description} onChange={e => set('description', e.target.value)}
                placeholder={'例：\nProWater 901 為單液型水性聚氨酯防水塗料，適用於混凝土、磁磚、金屬等基材。\n\n【施工步驟】\n1. 清潔基面，去除灰塵與油污\n2. 均勻塗布第一道，待乾 4 小時\n3. 交叉方向塗布第二道\n\n【注意事項】\n施工溫度須在 5–40°C，避免雨天施工。'}
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm resize-none" />
            </div>
          </div>
        </div>

        {/* Shopee Link */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5 pb-3 border-b border-gray-100">蝦皮購買連結</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">蝦皮商品網址</label>
            <input value={form.shopee_url} onChange={e => set('shopee_url', e.target.value)}
              placeholder="https://shopee.tw/..."
              className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            <p className="text-xs text-gray-400 mt-1.5">留空則不顯示蝦皮購買按鈕</p>
          </div>
        </div>

        {/* YouTube */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5 pb-3 border-b border-gray-100">YouTube 影片</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">影片網址</label>
            <input value={form.youtube_url} onChange={e => set('youtube_url', e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... 或 https://youtu.be/..."
              className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            <p className="text-xs text-gray-400 mt-1.5">留空則不顯示影片區塊。支援 youtube.com/watch 及 youtu.be 短網址。</p>
            {form.youtube_url && (() => {
              const match = form.youtube_url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
              const vid = match?.[1]
              return vid ? (
                <div className="mt-3 rounded overflow-hidden aspect-video max-w-sm">
                  <iframe src={`https://www.youtube.com/embed/${vid}`} className="w-full h-full" allowFullScreen title="預覽" />
                </div>
              ) : <p className="text-xs text-red-400 mt-1.5">無法解析網址，請確認格式正確</p>
            })()}
          </div>
        </div>

        {/* Datasheet PDF */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-1 pb-3 border-b border-gray-100">技術文件 PDF</h2>
          <p className="text-xs text-gray-400 mb-4">上傳後客戶可在產品頁直接下載（最大 20MB）</p>

          {form.datasheet_url ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-4 py-3">
              <svg className="w-8 h-8 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">
                  {form.datasheet_url.split('/').pop()}
                </p>
                <a href={form.datasheet_url} target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline">預覽 PDF ›</a>
              </div>
              <div className="flex gap-2">
                <label className={`px-3 py-1.5 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-100 ${pdfUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {pdfUploading ? '上傳中...' : '更換'}
                  <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={pdfUploading} className="hidden" />
                </label>
                <button type="button" onClick={() => set('datasheet_url', '')}
                  className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">刪除</button>
              </div>
            </div>
          ) : (
            <label className={`block border-2 border-dashed border-gray-300 hover:border-primary rounded p-8 text-center cursor-pointer transition-colors ${pdfUploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm text-gray-500">{pdfUploading ? '上傳中...' : '點擊上傳 PDF 技術文件'}</div>
              <div className="text-xs text-gray-400 mt-1">例：產品規格書、TDS 技術資料表、SDS 安全資料表</div>
              <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={pdfUploading} className="hidden" />
            </label>
          )}
        </div>

        {/* Installation Guide PDF */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-1 pb-3 border-b border-gray-100">施工說明 PDF</h2>
          <p className="text-xs text-gray-400 mb-4">上傳施工步驟說明書，客戶可在產品頁下載參考（最大 20MB）</p>

          {form.installation_url ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded px-4 py-3">
              <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark truncate">
                  {form.installation_url.split('/').pop()}
                </p>
                <a href={form.installation_url} target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline">預覽 PDF ›</a>
              </div>
              <div className="flex gap-2">
                <label className={`px-3 py-1.5 text-xs border border-gray-300 rounded cursor-pointer hover:bg-gray-100 ${installationPdfUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {installationPdfUploading ? '上傳中...' : '更換'}
                  <input type="file" accept=".pdf" onChange={handleInstallationPdfUpload} disabled={installationPdfUploading} className="hidden" />
                </label>
                <button type="button" onClick={() => set('installation_url', '')}
                  className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded hover:bg-red-50">刪除</button>
              </div>
            </div>
          ) : (
            <label className={`block border-2 border-dashed border-gray-300 hover:border-primary rounded p-8 text-center cursor-pointer transition-colors ${installationPdfUploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <div className="text-3xl mb-2">🔧</div>
              <div className="text-sm text-gray-500">{installationPdfUploading ? '上傳中...' : '點擊上傳施工說明 PDF'}</div>
              <div className="text-xs text-gray-400 mt-1">例：施工步驟說明書、施工注意事項、工法圖解</div>
              <input type="file" accept=".pdf" onChange={handleInstallationPdfUpload} disabled={installationPdfUploading} className="hidden" />
            </label>
          )}
        </div>

        {/* Features */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-1 pb-3 border-b border-gray-100">產品特點</h2>
          <p className="text-xs text-gray-400 mb-4">用於產品頁打勾列表與比較頁面對照，每條建議 6–15 字，用詞統一（同系列產品用同樣措辭）</p>

          {/* 快速新增範例 */}
          <div className="mb-4 space-y-2">
            {FEATURE_SUGGESTIONS.map(g => (
              <div key={g.group}>
                <span className="text-xs text-gray-400 mr-2">{g.group}：</span>
                {g.items.map(item => {
                  const added = form.features.includes(item)
                  return (
                    <button key={item} type="button"
                      onClick={() => added ? set('features', form.features.filter(f => f !== item)) : set('features', [...form.features, item])}
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border mr-1.5 mb-1.5 transition-colors
                        ${added ? 'bg-primary/10 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'}`}>
                      {added ? '✓ ' : '+ '}{item}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 自訂輸入 */}
          <div className="flex gap-2 mb-4">
            <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              placeholder="自訂特點，例：防霉抗藻配方"
              className="flex-1 border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            <button type="button" onClick={addFeature} className="bg-dark text-white px-4 py-2.5 text-sm rounded-sm hover:bg-gray-700">新增</button>
          </div>

          {/* 已選列表 */}
          {form.features.length > 0 && (
            <ul className="space-y-1.5">
              {form.features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded text-sm">
                  <span className="text-primary text-xs">✓</span>
                  <span className="flex-1">{f}</span>
                  <button type="button" onClick={() => removeFeature(i)} className="text-gray-300 hover:text-red-500 transition-colors">✕</button>
                </li>
              ))}
            </ul>
          )}
          {form.features.length === 0 && (
            <p className="text-xs text-gray-300 text-center py-4">尚未新增任何特點，點擊上方範例或自行輸入</p>
          )}
        </div>

        {/* Applications */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-1 pb-3 border-b border-gray-100">適用場景</h2>
          <p className="text-xs text-gray-400 mb-5">勾選此產品適用的防水場景，可複選</p>

          <div className="space-y-6">
            {APP_OPTIONS.map(group => (
              <div key={group.group}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    group.color === 'blue' ? 'bg-blue-100 text-blue-700' :
                    group.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>{group.group}</span>
                  <span className="text-xs text-gray-400">{group.desc}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {group.items.map(item => {
                    const checked = form.applications.includes(item)
                    return (
                      <label key={item}
                        className={`flex items-center gap-2.5 px-3 py-2.5 border rounded cursor-pointer transition-colors text-sm select-none
                          ${checked ? 'border-primary bg-red-50 text-dark' : 'border-gray-200 text-gray-600 hover:border-gray-400 hover:bg-gray-50'}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleApp(item)} className="hidden" />
                        <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors
                          ${checked ? 'bg-primary border-primary' : 'border-gray-300'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                        </div>
                        {item}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Custom */}
          <div className="mt-5 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">自訂場景（不在上方列表中）</p>
            <div className="flex gap-2">
              <input value={customAppInput} onChange={e => setCustomAppInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomApp())}
                placeholder="輸入自訂場景後按 Enter"
                className="flex-1 border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:border-primary rounded-sm" />
              <button type="button" onClick={addCustomApp} className="bg-dark text-white px-4 py-2 text-sm rounded-sm hover:bg-gray-700">新增</button>
            </div>
            {/* Show custom (non-preset) tags */}
            {form.applications.filter(a => !APP_OPTIONS.flatMap(g => g.items).includes(a)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {form.applications
                  .filter(a => !APP_OPTIONS.flatMap(g => g.items).includes(a))
                  .map(a => (
                    <span key={a} className="bg-gray-100 text-gray-700 px-3 py-1 text-sm rounded flex items-center gap-2">
                      {a}
                      <button type="button" onClick={() => removeApp(a)} className="text-gray-400 hover:text-red-500">✕</button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5 pb-3 border-b border-gray-100">商品圖片</h2>
          <label className="block mb-4">
            <div className={`border-2 border-dashed border-gray-300 hover:border-primary p-8 text-center cursor-pointer transition-colors rounded-sm ${uploading ? 'opacity-60' : ''}`}>
              <div className="text-3xl mb-2">📷</div>
              <div className="text-sm text-gray-500">{uploading ? '上傳中...' : '點擊選擇圖片（可多選，最多 10 張）'}</div>
              <div className="text-xs text-gray-400 mt-1">支援 JPG / PNG / WebP，每張最大 10MB</div>
            </div>
            <input type="file" accept="image/*" multiple onChange={handleImageUpload} disabled={uploading} className="hidden" />
          </label>
          {form.images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {form.images.map((img, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover rounded border border-gray-200" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    ✕
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 bg-primary text-white text-xs px-1.5 py-0.5 rounded">主圖</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="bg-white rounded shadow-sm p-6 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-gray-300'}`}
              onClick={() => set('is_active', !form.is_active)}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`}></div>
            </div>
            <span className="text-sm font-medium text-dark">{form.is_active ? '立即上架' : '儲存為下架'}</span>
          </label>
          <div className="flex gap-3">
            <button type="button" onClick={() => navigate('/admin/products')} className="px-5 py-2.5 border border-gray-200 text-sm font-medium hover:bg-gray-50 rounded-sm">取消</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2.5 px-6 disabled:opacity-60">
              {saving ? '儲存中...' : (isEdit ? '更新商品' : '新增商品')}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
