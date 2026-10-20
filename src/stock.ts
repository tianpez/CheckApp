export const STOCK_STORAGE_KEY = 'checkapp-stock'

export const STOCK_CATEGORY_IMAGE: Record<StockCategory, string> = {
  Alimentos: 'stock-images/food.svg',
  Bebidas: 'stock-images/drinks.svg',
  Limpieza: 'stock-images/cleaning.svg',
  Menaje: 'stock-images/tableware.svg',
  Otros: 'stock-images/other.svg',
}

export const STOCK_CATEGORIES = [
  'Alimentos',
  'Bebidas',
  'Limpieza',
  'Menaje',
  'Otros',
] as const

export const STOCK_UNITS = ['ud.', 'kg', 'g', 'L', 'ml', 'cajas'] as const

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  'ud.': 'unidades',
  kg: 'kilos',
  g: 'gramos',
  L: 'litros',
  ml: 'mililitros',
  cajas: 'cajas',
}

export type StockCategory = (typeof STOCK_CATEGORIES)[number]
export type StockUnit = (typeof STOCK_UNITS)[number]
export type StockStatusFilter = 'all' | 'low' | 'out' | 'uncounted'

export type StockProduct = {
  id: number
  name: string
  category: StockCategory
  quantity: number
  unit: StockUnit
  minimumQuantity: number
  location: string
  defaultImage: string
  counted: boolean
  photo?: string
  updatedAt: string
}

export type StockProductInput = Omit<StockProduct, 'id' | 'updatedAt'>

type StoredStockProduct = Omit<StockProduct, 'defaultImage' | 'counted'> &
  Partial<Pick<StockProduct, 'defaultImage' | 'counted'>>

function validateStockInput(
  input: Omit<StockProductInput, 'defaultImage' | 'counted'> &
    Partial<Pick<StockProductInput, 'defaultImage' | 'counted'>>,
): StockProductInput {
  const name = input.name.trim()
  const location = input.location.trim()
  if (!name || name.length > 80) throw new Error('El nombre debe tener entre 1 y 80 caracteres.')
  if (!STOCK_CATEGORIES.includes(input.category)) throw new Error('La categoría seleccionada no es válida.')
  if (!STOCK_UNITS.includes(input.unit)) throw new Error('La unidad seleccionada no es válida.')
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    throw new Error('La cantidad debe ser un número igual o mayor que cero.')
  }
  if (!Number.isFinite(input.minimumQuantity) || input.minimumQuantity < 0) {
    throw new Error('El stock mínimo debe ser un número igual o mayor que cero.')
  }
  if (location.length > 80) throw new Error('La ubicación no puede superar 80 caracteres.')
  if (input.photo && (!input.photo.startsWith('data:image/jpeg;base64,') || input.photo.length > 1_500_000)) {
    throw new Error('La foto debe ser una imagen JPG válida y no superar el tamaño permitido.')
  }
  const defaultImage = input.defaultImage || STOCK_CATEGORY_IMAGE[input.category]
  if (!/^stock-images\/[a-z0-9-]+\.svg$/.test(defaultImage)) {
    throw new Error('La imagen predeterminada del producto no es válida.')
  }

  return {
    name,
    category: input.category,
    quantity: input.quantity,
    unit: input.unit,
    minimumQuantity: input.minimumQuantity,
    location,
    defaultImage,
    counted: input.counted ?? true,
    ...(input.photo ? { photo: input.photo } : {}),
  }
}

function isStockProduct(value: unknown): value is StoredStockProduct {
  if (!value || typeof value !== 'object') return false
  const product = value as Partial<StockProduct>
  return (
    Number.isInteger(product.id) &&
    (product.id ?? 0) > 0 &&
    typeof product.name === 'string' &&
    STOCK_CATEGORIES.includes(product.category as StockCategory) &&
    typeof product.quantity === 'number' &&
    typeof product.unit === 'string' &&
    STOCK_UNITS.includes(product.unit as StockUnit) &&
    typeof product.minimumQuantity === 'number' &&
    typeof product.location === 'string' &&
    (product.defaultImage === undefined ||
      (typeof product.defaultImage === 'string' &&
        /^stock-images\/[a-z0-9-]+\.svg$/.test(product.defaultImage))) &&
    (product.counted === undefined || typeof product.counted === 'boolean') &&
    typeof product.updatedAt === 'string' &&
    (product.photo === undefined ||
      (typeof product.photo === 'string' &&
        product.photo.startsWith('data:image/jpeg;base64,') &&
        product.photo.length <= 1_500_000))
  )
}

