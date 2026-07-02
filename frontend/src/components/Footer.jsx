import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 pb-20 md:pb-0">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <img src="/archway_logo.png" alt="ARCHWAY" className="h-7 w-auto" />
              <span className="text-sm font-semibold text-dark">ARCHWAY 松上防水</span>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">台灣專業防水建材廠商，成立於 1991 年</p>
          </div>
          <div className="flex gap-10">
            <div>
              <div className="text-xs font-medium text-dark mb-3">連結</div>
              <div className="space-y-2">
                {[['首頁', '/'], ['產品目錄', '/products'], ['關於我們', '/about']].map(([label, to]) => (
                  <Link key={to} to={to} className="block text-xs text-gray-500 hover:text-dark transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-dark mb-3">聯絡</div>
              <div className="space-y-2 text-xs text-gray-500">
                <div>02-2365-0047</div>
                <div>archway1991@gmail.com</div>
                <div>LINE：@archway</div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 text-xs text-gray-400">
          Copyright © 2024 松上防水有限公司
        </div>
      </div>
    </footer>
  )
}
