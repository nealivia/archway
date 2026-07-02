import { createContext, useContext, useState } from 'react'

const CompareContext = createContext()

export function CompareProvider({ children }) {
  const [items, setItems] = useState([])

  const toggle = (product) => {
    setItems(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) return prev.filter(p => p.id !== product.id)
      if (prev.length >= 3) return prev // max 3
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
