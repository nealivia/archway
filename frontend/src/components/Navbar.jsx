import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  const links = [
    { to: '/', label: '首頁' },
    { to: '/products', label: '產品目錄' },
    { to: '/support', label: '技術支援' },
    { to: '/about', label: '關於我們' }
  ]

  return (
    <>
      {/* Top Bar */}
      <header className="sticky top-0 z-50" style={{background: 'rgba(255,255,255,0.88)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.08)'}}>
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-12 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img src="/archway_logo.png" alt="ARCHWAY" className="h-7 md:h-8 w-auto" />
            <span className="text-sm md:text-base font-semibold text-dark tracking-tight">ARCHWAY</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'}
                className={({ isActive }) =>
                  `text-xs transition-colors ${isActive ? 'text-dark font-medium' : 'text-gray-500 hover:text-dark'}`
                }>
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTA */}
          <Link to="/about#contact" className="hidden md:block text-xs font-medium text-primary hover:text-primary-dark transition-colors">
            立即洽購 ›
          </Link>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
        style={{paddingBottom: 'env(safe-area-inset-bottom)'}}>
        <div className="grid grid-cols-5">
          <NavLink to="/" end className={({ isActive }) =>
            `flex flex-col items-center py-2 pt-3 gap-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-[10px] font-medium">首頁</span>
          </NavLink>

          <NavLink to="/products" className={({ isActive }) =>
            `flex flex-col items-center py-2 pt-3 gap-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            <span className="text-[10px] font-medium">產品</span>
          </NavLink>

          <NavLink to="/support" className={({ isActive }) =>
            `flex flex-col items-center py-2 pt-3 gap-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-[10px] font-medium">技術</span>
          </NavLink>

          <NavLink to="/about" className={({ isActive }) =>
            `flex flex-col items-center py-2 pt-3 gap-0.5 ${isActive ? 'text-primary' : 'text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-[10px] font-medium">關於</span>
          </NavLink>

          <Link to="/about#contact"
            className="flex flex-col items-center py-2 pt-3 gap-0.5 text-white bg-primary">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="text-[10px] font-medium">詢價</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
