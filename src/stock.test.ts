import { describe, expect, it } from 'vitest'
import {
  STOCK_STORAGE_KEY,
  addStockProduct,
  adjustStockQuantity,
  filterStockProducts,
  loadStock,
  parseStockJson,
  removeStockProduct,
  saveStock,
  updateStockProduct,
  type StockProduct,
  type StockProductInput,
} from './stock'
import {
  STOCK_CATEGORIES,
  STOCK_CATEGORY_IMAGE,
  STOCK_SUB_CATEGORIES,
  STOCK_UNIT_LABELS,
} from './stock-options'
import { createInitialStock } from './stock-catalog'

const sampleProduct: StockProductInput = {
  name: 'Café en grano',
  category: 'Refrescos',
  subCategory: '',
  quantity: 2,
  unit: 'g',
  minimumQuantity: 3,
  location: 'Almacén seco',
  defaultImage: STOCK_CATEGORY_IMAGE.Refrescos,
  counted: true,
}

const sampleStock: StockProduct[] = [
  { ...sampleProduct, id: 1, updatedAt: '2026-10-20T08:00:00.000Z' },
  {
    ...sampleProduct,
    name: 'Agua mineral',
    quantity: 0,
    unit: 'cajas',
    minimumQuantity: 2,
    location: 'Cámara de bebidas',
    id: 2,
    updatedAt: '2026-10-20T08:00:00.000Z',
  },
  {
    ...sampleProduct,
    name: 'Vajilla',
    category: 'Menaje',
    subCategory: 'Vajilla',
    quantity: 8,
    minimumQuantity: 2,
    unit: 'L',
    location: 'Cuarto de limpieza',
    id: 3,
    updatedAt: '2026-10-20T08:00:00.000Z',
  },
]

describe('stock persistence and validation', () => {
  it('provides readable labels for inventory units', () => {
    expect([
      STOCK_UNIT_LABELS['ud.'],
      STOCK_UNIT_LABELS.g,
      STOCK_UNIT_LABELS.L,
      STOCK_UNIT_LABELS.cajas,
    ]).toEqual(['unidades', 'gramos', 'litros', 'cajas'])
    expect(STOCK_CATEGORIES).toEqual([
      'Vinos', 'Licores', 'Cervezas', 'Destilados', 'Refrescos', 'Alimentos', 'Menaje', 'Otros',
    ])
    expect(STOCK_SUB_CATEGORIES.Vinos).toEqual(['Tinto', 'Blanco', 'Rosado', 'Espumoso'])
  })

  it('loads an empty stock list by default and persists changes', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }

    expect(loadStock(storage)).toEqual([])
    saveStock(storage, sampleStock)
    expect(values.has(STOCK_STORAGE_KEY)).toBe(true)
    expect(loadStock(storage)).toEqual(sampleStock)
  })

  it('rejects invalid product data and duplicate identifiers', () => {
    expect(() => parseStockJson('[{"id":1}]')).toThrow('formato válido')
    expect(() => parseStockJson(JSON.stringify([
      sampleStock[0],
      { ...sampleStock[0], name: 'Otro producto' },
    ]))).toThrow('identificadores')
    expect(() => addStockProduct([], { ...sampleProduct, quantity: -1 })).toThrow('igual o mayor que cero')
    expect(() => addStockProduct([], { ...sampleProduct, name: '  ' })).toThrow('entre 1 y 80')
    expect(() => addStockProduct([], {
      ...sampleProduct,
      category: 'Vinos',
      subCategory: 'Rubia',
    })).toThrow('subcategoría')
  })

  it('creates a representative hotel restaurant catalog with uncounted zero quantities', () => {
    const initialStock = createInitialStock(new Date('2026-10-20T08:00:00.000Z'))
    expect(initialStock.length).toBeGreaterThanOrEqual(30)
    expect(new Set(initialStock.map((product) => product.category))).toEqual(new Set(STOCK_CATEGORIES))
    expect(initialStock[0]).toMatchObject({
      id: 1,
      name: 'Pan blanco',
      quantity: 0,
      counted: false,
      defaultImage: 'stock-images/bread.svg',
    })
    expect(initialStock.every((product) => product.quantity === 0 && !product.counted)).toBe(true)
    expect(initialStock.every((product) => product.minimumQuantity > 0)).toBe(true)
  })

  it('fills new stock fields when loading a product saved by an older version', () => {
    const legacyProduct = {
      ...sampleProduct,
      category: 'Bebidas',
      unit: 'kg',
      quantity: 2,
      minimumQuantity: 3,
      subCategory: undefined,
      id: 1,
      updatedAt: '2026-10-20T08:00:00.000Z',
    }
    const parsed = parseStockJson(JSON.stringify([legacyProduct]))
    expect(parsed[0]).toMatchObject({
      counted: true,
      category: 'Refrescos',
      subCategory: '',
      unit: 'g',
      quantity: 2000,
      minimumQuantity: 3000,
      defaultImage: STOCK_CATEGORY_IMAGE.Refrescos,
    })
  })

  it('does not seed the catalog over an already-saved empty inventory', () => {
    const storage = {
      getItem: (key: string) => key === STOCK_STORAGE_KEY ? '[]' : null,
    }
    expect(loadStock(storage, createInitialStock())).toEqual([])
  })
})

describe('stock operations', () => {
  it('adds products and updates product details', () => {
    const stock = addStockProduct([], sampleProduct)
    expect(stock).toHaveLength(1)
    expect(stock[0]).toMatchObject({ id: 1, name: 'Café en grano', quantity: 2 })

    const updated = updateStockProduct(stock, 1, { ...sampleProduct, quantity: 4, minimumQuantity: 2 })
    expect(updated[0]).toMatchObject({ id: 1, quantity: 4, minimumQuantity: 2 })
    expect(() => updateStockProduct(stock, 2, sampleProduct)).toThrow('No se encontró')
  })

  it('records stock entries and exits without allowing negative stock', () => {
    expect(adjustStockQuantity(sampleStock, 1, 1)[0].quantity).toBe(3)
    expect(adjustStockQuantity(sampleStock, 1, -1)[0].quantity).toBe(1)
    expect(() => adjustStockQuantity(sampleStock, 2, -1)).toThrow('supera la cantidad disponible')
    expect(() => adjustStockQuantity(sampleStock, 1, 0)).toThrow('cantidad válida')
  })

  it('requires a physical count before recording movements for catalog items', () => {
    const uncountedStock = createInitialStock()
    expect(() => adjustStockQuantity(uncountedStock, 1, 2)).toThrow('recuento físico')
    expect(filterStockProducts(uncountedStock, '', '', 'uncounted')).toHaveLength(uncountedStock.length)
    expect(filterStockProducts(uncountedStock, '', '', 'out')).toHaveLength(0)
  })

  it('filters by category, stock status, location and accent-insensitive search', () => {
    expect(filterStockProducts(sampleStock, 'camara', '', 'all').map((product) => product.id)).toEqual([2])
    expect(filterStockProducts(sampleStock, '', 'Refrescos', 'low').map((product) => product.id)).toEqual([1])
    expect(filterStockProducts(sampleStock, '', '', 'out').map((product) => product.id)).toEqual([2])
    expect(filterStockProducts(sampleStock, 'vajilla', '', 'all').map((product) => product.id)).toEqual([3])
  })

  it('removes a product and reports missing identifiers', () => {
    expect(removeStockProduct(sampleStock, 2).map((product) => product.id)).toEqual([1, 3])
    expect(() => removeStockProduct(sampleStock, 99)).toThrow('No se encontró')
  })
})
