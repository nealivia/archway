import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import api from '../api/client'

const stats = [
  { num: '30+', label: '年產業經驗' },
  { num: '500+', label: '完工專案' },
  { num: '99%', label: '客戶滿意度' },
  { num: '3', label: '門市據點' }
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [stores, setStores] = useState([])
  const location = useLocation()

  useEffect(() => {
    api.get('/stores').then(r => setStores(r.data || [])).catch(() => {})
  }, [])

  // hash 跳轉（如 /#stores）
  useEffect(() => {
    if (!location.hash) return
    const id = location.hash.slice(1)
    const el = document.getElementById(id)
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [location.hash, stores])

  useEffect(() => {
    api.get('/products/featured')
      .then(r => {
        const featured = r.data || []
        if (featured.length > 0) {
          setProducts(featured)
        } else {
          // fallback：沒有精選商品時顯示最新 6 個
          api.get('/products?limit=3').then(r2 => setProducts(r2.data || [])).catch(() => {})
        }
      })
      .catch(() => {
        api.get('/products?limit=3').then(r => setProducts(r.data || [])).catch(() => {})
      })
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gray-50 pt-20 pb-16 md:pt-36 md:pb-28 text-center px-6">
        {/* 幾何裝飾 */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full border border-gray-200" />
        <div className="pointer-events-none absolute -top-10 -right-10 w-44 h-44 rounded-full border border-gray-200" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 w-56 h-56 rounded-full border border-gray-200" />
        <div className="relative flex flex-col items-center mb-2">
          <img src="/archway_logo.png" alt="ARCHWAY 松上防水" className="h-[4.5rem] md:h-28 w-auto mb-2" />
          <span className="text-2xl md:text-[2.5rem] font-bold text-dark tracking-[0.12em]" style={{display:'inline-block', transform:'scaleX(0.95)'}}>松上ARCHWAY</span>
        </div>
        <h1 className="relative text-4xl md:text-6xl font-bold text-dark tracking-tight leading-snug mb-5">
          守護建築，從防水開始
        </h1>
        <p className="relative text-sm md:text-base text-gray-400 mb-10 max-w-md mx-auto leading-relaxed">
          30 年專業經驗，為您的建築提供最完整的防水解決方案
        </p>
        <div className="relative flex items-center justify-center gap-2 flex-wrap">
          <Link to="/products" className="text-base text-primary hover:text-primary-dark transition-colors font-normal">
            瀏覽產品目錄 ›
          </Link>
          <span className="text-gray-300 text-lg mx-1">|</span>
          <Link to="/about#contact" className="text-base text-gray-500 hover:text-dark transition-colors font-normal">
            聯絡我們 ›
          </Link>
        </div>
      </section>

      {/* Stats 統計橫幅 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto grid grid-cols-4 divide-x divide-gray-100">
          {stats.map(s => (
            <div key={s.label} className="py-6 md:py-8 text-center">
              <div className="text-2xl md:text-3xl font-bold text-dark mb-1">{s.num}</div>
              <div className="text-xs md:text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Products */}
      <section className="py-16 md:py-28 bg-gray-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="section-eyebrow">精選產品</div>
              <h2 className="text-4xl md:text-5xl font-bold text-dark tracking-tight">高效防水材料</h2>
            </div>
            <Link to="/products" className="text-sm text-primary hover:text-primary-dark transition-colors">
              查看全部 ›
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} variant="overlay" />)}
            </div>
          ) : (
            <div className="text-center py-20 text-gray-300">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/>
              </svg>
              <p className="text-gray-400">即將上架</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-dark text-center px-6">
        <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-3">需要專業建議？</h2>
        <p className="text-base md:text-lg text-gray-400 mb-8">技術團隊隨時提供免費諮詢與報價</p>
        <Link to="/about#contact" className="btn-primary inline-block">立即聯絡我們</Link>
      </section>

      {/* 門市據點 */}
      {stores.length > 0 && (
        <section id="stores" className="py-12 md:py-20 bg-white px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="section-eyebrow">門市據點</div>
              <h2 className="text-3xl font-bold text-dark tracking-tight mb-2">歡迎親臨洽詢</h2>
              <p className="text-gray-500 text-sm">大台北地區全覆蓋</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {stores.map(store => (
                <div key={store.id} className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="font-semibold text-dark text-base mb-4">{store.name}</h3>
                  <div className="space-y-3">
                    {store.address && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(store.address)}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-start gap-2 text-sm text-gray-500 hover:text-dark transition-colors">
                        <span className="flex-shrink-0 mt-0.5">📍</span>
                        <span>{store.address}</span>
                      </a>
                    )}
                    {store.phone && (
                      <a href={`tel:${store.phone.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-gray-500 hover:text-dark transition-colors">
                        <span>📞</span><span>{store.phone}</span>
                      </a>
                    )}
                    {store.hours && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span>🕐</span><span>{store.hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  )
}
