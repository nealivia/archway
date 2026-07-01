import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const mainImage = product.images?.[0]
  const displayImage = mainImage
    ? mainImage.startsWith('http') ? mainImage : mainImage
    : null

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white border border-gray-200 hover:border-primary hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden"
    >
      {/* Image */}
      <div className="aspect-video bg-gray-100 overflow-hidden relative">
        {displayImage ? (
          <img
            src={displayImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {product.category_name && (
          <span className="absolute top-3 left-3 bg-dark/80 text-white text-xs px-2 py-1 font-medium">
            {product.category_name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-dark text-lg leading-snug group-hover:text-primary transition-colors mb-2">
          {product.name}
        </h3>
        {product.short_desc && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 flex-1">{product.short_desc}</p>
        )}

        <div className="mt-4 flex items-center justify-between">
          {product.shopee_url ? (
            <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: '#FFF0ED', color: '#EE4D2D' }}>
              🛒 蝦皮有售
            </span>
          ) : (
            <span className="text-gray-400 text-sm">洽詢報價</span>
          )}
          <span className="text-primary text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
            了解更多
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
