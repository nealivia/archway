import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import api from '../api/client'

export default function ProductDetail() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedImg, setSelectedImg] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(r => setProduct(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex flex-col"><Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-primary rounded-full animate-spin"></div>
      </div>
    <Footer /></div>
  )

  if (!product) return (
    <div className="min-h-screen flex flex-col"><Navbar />
      <div className="flex-1 flex items-center justify-center text-center px-6">
        <div>
          <div className="text-5xl mb-4 text-gray-200">404</div>
          <h2 className="text-xl font-semibold text-dark mb-3">找不到此商品</h2>
          <Link to="/products" className="text-sm text-primary">返回產品目錄 ›</Link>
        </div>
      </div>
    <Footer /></div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-3 px-6">
        <div className="max-w-5xl mx-auto text-xs text-gray-400 flex items-center gap-2">
          <Link to="/" className="hover:text-dark transition-colors">首頁</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-dark transition-colors">產品目錄</Link>
          <span>/</span>
          <span className="text-dark">{product.name}</span>
        </div>
      </div>

      <div className="flex-1 py-14 bg-white px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Images */}
            <div>
              <div className="rounded-2xl overflow-hidden bg-gray-50 aspect-video mb-3">
                {product.images?.length > 0 ? (
                  <img src={product.images[selectedImg]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-20 h-20 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, i) => (
                    <button key={i} onClick={() => setSelectedImg(i)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${selectedImg === i ? 'border-primary' : 'border-transparent'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {product.category_name && (
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{product.category_name}</div>
              )}
              <h1 className="text-3xl font-bold text-dark tracking-tight mb-4">{product.name}</h1>
              {product.short_desc && (
                <p className="text-base text-gray-500 leading-relaxed mb-6">{product.short_desc}</p>
              )}

              {/* Shopee */}
              {product.shopee_url && (
                <a href={product.shopee_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3.5 mb-6 rounded-full font-medium text-white text-sm transition-opacity hover:opacity-90"
                  style={{ background: '#EE4D2D' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2C9.243 2 7 4.243 7 7H5C3.897 7 3 7.897 3 9v11c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2h-2c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3H9c0-1.654 1.346-3 3-3zm0 10c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z"/></svg>
                  前往蝦皮購買
                </a>
              )}

              {/* Features */}
              {product.features?.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-dark mb-3">產品特點</h3>
                  <ul className="space-y-2">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              <div className="flex gap-3 flex-wrap">
                <Link to="/about#contact" className="btn-primary flex-1 text-center">立即詢價</Link>
                {product.datasheet_url && (
                  <a href={product.datasheet_url} target="_blank" rel="noreferrer" className="btn-outline px-5">
                    技術文件
                  </a>
                )}
                {product.installation_url && (
                  <a href={product.installation_url} target="_blank" rel="noreferrer" className="btn-outline px-5">
                    施工說明
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description & Applications */}
          {(product.description || product.applications?.length > 0) && (
            <div className="mt-16 pt-10 border-t border-gray-100 grid md:grid-cols-2 gap-10">
              {product.description && (
                <div>
                  <h2 className="text-xl font-semibold text-dark mb-4 tracking-tight">詳細說明</h2>
                  <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">{product.description}</div>
                </div>
              )}
              {product.applications?.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold text-dark mb-4 tracking-tight">適用場景</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {product.applications.map((a, i) => (
                      <div key={i} className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-gray-100">
            <Link to="/products" className="text-sm text-primary hover:text-primary-dark transition-colors">
              ‹ 返回產品目錄
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