export function parseStockJson(json: string): StockProduct[] {
  const parsed: unknown = JSON.parse(json)
  if (!Array.isArray(parsed) || !parsed.every(isStockProduct)) {
    throw new Error('Los datos del inventario no tienen un formato válido.')
  }
  if (parsed.some((product) => {
    try {
      validateStockInput(product)
      return false
    } catch {
      return true
    }
  })) {
    throw new Error('Los datos del inventario contienen cantidades o campos no válidos.')
  }
  const ids = parsed.map((product) => product.id)
  if (new Set(ids).size !== ids.length) {
    throw new Error('El inventario contiene identificadores de producto duplicados.')
  }
  return parsed.map((product) => ({
    ...product,
    defaultImage: product.defaultImage ?? STOCK_CATEGORY_IMAGE[product.category],
    counted: product.counted ?? true,
  }))
}

export function loadStock(
  storage: Pick<Storage, 'getItem'>,
  initialStock: StockProduct[] = [],
): StockProduct[] {
  const stored = storage.getItem(STOCK_STORAGE_KEY)
  return stored === null ? initialStock.map((product) => ({ ...product })) : parseStockJson(stored)
}

export function saveStock(storage: Pick<Storage, 'setItem'>, products: StockProduct[]): void {
  storage.setItem(STOCK_STORAGE_KEY, JSON.stringify(products))
}

export function addStockProduct(products: StockProduct[], input: StockProductInput): StockProduct[] {
  const product = validateStockInput(input)
  const nextId = products.reduce((highest, current) => Math.max(highest, current.id), 0) + 1
  return [...products, { ...product, id: nextId, updatedAt: new Date().toISOString() }]
}

export function updateStockProduct(
  products: StockProduct[],
  id: number,
  input: StockProductInput,
): StockProduct[] {
  if (!products.some((product) => product.id === id)) throw new Error('No se encontró el producto.')
  const updated = validateStockInput(input)
  return products.map((product) =>
    product.id === id ? { ...updated, id, updatedAt: new Date().toISOString() } : product,
  )
}

export function adjustStockQuantity(
  products: StockProduct[],
  id: number,
  change: number,
): StockProduct[] {
  if (!Number.isFinite(change) || change === 0) throw new Error('Indica una cantidad válida para el movimiento.')
  const product = products.find((item) => item.id === id)
  if (!product) throw new Error('No se encontró el producto.')
  if (!product.counted) throw new Error('Realiza un recuento físico antes de registrar movimientos.')
  const quantity = Math.round((product.quantity + change) * 1000) / 1000
  if (quantity < 0) throw new Error('La salida supera la cantidad disponible en stock.')
  return updateStockProduct(products, id, { ...product, quantity })
}

export function removeStockProduct(products: StockProduct[], id: number): StockProduct[] {
  if (!products.some((product) => product.id === id)) throw new Error('No se encontró el producto.')
  return products.filter((product) => product.id !== id)
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

export function filterStockProducts(
  products: StockProduct[],
  query: string,
  category: StockCategory | '',
  status: StockStatusFilter,
): StockProduct[] {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean)
  return products.filter((product) => {
    if (category && product.category !== category) return false
    if (status === 'uncounted' && product.counted) return false
    if (status === 'out' && (!product.counted || product.quantity !== 0)) return false
    if (status === 'low' &&
      (!product.counted || product.quantity === 0 || product.quantity > product.minimumQuantity)) return false
    if (terms.length === 0) return true
    const searchableText = normalizeSearchText(`${product.name} ${product.category} ${product.location} ${product.unit}`)
    return terms.every((term) => searchableText.includes(term))
  })
}
