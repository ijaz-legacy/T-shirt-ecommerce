import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { CartItem, CustomConfig } from '../lib/types'
import type { Size } from '../lib/catalog'
import { calcCustomUnitPrice, priceForScale, getTeeColor, getFit } from '../lib/catalog'

interface CartCtx {
  items: CartItem[]
  count: number
  addPrinted: (product: {
    slug: string; name_en: string; name_ta: string
    price: number; color_en: string; color_ta: string; color_hex: string; image: string
  }, size: Size, qty?: number) => void
  addCustom: (config: CustomConfig, qty?: number) => void
  remove: (key: string) => void
  setQty: (key: string, qty: number) => void
  clear: () => void
  subtotal: number
}

const Ctx = createContext<CartCtx | null>(null)

const STORAGE_KEY = 'ijaz_cart'

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    return []
  }
}

function uid() { return Math.random().toString(36).slice(2) }

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)

  function addPrinted(product: {
    slug: string; name_en: string; name_ta: string
    price: number; color_en: string; color_ta: string; color_hex: string; image: string
  }, size: Size, qty = 1) {
    setItems(prev => [
      ...prev,
      {
        key: uid(),
        kind: 'printed',
        slug: product.slug,
        nameEn: product.name_en,
        nameTa: product.name_ta,
        size,
        colorEn: product.color_en,
        colorTa: product.color_ta,
        colorHex: product.color_hex,
        image: product.image,
        unitPrice: product.price,
        qty: Math.max(1, Math.min(10, qty)),
      },
    ])
  }

  function addCustom(config: CustomConfig, qty = 1) {
    const scales = config.placements.map(p => p.scale)
    const unitPrice = calcCustomUnitPrice(config.fit, scales)
    const color = getTeeColor(config.colorId)
    const fit = getFit(config.fit)
    setItems(prev => [
      ...prev,
      {
        key: uid(),
        kind: 'custom',
        nameEn: `${fit.nameEn} · Custom print`,
        nameTa: `${fit.nameTa} · கஸ்டம் பிரின்ட்`,
        size: config.size,
        colorEn: color.nameEn,
        colorTa: color.nameTa,
        colorHex: color.hex,
        unitPrice,
        qty: Math.max(1, Math.min(10, qty)),
        fit: config.fit,
        colorId: config.colorId,
        placements: config.placements,
      },
    ])
  }

  function remove(key: string) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function setQty(key: string, qty: number) {
    setItems(prev => prev.map(i => i.key === key ? { ...i, qty: Math.max(1, Math.min(10, qty)) } : i))
  }

  function clear() { setItems([]) }

  return (
    <Ctx.Provider value={{ items, count, addPrinted, addCustom, remove, setQty, clear, subtotal }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
