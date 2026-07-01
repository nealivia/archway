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
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    <Footer /></div>
  )

  if (!product) return (
    <div className="min-h-screen flex flex-col"><Navbar />
      <div className="flex-1 flex items-center justify-center text-center">
        <div>
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-dark mb-2">找不到此商品</h2>
          <Link to="/products" className="text-primary hover:underline">返回產品目錄</Link>
        </div>
      </div>
    <Footer /></div>
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200 py-3">
        <div className="max-w-7xl mx-auto px-4 text-sm text-gray-500 flex items-center gap-2">
          <Link to="/" className="hover:text-primary">首頁</Link>
          <span>/</span>
          <Link to="/products" className="hover:text-primary">產品目錄</Link>
          <span>/</span>
          <span className="text-dark font-medium truncate">{product.name}</span>
        </div>
      </div>

      <div className="flex-1 py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12">
            {/* Images */}
            <div>
              <div className="aspect-video bg-gray-100 overflow-hidden mb-4">
                {product.images?.length > 0 ? (
                  <img
                    src={product.images[selectedImg]}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImg(i)}
                      className={`w-20 h-16 border-2 overflow-hidden transition-colors ${selectedImg === i ? 'border-primary' : 'border-gray-200 hover:border-gray-400'}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              {product.category_name && (
                <span className="text-xs font-medium text-primary border border-primary px-3 py-1 mb-4 inline-block tracking-wider uppercase">
                  {product.category_name}
                </span>
              )}
              <h1 className="text-3xl font-extrabold text-dark mt-3 mb-4">{product.name}</h1>
              {product.short_desc && (
                <p className="text-gray-600 text-lg leading-relaxed mb-6 border-l-4 border-primary pl-4">{product.short_desc}</p>
              )}

              {/* Shopee Button */}
              {product.shopee_url && (
                <a href={product.shopee_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full py-4 mb-6 rounded-sm font-bold text-white text-lg transition-opacity hover:opacity-90"
                  style={{ background: '#EE4D2D' }}>
                  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2C9.243 2 7 4.243 7 7H5C3.897 7 3 7.897 3 9v11c0 1.103.897 2 2 2h14c1.103 0 2-.897 2-2V9c0-1.103-.897-2-2-2h-2c0-2.757-2.243-5-5-5zm0 2c1.654 0 3 1.346 3 3H9c0-1.654 1.346-3 3-3zm0 10c-1.103 0-2-.897-2-2s.897-2 2-2 2 .897 2 2-.897 2-2 2z"/></svg>
                  前往蝦皮購買
                </a>
              )}

              {/* Features */}
              {product.features?.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-dark text-lg mb-4 flex items-center gap-2">
                    <span className="w-1 h-6 bg-primary inline-block"></span>
                    產品特點
                  </h3>
                  <ul className="space-y-2">
                    {product.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3 text-gray-600 text-sm">
                        <svg className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contact CTA */}
              <div className="flex gap-3">
                <Link to="/about" className="btn-primary flex-1 text-center py-3">立即詢價</Link>
                {product.datasheet_url && (
                  <a href={product.datasheet_url} target="_blank" rel="noreferrer" className="btn-outline py-3 px-5">
                    技術文件
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Description & Applications */}
          <div className="mt-16 grid md:grid-cols-2 gap-10">
            {product.description && (
              <div>
                <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
                  <span className="w-1 h-7 bg-primary inline-block"></span>
                  詳細說明
                </h2>
                <div className="text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</div>
              </div>
            )}

            {product.applications?.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-dark mb-6 flex items-center gap-2">
                  <span className="w-1 h-7 bg-primary inline-block"></span>
                  適用場景
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {product.applications.map((a, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
                      <span className="text-primary">▸</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-gray-100">
            <Link to="/products" className="text-primary hover:underline flex items-center gap-2 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
              返回產品目錄
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
