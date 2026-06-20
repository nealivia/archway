import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ProductCard from '../components/ProductCard'
import api from '../api/client'

const features = [
  { icon: '🛡️', title: '高效防水', desc: '採用最新配方，防水效果持久穩定，抵抗各種極端天氣條件' },
  { icon: '🔬', title: '科技研發', desc: '持續投入研發，掌握最新防水技術，確保產品性能領先業界' },
  { icon: '✅', title: '品質保證', desc: '通過 ISO 認證，每批產品嚴格品管，給您最可靠的保障' },
  { icon: '🏗️', title: '專業施工', desc: '提供完整的施工指導與技術支援，確保施工品質與效果' }
]

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])

  useEffect(() => {
    api.get('/products?limit=8').then(r => setProducts(r.data || [])).catch(() => {})
    api.get('/categories').then(r => setCategories(r.data || [])).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden min-h-[88vh] flex items-center" style={{background: 'linear-gradient(135deg, #3D1010 0%, #5C1111 40%, #2B2B2B 100%)'}}>
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/90 px-4 py-2 text-sm font-medium mb-8 rounded-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              30 年專業防水品牌
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              松上防水<br/>
              <span className="text-white/80 text-3xl md:text-4xl font-semibold">品質，您可以放心</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-10 max-w-lg">
              提供多元化防水材料，涵蓋屋頂、地下室、浴室、外牆等各種應用場景。
              品質可靠，技術專業，是您防水工程的最佳夥伴。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products" className="bg-white text-primary hover:bg-gray-100 font-semibold text-base py-4 px-8 transition-colors rounded-sm">
                瀏覽產品目錄
              </Link>
              <Link to="/about" className="border-2 border-white text-white hover:bg-white hover:text-primary font-semibold text-base py-4 px-8 transition-colors rounded-sm">
                聯絡我們
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-14 flex gap-10">
              {[['30+', '年產業經驗'], ['500+', '完工專案'], ['99%', '客戶滿意度']].map(([num, label]) => (
                <div key={label}>
                  <div className="text-3xl font-extrabold text-white">{num}</div>
                  <div className="text-white/50 text-sm mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Visual - LOGO 大圖 */}
          <div className="hidden md:flex justify-center items-center">
            <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-10 rounded-sm">
              <img src="/logo-horizontal.png" alt="松上防水 ARCHWAY" className="w-72 object-contain" style={{filter: 'brightness(0) invert(1)'}} />
              <div className="text-center text-white/60 text-sm mt-4 tracking-widest uppercase">Quality You Can Be Sure Of</div>
            </div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" className="w-full fill-white">
            <path d="M0,40 C360,0 1080,60 1440,20 L1440,60 L0,60 Z"/>
          </svg>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="section-title">為什麼選擇松上防水</h2>
            <p className="section-subtitle">專業品質，值得信賴</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(f => (
              <div key={f.title} className="border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all duration-300 p-8 group">
                <div className="text-4xl mb-5">{f.icon}</div>
                <h3 className="font-bold text-dark text-lg mb-3 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-10">
              <h2 className="section-title">產品分類</h2>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/products" className="px-6 py-3 bg-dark text-white font-medium text-sm hover:bg-primary transition-colors">全部產品</Link>
              {categories.map(c => (
                <Link key={c.id} to={`/products?category_id=${c.id}`} className="px-6 py-3 bg-white border border-gray-200 text-dark font-medium text-sm hover:bg-primary hover:text-white hover:border-primary transition-colors">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="section-title mb-0">精選產品</h2>
              <p className="text-gray-500 mt-2">高效防水，品質保證</p>
            </div>
            <Link to="/products" className="text-primary font-medium flex items-center gap-1 hover:gap-2 transition-all text-sm">
              查看全部
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📦</div>
              <p>目前尚無上架商品</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20" style={{background: 'linear-gradient(135deg, #3D1010 0%, #5C1111 100%)'}}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">需要專業防水建議？</h2>
          <p className="text-gray-400 text-lg mb-8">我們的技術團隊隨時為您提供免費諮詢與報價</p>
          <Link to="/about" className="btn-primary text-base py-4 px-10 inline-block">聯絡我們</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}
