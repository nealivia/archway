import { Link } from 'react-router-dom'
import { useCompare } from '../context/CompareContext'

export default function ProductCard({ product }) {
  const mainImage = product.images?.[0]
  const { toggle, isSelected } = useCompare()
  const selected = isSelected(product.id)

  return (
    <div className="group bg-white rounded-2xl overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col relative">
      {/* Compare toggle */}
      <button
        onClick={e => { e.preventDefault(); toggle(product) }}
        title={selected ? '移除比較' : '加入比較'}
        className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shadow-sm
          ${selected
            ? 'bg-primary border-primary text-white'
            : 'bg-white/90 border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100'
          }`}>
        {selected
          ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        }
      </button>

      <Link to={`/products/${product.id}`} className="flex flex-col flex-1">
        {/* Image */}
        <div className="aspect-video bg-gray-50 overflow-hidden">
          {mainImage ? (
            <img src={mainImage} alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
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
          <h3 className="font-semibold text-dark text-base leading-snug mb-2 tracking-tight">{product.name}</h3>
          {product.short_desc && (
            <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 flex-1">{product.short_desc}</p>
          )}
          <div className="mt-4">
            <span className="text-sm text-primary group-hover:text-primary-dark transition-colors">了解更多 ›</span>
          </div>
        </div>
      </Link>
    </div>
  )
}
