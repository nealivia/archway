import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const mainImage = product.images?.[0]

  return (
    <Link
      to={`/products/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col"
    >
      {/* Image */}
      <div className="aspect-video bg-gray-50 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        {product.category_name && (
          <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">{product.category_name}</div>
        )}
        <h3 className="font-semibold text-dark text-base leading-snug mb-2 tracking-tight">
          {product.name}
        </h3>
        {product.short_desc && (
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 flex-1">{product.short_desc}</p>
        )}
        <div className="mt-4">
          <span className="text-sm text-primary group-hover:text-primary-dark transition-colors">
            了解更多 ›
          </span>
        </div>
      </div>
    </Link>
  )
}
