import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="text-gray-300 mt-auto" style={{background: 'linear-gradient(135deg, #2B1010 0%, #3D1010 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="mb-4">
              <img src="/logo-horizontal.png" alt="松上防水" className="h-10 w-auto object-contain" />
            </div>
            <p className="text-sm leading-relaxed">專注於高品質防水材料的銷售與施工，<br/>提供完整的防水工程解決方案。</p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-widest uppercase">快速連結</h4>
            <ul className="space-y-2 text-sm">
              {[['首頁', '/'], ['產品目錄', '/products'], ['關於我們', '/about']].map(([label, to]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-primary transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-widest uppercase">聯絡資訊</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span>📍</span>
                <span>台北市中正區和平西路一段136號1樓</span>
              </li>
              <li className="flex items-start gap-2">
                <span>📞</span>
                <span>02-23650047</span>
              </li>
              <li className="flex items-start gap-2">
                <span>💬</span>
                <span>LINE：@archway</span>
              </li>
              <li className="flex items-start gap-2">
                <span>✉️</span>
                <span>archway1991@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs">
          <p>© 2025 松上防水. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
