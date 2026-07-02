import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/client'
import toast from 'react-hot-toast'

const EMPTY = {
  name: '', category_id: '', short_desc: '', description: '',
  features: [], applications: [], shopee_url: '',
  images: [], datasheet_url: '', is_active: true, sort_order: 0
}

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
          is_active: !!p.is_active,
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
      toast.error(err.message || '儲存失敗')
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">商品名稱 *</label>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">排序</label>
              <input type="number" value={form.sort_order} onChange={e => set('sort_order', e.target.value)} min="0"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">簡短描述</label>
              <input value={form.short_desc} onChange={e => set('short_desc', e.target.value)} placeholder="顯示在商品列表的簡短介紹（建議 50 字以內）"
                className="w-full border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">詳細說明</label>
              <textarea rows={5} value={form.description} onChange={e => set('description', e.target.value)} placeholder="完整的商品說明、施工方式、注意事項等..."
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

        {/* Features */}
        <div className="bg-white rounded shadow-sm p-6">
          <h2 className="font-bold text-dark mb-5 pb-3 border-b border-gray-100">產品特點</h2>
          <div className="flex gap-2 mb-4">
            <input value={featureInput} onChange={e => setFeatureInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              placeholder="輸入特點後按 Enter 或點擊新增"
              className="flex-1 border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-primary rounded-sm" />
            <button type="button" onClick={addFeature} className="bg-dark text-white px-4 py-2.5 text-sm rounded-sm hover:bg-gray-700">新增</button>
          </div>
          <ul className="space-y-2">
            {form.features.map((f, i) => (
              <li key={i} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded text-sm">
                <span className="text-primary">✓</span>
                <span className="flex-1">{f}</span>
                <button type="button" onClick={() => removeFeature(i)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
              </li>
            ))}
          </ul>
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
