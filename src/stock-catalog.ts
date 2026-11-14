import type { StockProduct } from './stock'

type CatalogProduct = Omit<StockProduct, 'id' | 'updatedAt' | 'counted'>

const HOTEL_RESTAURANT_CATALOG: CatalogProduct[] = [
  { name: 'Pan blanco', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Panadería', defaultImage: 'stock-images/bread.svg' },
  { name: 'Pan integral', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 2000, location: 'Panadería', defaultImage: 'stock-images/wholemeal-bread.svg' },
  { name: 'Baguette', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'ud.', minimumQuantity: 12, location: 'Panadería', defaultImage: 'stock-images/baguette.svg' },
  { name: 'Croissants', category: 'Alimentos', subCategory: 'Dulces', quantity: 0, unit: 'ud.', minimumQuantity: 12, location: 'Panadería', defaultImage: 'stock-images/croissant.svg' },
  { name: 'Mantequilla', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 2000, location: 'Cámara de lácteos', defaultImage: 'stock-images/butter.svg' },
  { name: 'Mermelada surtida', category: 'Alimentos', subCategory: 'Dulces', quantity: 0, unit: 'g', minimumQuantity: 2000, location: 'Almacén seco', defaultImage: 'stock-images/jam.svg' },
  { name: 'Queso', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Cámara de lácteos', defaultImage: 'stock-images/cheese.svg' },
  { name: 'Jamón cocido', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Cámara de frío', defaultImage: 'stock-images/ham.svg' },
  { name: 'Huevos', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'ud.', minimumQuantity: 60, location: 'Cámara de frío', defaultImage: 'stock-images/eggs.svg' },
  { name: 'Bacon', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Cámara de frío', defaultImage: 'stock-images/bacon.svg' },
  { name: 'Yogur natural', category: 'Alimentos', subCategory: 'Dulces', quantity: 0, unit: 'ud.', minimumQuantity: 24, location: 'Cámara de lácteos', defaultImage: 'stock-images/yogurt.svg' },
  { name: 'Cereales', category: 'Alimentos', subCategory: 'Dulces', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Almacén seco', defaultImage: 'stock-images/cereal.svg' },
  { name: 'Fruta de temporada', category: 'Alimentos', subCategory: 'Dulces', quantity: 0, unit: 'g', minimumQuantity: 8000, location: 'Cámara de frutas', defaultImage: 'stock-images/fruit.svg' },
  { name: 'Tomate', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 4000, location: 'Cámara de verduras', defaultImage: 'stock-images/tomato.svg' },
  { name: 'Lechuga', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'ud.', minimumQuantity: 8, location: 'Cámara de verduras', defaultImage: 'stock-images/lettuce.svg' },
  { name: 'Leche', category: 'Refrescos', subCategory: '', quantity: 0, unit: 'L', minimumQuantity: 12, location: 'Cámara de lácteos', defaultImage: 'stock-images/milk.svg' },
  { name: 'Zumo de naranja', category: 'Refrescos', subCategory: '', quantity: 0, unit: 'L', minimumQuantity: 8, location: 'Cámara de bebidas', defaultImage: 'stock-images/orange-juice.svg' },
  { name: 'Café', category: 'Refrescos', subCategory: '', quantity: 0, unit: 'g', minimumQuantity: 2000, location: 'Almacén seco', defaultImage: 'stock-images/coffee.svg' },
  { name: 'Té e infusiones', category: 'Refrescos', subCategory: '', quantity: 0, unit: 'cajas', minimumQuantity: 2, location: 'Almacén seco', defaultImage: 'stock-images/tea.svg' },
  { name: 'Agua mineral', category: 'Refrescos', subCategory: '', quantity: 0, unit: 'cajas', minimumQuantity: 6, location: 'Almacén de bebidas', defaultImage: 'stock-images/water.svg' },
  { name: 'Vino tinto', category: 'Vinos', subCategory: 'Tinto', quantity: 0, unit: 'ud.', minimumQuantity: 12, location: 'Almacén de bebidas', defaultImage: 'stock-images/wine.svg' },
  { name: 'Vermut', category: 'Licores', subCategory: 'Aperitivos', quantity: 0, unit: 'L', minimumQuantity: 2, location: 'Almacén de bebidas', defaultImage: 'stock-images/liqueur.svg' },
  { name: 'Cerveza rubia', category: 'Cervezas', subCategory: 'Rubia', quantity: 0, unit: 'cajas', minimumQuantity: 4, location: 'Almacén de bebidas', defaultImage: 'stock-images/beer.svg' },
  { name: 'Ginebra', category: 'Destilados', subCategory: 'Ginebra', quantity: 0, unit: 'L', minimumQuantity: 2, location: 'Almacén de bebidas', defaultImage: 'stock-images/distilled.svg' },
  { name: 'Aceite de oliva', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'L', minimumQuantity: 3, location: 'Almacén seco', defaultImage: 'stock-images/olive-oil.svg' },
  { name: 'Arroz', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 5000, location: 'Almacén seco', defaultImage: 'stock-images/rice.svg' },
  { name: 'Pasta', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 5000, location: 'Almacén seco', defaultImage: 'stock-images/pasta.svg' },
  { name: 'Pollo', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 5000, location: 'Cámara de carnes', defaultImage: 'stock-images/chicken.svg' },
  { name: 'Salmón', category: 'Alimentos', subCategory: 'Salados', quantity: 0, unit: 'g', minimumQuantity: 3000, location: 'Cámara de pescado', defaultImage: 'stock-images/salmon.svg' },
  { name: 'Platos llanos', category: 'Menaje', subCategory: 'Vajilla', quantity: 0, unit: 'ud.', minimumQuantity: 24, location: 'Almacén de menaje', defaultImage: 'stock-images/tableware.svg' },
  { name: 'Servilletas', category: 'Otros', subCategory: '', quantity: 0, unit: 'cajas', minimumQuantity: 2, location: 'Almacén seco', defaultImage: 'stock-images/other.svg' },
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
