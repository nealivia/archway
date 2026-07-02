export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center max-w-md">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <img src="/archway_logo.png" alt="ARCHWAY" className="h-10 w-auto" />
          <span className="text-xl font-semibold text-dark tracking-tight">ARCHWAY</span>
        </div>

        {/* Icon */}
        <div className="w-16 h-16 bg-white rounded-2xl border border-gray-200 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        </div>

        {/* Text */}
        <div className="section-eyebrow justify-center flex">系統維護</div>
        <h1 className="text-4xl font-bold text-dark tracking-tight mb-3">網站維護中</h1>
        <p className="text-gray-500 mb-1">我們正在進行系統更新，請稍後再訪。</p>
        <p className="text-sm text-gray-400 mb-10">We'll be back shortly.</p>

        {/* Contact */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">如需協助，請聯絡我們</p>
          {[
            { href: 'tel:0223650047', icon: '📞', label: '02-2365-0047' },
            { href: 'https://line.me/R/ti/p/@archway', icon: '💬', label: 'LINE：@archway', target: '_blank' },
            { href: 'mailto:archway1991@gmail.com', icon: '✉️', label: 'archway1991@gmail.com' }
          ].map(item => (
            <a key={item.label} href={item.href}
              target={item.target} rel={item.target ? 'noopener noreferrer' : undefined}
              className="flex items-center gap-3 text-sm text-gray-500 hover:text-dark transition-colors">
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>

      </div>
    </div>
  )
}
