export const STOCK_CATEGORIES = [
  'Vinos',
  'Licores',
  'Cervezas',
  'Destilados',
  'Refrescos',
  'Alimentos',
  'Menaje',
  'Otros',
] as const

export type StockCategory = (typeof STOCK_CATEGORIES)[number]

export const STOCK_SUB_CATEGORIES: Record<StockCategory, readonly string[]> = {
  Vinos: ['Tinto', 'Blanco', 'Rosado', 'Espumoso'],
  Licores: ['Aperitivos', 'Digestivos', 'Crema de licor'],
  Cervezas: ['Rubia', 'Negra', 'Trigo', 'Artesana'],
  Destilados: ['Ginebra', 'Ron', 'Vodka', 'Whisky', 'Brandy', 'Cognac', 'Tequila', 'Otros'],
  Refrescos: [],
  Alimentos: ['Dulces', 'Salados', 'Otros'],
  Menaje: ['Vajilla', 'Cristalería', 'Cubiertos', 'Otros'],
  Otros: [],
}

export const STOCK_CATEGORY_IMAGE: Record<StockCategory, string> = {
  Vinos: 'stock-images/wine.svg',
  Licores: 'stock-images/liqueur.svg',
  Cervezas: 'stock-images/beer.svg',
  Destilados: 'stock-images/distilled.svg',
  Refrescos: 'stock-images/drinks.svg',
  Alimentos: 'stock-images/food.svg',
  Menaje: 'stock-images/tableware.svg',
  Otros: 'stock-images/other.svg',
}

export const STOCK_UNITS = ['ud.', 'g', 'L', 'cajas'] as const

export type StockUnit = (typeof STOCK_UNITS)[number]

export const STOCK_UNIT_LABELS: Record<StockUnit, string> = {
  'ud.': 'unidades',
  g: 'gramos',
  L: 'litros',
  cajas: 'cajas',
}
