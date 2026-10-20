import type { StockProduct } from './stock'

type CatalogProduct = Omit<StockProduct, 'id' | 'updatedAt' | 'counted'>

const HOTEL_RESTAURANT_CATALOG: CatalogProduct[] = [
  { name: 'Pan blanco', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Panadería', defaultImage: 'stock-images/bread.svg' },
  { name: 'Pan integral', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 2, location: 'Panadería', defaultImage: 'stock-images/wholemeal-bread.svg' },
  { name: 'Baguette', category: 'Alimentos', quantity: 0, unit: 'ud.', minimumQuantity: 12, location: 'Panadería', defaultImage: 'stock-images/baguette.svg' },
  { name: 'Croissants', category: 'Alimentos', quantity: 0, unit: 'ud.', minimumQuantity: 12, location: 'Panadería', defaultImage: 'stock-images/croissant.svg' },
  { name: 'Mantequilla', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 2, location: 'Cámara de lácteos', defaultImage: 'stock-images/butter.svg' },
  { name: 'Mermelada surtida', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 2, location: 'Almacén seco', defaultImage: 'stock-images/jam.svg' },
  { name: 'Queso', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Cámara de lácteos', defaultImage: 'stock-images/cheese.svg' },
  { name: 'Jamón cocido', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Cámara de frío', defaultImage: 'stock-images/ham.svg' },
  { name: 'Huevos', category: 'Alimentos', quantity: 0, unit: 'ud.', minimumQuantity: 60, location: 'Cámara de frío', defaultImage: 'stock-images/eggs.svg' },
  { name: 'Bacon', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Cámara de frío', defaultImage: 'stock-images/bacon.svg' },
  { name: 'Yogur natural', category: 'Alimentos', quantity: 0, unit: 'ud.', minimumQuantity: 24, location: 'Cámara de lácteos', defaultImage: 'stock-images/yogurt.svg' },
  { name: 'Cereales', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Almacén seco', defaultImage: 'stock-images/cereal.svg' },
  { name: 'Fruta de temporada', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 8, location: 'Cámara de frutas', defaultImage: 'stock-images/fruit.svg' },
  { name: 'Tomate', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 4, location: 'Cámara de verduras', defaultImage: 'stock-images/tomato.svg' },
  { name: 'Lechuga', category: 'Alimentos', quantity: 0, unit: 'ud.', minimumQuantity: 8, location: 'Cámara de verduras', defaultImage: 'stock-images/lettuce.svg' },
  { name: 'Leche', category: 'Bebidas', quantity: 0, unit: 'L', minimumQuantity: 12, location: 'Cámara de lácteos', defaultImage: 'stock-images/milk.svg' },
  { name: 'Zumo de naranja', category: 'Bebidas', quantity: 0, unit: 'L', minimumQuantity: 8, location: 'Cámara de bebidas', defaultImage: 'stock-images/orange-juice.svg' },
  { name: 'Café', category: 'Bebidas', quantity: 0, unit: 'kg', minimumQuantity: 2, location: 'Almacén seco', defaultImage: 'stock-images/coffee.svg' },
  { name: 'Té e infusiones', category: 'Bebidas', quantity: 0, unit: 'cajas', minimumQuantity: 2, location: 'Almacén seco', defaultImage: 'stock-images/tea.svg' },
  { name: 'Agua mineral', category: 'Bebidas', quantity: 0, unit: 'cajas', minimumQuantity: 6, location: 'Almacén de bebidas', defaultImage: 'stock-images/water.svg' },
  { name: 'Aceite de oliva', category: 'Alimentos', quantity: 0, unit: 'L', minimumQuantity: 3, location: 'Almacén seco', defaultImage: 'stock-images/olive-oil.svg' },
  { name: 'Arroz', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 5, location: 'Almacén seco', defaultImage: 'stock-images/rice.svg' },
  { name: 'Pasta', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 5, location: 'Almacén seco', defaultImage: 'stock-images/pasta.svg' },
  { name: 'Pollo', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 5, location: 'Cámara de carnes', defaultImage: 'stock-images/chicken.svg' },
  { name: 'Salmón', category: 'Alimentos', quantity: 0, unit: 'kg', minimumQuantity: 3, location: 'Cámara de pescado', defaultImage: 'stock-images/salmon.svg' },
]

export function createInitialStock(now = new Date()): StockProduct[] {
  const updatedAt = now.toISOString()
  return HOTEL_RESTAURANT_CATALOG.map((product, index) => ({
    ...product,
    id: index + 1,
    counted: false,
    updatedAt,
  }))
}
