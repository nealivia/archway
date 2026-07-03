import { createContext, useContext, useState } from 'react'
import toast from 'react-hot-toast'

const CompareContext = createContext()

export function CompareProvider({ children }) {
  const [items, setItems] = useState([])

  const toggle = (product) => {
    setItems(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) return prev.filter(p => p.id !== product.id)
      if (prev.length >= 3) {
        toast.error('最多同時比較 3 件商品')
        return prev
      }
      // 類別檢查：第一件沒限制，之後只能加同類別
      if (prev.length > 0 && product.category_id && prev[0].category_id && product.category_id !== prev[0].category_id) {
        toast.error(`請比較同類型商品（目前為「${prev[0].category_name || '同類'}」）`)
        return prev
      }
      return [...prev, product]
    })
  }

  const clear = () => setItems([])
  const isSelected = (id) => items.some(p => p.id === id)

  return (
    <CompareContext.Provider value={{ items, toggle, clear, isSelected }}>
      {children}
    </CompareContext.Provider>
  )
}

export const useCompare = () => useContext(CompareContext)
