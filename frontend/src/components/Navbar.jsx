import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const links = [
    { to: '/', label: '首頁' },
    { to: '/products', label: '產品目錄' },
    { to: '/about', label: '關於我們' }
  ]

  return (
    <header className="sticky top-0 z-50" style={{background: 'rgba(255,255,255,0.88)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.08)'}}>
      <div className="max-w-5xl mx-auto px-6 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src="/archway_logo.png" alt="ARCHWAY" className="h-8 w-auto" />
          <span className="text-base font-semibold text-dark tracking-tight">ARCHWAY</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `text-xs transition-colors ${isActive ? 'text-dark font-medium' : 'text-gray-500 hover:text-dark'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <Link to="/about#contact" className="hidden md:block text-xs font-medium text-primary hover:text-primary-dark transition-colors">
          立即詢價 ›
        </Link>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-gray-600 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white/95 py-3">
          {links.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-6 py-2.5 text-sm ${isActive ? 'text-dark font-medium' : 'text-gray-500'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          <Link to="/about#contact" onClick={() => setOpen(false)} className="block px-6 py-2.5 text-sm text-primary font-medium">
            立即詢價 ›
          </Link>
        </div>
      )}
    </header>
  )
}
