import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { CompareProvider } from './context/CompareContext'
import { useState, useEffect } from 'react'
import api from './api/client'
import CompareBar from './components/CompareBar'

// 前台頁面
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import Maintenance from './pages/Maintenance'
import Compare from './pages/Compare'
import TechSupport from './pages/TechSupport'

// 後台頁面
import AdminLogin from './pages/admin/Login'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import ProductsAdmin from './pages/admin/ProductsAdmin'
import ProductForm from './pages/admin/ProductForm'
import UsersAdmin from './pages/admin/UsersAdmin'
import CategoriesAdmin from './pages/admin/CategoriesAdmin'
import ProtectedRoute from './components/admin/ProtectedRoute'

export default function App() {
  const [maintenance, setMaintenance] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // 預覽模式：網址帶 ?preview=archway1991 可跳過維護頁面
    const params = new URLSearchParams(window.location.search)
    if (params.get('preview') === 'archway1991') {
      setChecked(true)
      return
    }
    api.get('/settings/maintenance')
      .then(r => setMaintenance(r.maintenance || false))
      .catch(() => {})
      .finally(() => setChecked(true))
  }, [])

  if (!checked) return null

  // 維護模式：只開放後台路由
  if (maintenance) {
    return (
      <AuthProvider>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductsAdmin />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id/edit" element={<ProductForm />} />
            <Route path="categories" element={<CategoriesAdmin />} />
            <Route path="users" element={<UsersAdmin />} />
          </Route>
          <Route path="*" element={<Maintenance />} />
        </Routes>
      </AuthProvider>
    )
  }

  return (
    <AuthProvider>
      <CompareProvider>
      <Toaster position="top-right" />
      <CompareBar />
      <Routes>
        {/* 前台路由 */}
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/support" element={<TechSupport />} />

        {/* 後台路由 */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductsAdmin />} />
          <Route path="products/new" element={<ProductForm />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="categories" element={<CategoriesAdmin />} />
          <Route path="users" element={<UsersAdmin />} />
        </Route>
      </Routes>
      </CompareProvider>
    </AuthProvider>
  )
}
