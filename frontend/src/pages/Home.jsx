import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import api from '../api/client'

const features = [
  { icon: '🛡️', title: '高效防水', desc: '採用最新配方，防水效果持久穩定，抵禦各種極端天氣條件' },
  { icon: '🔬', title: '科技研發', desc: '持續投入研發，掌握最新防水技術，確保產品性能領先業界' },
  { icon: '✅', title: '品質保證', desc: '通過 ISO 認證，每批產品嚴格品管，給您最可靠的保障' },
  { icon: '🏗️', title: '專業施工', desc: '提供完整的施工指導與技術支援，確保施工品質與效果' }
]

const stats = [
  { num: '30+', label: '年產業經驗' },
  { num: '500+', label: '完工專案' },
  { num: '99%', label: '客戶滿意度' },
  { num: '3', label: '門市據點' }
]

export default function Home() {
  const [products, setProducts] = useState([])

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
      <section className="bg-gray-50 pt-12 pb-10 md:pt-20 md:pb-16 text-center px-6">
        <img src="/archway_logo.png" alt="ARCHWAY 松上防水" className="h-10 md:h-12 w-auto mx-auto mb-2 opacity-70" />
        <h1 className="text-5xl md:text-7xl font-bold text-dark tracking-tight leading-none mb-4 mt-2">
          滴水不漏
        </h1>
        <p className="text-sm md:text-base text-gray-400 mb-8 max-w-lg mx-auto leading-relaxed">
          30 年專業經驗，為您的建築提供最完整的防水解決方案
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Link to="/products" className="text-base text-primary hover:text-primary-dark transition-colors font-normal">
            瀏覽產品目錄 ›
          </Link>
          <span className="text-gray-300 text-lg mx-1">|</span>
          <Link to="/about#contact" className="text-base text-gray-500 hover:text-dark transition-colors font-normal">
            聯絡我們 ›
          </Link>
        </div>
      </section>

      {/* Stats */}
      <div className="bg-white border-y border-gray-200">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200">
          {stats.map(s => (
            <div key={s.label} className="py-7 text-center px-4">
              <div className="text-3xl font-bold text-dark tracking-tight">{s.num}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="py-12 md:py-20 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="section-eyebrow text-center">為何選擇我們</div>
          <h2 className="section-title text-center mb-3">品質，您可以放心</h2>
          <p className="text-base md:text-lg text-gray-500 text-center mb-10 md:mb-14">通過多項國際認證，專業品質保證</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-10">
            {features.map(f => (
              <div key={f.title}>
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-semibold text-dark mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12 md:py-20 bg-gray-50 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-10">
            <div>
              <div className="section-eyebrow">精選產品</div>
              <h2 className="text-3xl font-bold text-dark tracking-tight">高效防水材料</h2>
            </div>
            <Link to="/products" className="text-sm text-primary hover:text-primary-dark transition-colors">
              查看全部 ›
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
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

      <Footer />
    </div>
  )
}
