import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/client'
import toast from 'react-hot-toast'

const stores = [
  {
    name: '和平店',
    address: '台北市中正區和平西路一段136號1樓',
    mapUrl: 'https://maps.google.com/?q=台北市中正區和平西路一段136號1樓',
    phone: '02-2365-0047',
    tel: '0223650047',
    hours: '週一至週六 07:00–19:00'
  },
  {
    name: '板橋店',
    address: '新北市板橋區中山路二段384號1樓',
    mapUrl: 'https://maps.google.com/?q=新北市板橋區中山路二段384號1樓',
    phone: '02-2957-6311',
    tel: '0229576311',
    hours: '週一至週五 07:00–19:00'
  },
  {
    name: '樹林 Sika 展示店',
    address: '新北市樹林區東興街37號1樓',
    mapUrl: 'https://maps.google.com/?q=新北市樹林區東興街37號1樓',
    phone: '02-8685-8039',
    tel: '0286858039',
    hours: '週一至週五 08:00–17:00'
  }
]

export default function About() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [sending, setSending] = useState(false)
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [hash])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await api.post('/contact', form)
      toast.success('詢問已送出，我們將盡快回覆您！')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch {
      toast.error('送出失敗，請直接來電或 LINE 聯繫我們')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-gray-50 pt-14 pb-10 px-6 border-b border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="section-eyebrow">ARCHWAY 松上防水</div>
          <h1 className="text-5xl font-bold text-dark tracking-tight mb-2">關於我們</h1>
          <p className="text-lg text-gray-500">30 年專業經驗，您最信賴的防水夥伴</p>
        </div>
      </section>

      {/* About */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-start">
          <div>
            <div className="section-eyebrow">公司簡介</div>
            <h2 className="text-3xl font-bold text-dark tracking-tight mb-6">滴水不漏，<br/>從 1991 年開始</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              松上防水成立於 1991 年，專注於高效能防水材料的銷售與工程施工。
              我們擁有超過 30 年的產業經驗，產品廣泛應用於住宅、商業、工業等各類建築工程。
            </p>
            <p className="text-sm text-gray-500 leading-relaxed">
              研發團隊持續投入新技術研究，結合環保理念與高性能需求，
              提供符合國際標準的防水解決方案。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['30+','年產業經驗'],['500+','完工專案'],['99%','客戶滿意度'],['3','門市據點']].map(([num, label]) => (
              <div key={label} className="bg-gray-50 rounded-2xl p-6">
                <div className="text-3xl font-bold text-dark tracking-tight mb-1">{num}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="py-10 bg-gray-50 border-y border-gray-200 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['ISO 9001','品質管理認證'],['SGS 檢驗','材料安全認證'],['綠建材','環保標章'],['CNS 標準','符合國家標準']].map(([badge, label]) => (
            <div key={badge} className="text-center">
              <div className="text-sm font-semibold text-primary mb-1">{badge}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Stores */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-eyebrow">門市據點</div>
            <h2 className="text-4xl font-bold text-dark tracking-tight mb-2">歡迎親臨洽詢</h2>
            <p className="text-gray-500">三間門市，大台北地區全覆蓋</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {stores.map(store => (
              <div key={store.name} className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-semibold text-dark text-base mb-4">{store.name}</h3>
                <div className="space-y-3">
                  <a href={store.mapUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-2 text-sm text-gray-500 hover:text-dark transition-colors">
                    <span className="flex-shrink-0 mt-0.5">📍</span>
                    <span>{store.address}</span>
                  </a>
                  <a href={`tel:${store.tel}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-dark transition-colors">
                    <span>📞</span><span>{store.phone}</span>
                  </a>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>🕐</span><span>{store.hours}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 bg-gray-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-eyebrow">聯絡我們</div>
            <h2 className="text-4xl font-bold text-dark tracking-tight mb-2">有問題嗎？</h2>
            <p className="text-gray-500">填寫表單，我們將於一個工作天內回覆</p>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div className="space-y-6">
              {[
                { href: 'https://line.me/R/ti/p/@archway', icon: '💬', label: 'LINE', value: '@archway', target: '_blank' },
                { href: 'mailto:archway1991@gmail.com', icon: '✉️', label: '信箱', value: 'archway1991@gmail.com' },
                { href: 'tel:0223650047', icon: '📞', label: '電話（和平店）', value: '02-2365-0047' }
              ].map(item => (
                <a key={item.label} href={item.href} target={item.target} rel={item.target ? 'noopener noreferrer' : undefined}
                  className="flex items-center gap-4 group">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-200 flex-shrink-0">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-0.5">{item.label}</div>
                    <div className="text-sm font-medium text-dark group-hover:text-primary transition-colors">{item.value}</div>
                  </div>
                </a>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="您的姓名 *" value={form.name}
                onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-300" required />
              <input type="email" placeholder="電子郵件 *" value={form.email}
                onChange={e => setForm(f => ({...f, email: e.target.value}))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-300" required />
              <input type="tel" placeholder="聯絡電話" value={form.phone}
                onChange={e => setForm(f => ({...f, phone: e.target.value}))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-300" />
              <textarea rows={4} placeholder="詢問內容 *" value={form.message}
                onChange={e => setForm(f => ({...f, message: e.target.value}))}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gray-400 resize-none placeholder-gray-300" required />
              <button type="submit" disabled={sending} className="btn-primary w-full disabled:opacity-50">
                {sending ? '送出中...' : '送出詢問'}
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
