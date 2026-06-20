import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { to: '/admin', label: '儀表板', icon: '📊', end: true },
  { to: '/admin/products', label: '商品管理', icon: '📦' },
  { to: '/admin/categories', label: '分類管理', icon: '🏷️' },
  { to: '/admin/users', label: '帳號管理', icon: '👥', superOnly: true }
]

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex flex-col h-full bg-dark text-white">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <img src="/logo-horizontal.png" alt="松上防水" className="h-8 w-auto object-contain" />
            <div className="text-gray-400 text-xs mt-0.5">後台管理</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">✕</button>
        )}
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="text-sm font-medium">{user?.username}</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {user?.role === 'super_admin' ? '⭐ 超級管理員' : '管理員'}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter(i => !i.superOnly || user?.role === 'super_admin').map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded text-sm font-medium transition-colors ${
                isActive ? 'bg-primary text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded text-sm font-medium text-gray-300 hover:bg-red-900/40 hover:text-red-400 transition-colors"
        >
          <span>🚪</span> 登出
        </button>
      </div>
    </div>
  )
}
