export const LIBRARY_CATEGORIES = [
  'Sala',
  'Montaje de mesas',
  'Buffet',
  'Bebidas',
  'Alimentos',
  'Cócteles',
  'Quinta food',
  'Rewards',
  'Room service',
] as const

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]
