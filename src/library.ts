export const LIBRARY_CATEGORIES = [
  'Sala',
  'Montaje de mesas',
  'Buffet',
  'Bebidas',
  'Cócteles',
] as const

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]

export type LibraryArticle = {
  id: string
  category: LibraryCategory
  title: string
  summary: string
  keywords: string[]
  steps: string[]
  image?: string
}

export const LIBRARY_ARTICLES: LibraryArticle[] = [
  {
    id: 'preparar-estacion-sala',
    category: 'Sala',
    title: 'Preparar la estación de camareros',
    summary: 'Organización previa para que el equipo tenga a mano lo necesario durante el servicio.',
    keywords: ['mise en place', 'estación', 'sala', 'preparación', 'servicio'],
    steps: [
      'Limpia y desinfecta la superficie siguiendo el procedimiento del establecimiento.',
      'Repón servilletas, cubiertos, bandejas y los utensilios de servicio previstos para el turno.',
      'Comprueba que la cristalería esté limpia, seca y sin daños antes de guardarla.',
      'Separa los utensilios limpios de los usados y deja libre el acceso para reponer con rapidez.',
      'Confirma con el responsable las reservas, el menú, los alérgenos y las necesidades especiales del turno.',
    ],
    image: '/images/preparar-estacion-sala.jpg',
  },
  {
    id: 'secuencia-servicio-mesa',
    category: 'Sala',
    title: 'Secuencia de atención en mesa',
    summary: 'Una pauta sencilla para mantener una atención clara, coordinada y atenta al cliente.',
    keywords: ['camareros', 'atención', 'comanda', 'mesa', 'servicio'],
    steps: [
      'Saluda, confirma el número de comensales y acompaña al grupo según la organización de la sala.',
      'Presenta la carta y explica las opciones del día; pregunta por alergias o restricciones antes de recomendar.',
      'Repite la comanda para confirmar platos, bebidas y modificaciones, y comunícala al equipo correspondiente.',
      'Sirve y retira siguiendo el protocolo del establecimiento, cuidando la seguridad y evitando interrumpir la conversación.',
      'Comprueba discretamente que todo está correcto y ofrece ayuda antes de cerrar la atención.',
    ],
    image: '/images/secuencia-servicio-mesa.jpg',
  },
  {
    id: 'montaje-mesa-desayuno',
    category: 'Montaje de mesas',
    title: 'Montaje de mesa para desayuno',
    summary: 'Presentación cómoda y ordenada para un servicio de desayuno.',
    keywords: ['desayuno', 'mesa', 'mantel', 'vajilla', 'cubiertos', 'presentación'],
    steps: [
      'Limpia y seca la mesa; coloca el mantel o los individuales alineados y sin arrugas.',
      'Sitúa el plato frente a cada silla y la servilleta limpia sobre el plato o a su lado.',
      'Coloca los cubiertos que correspondan al menú y deja la cucharilla junto a la taza.',
      'Alinea taza, vaso y elementos compartidos sin recargar el espacio individual.',
      'Revisa la simetría, la limpieza de la cristalería y que cada puesto tenga espacio suficiente.',
    ],
    image: '/images/montaje-mesa-desayuno.jpg',
  },
  {
    id: 'orden-presentacion-buffet',
    category: 'Buffet',
    title: 'Orden de presentación de un buffet',
    summary: 'Distribución orientativa para que los clientes identifiquen la oferta y avancen con fluidez.',
    keywords: ['presentación de buffet', 'buffet', 'orden', 'flujo', 'platos', 'señalización'],
    steps: [
      'Define un recorrido claro y accesible; coloca platos y cubiertos al inicio si el flujo del local lo permite.',
      'Agrupa la oferta por tipo: pan y acompañamientos, opciones frías, platos calientes, guarniciones y postres.',
      'Sitúa bebidas en una zona diferenciada cuando sea posible para reducir cruces y esperas.',
      'Identifica cada preparación y señala los alérgenos conforme a la información validada por cocina.',
      'Presenta cantidades moderadas en recipientes limpios, con pinzas o cucharones propios para cada preparación.',
      'Repón con frecuencia, mantén las superficies limpias y controla conservación y temperaturas según el plan del establecimiento.',
    ],
  },
  {
    id: 'reposicion-buffet',
    category: 'Buffet',
    title: 'Reposición y cuidado del buffet',
    summary: 'Pautas para conservar una presentación atractiva y evitar contaminación cruzada.',
    keywords: ['buffet', 'reposición', 'limpieza', 'temperatura', 'alérgenos', 'utensilios'],
    steps: [
      'Revisa visualmente la línea de buffet y retira derrames o utensilios que estén fuera de su recipiente.',
      'Sustituye las bandejas según el procedimiento aprobado; no mezcles producto nuevo con restos sin autorización.',
      'Comprueba que cada plato conserve su etiqueta y su utensilio exclusivo.',
      'Controla los registros de tiempo y temperatura definidos por el responsable de seguridad alimentaria.',
      'Comunica de inmediato cualquier falta, incidencia o posible contacto entre alimentos.',
    ],
    image: '/images/reposicion-buffet.jpg',
  },
  {
    id: 'servicio-bebidas',
    category: 'Bebidas',
    title: 'Preparación y servicio de bebidas',
    summary: 'Comprobaciones básicas para presentar bebidas con limpieza y de acuerdo con el pedido.',
    keywords: ['bebidas', 'agua', 'café', 'vasos', 'temperatura', 'servicio'],
    steps: [
      'Confirma el tipo, tamaño y temperatura solicitados antes de preparar la bebida.',
      'Escoge cristalería o taza limpia, seca y adecuada al servicio previsto.',
      'Prepara la bebida con los ingredientes y medidas establecidos por el establecimiento.',
      'Manipula vasos por la base o el tallo y evita tocar los bordes en contacto con la boca.',
      'Comprueba la presentación y entrega la bebida a la persona correcta, atendiendo cualquier alergia comunicada.',
    ],
    image: '/images/servicio-bebidas.jpg',
  },
  {
    id: 'receta-mojito',
    category: 'Cócteles',
    title: 'Receta: mojito clásico',
    summary: 'Cóctel refrescante preparado con lima, hierbabuena, ron y soda.',
    keywords: ['mojito', 'cóctel', 'ron', 'lima', 'hierbabuena', 'receta'],
    steps: [
      'Ingredientes por vaso: 50 ml de ron blanco, 25 ml de zumo de lima, 2 cucharaditas de azúcar, 8 hojas de hierbabuena, soda y hielo.',
      'Disuelve el azúcar con el zumo de lima en el vaso; presiona suavemente la hierbabuena para liberar su aroma sin triturarla.',
      'Añade el ron, llena el vaso con hielo y completa con soda.',
      'Remueve con cuidado y termina con una ramita de hierbabuena y una rodaja de lima.',
      'Sirve inmediatamente y ofrece una versión sin alcohol si el cliente la solicita.',
    ],
    image: '/images/receta-mojito.jpg',
  },
  {
    id: 'receta-gin-tonic',
    category: 'Cócteles',
    title: 'Receta: gin-tonic',
    summary: 'Preparación sencilla que conserva el gas y permite destacar los aromas de la ginebra.',
    keywords: ['gin tonic', 'ginebra', 'tónica', 'cóctel', 'receta'],
    steps: [
      'Ingredientes por vaso: 50 ml de ginebra, 150 ml de tónica bien fría, hielo abundante y una guarnición cítrica.',
      'Llena una copa limpia con hielo y remueve brevemente para enfriarla; retira el agua sobrante.',
      'Añade la ginebra y vierte la tónica despacio por el lateral para conservar las burbujas.',
      'Incorpora la guarnición indicada y mezcla una sola vez, con suavidad.',
      'Sirve de inmediato y ajusta medidas o guarnición a la receta estándar del establecimiento.',
    ],
    image: '/images/receta-gin-tonic.jpg',
  },
]

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
}

export function searchLibraryArticles(
  articles: LibraryArticle[],
  query: string,
  category: LibraryCategory | '',
): LibraryArticle[] {
  const terms = normalizeSearchText(query).trim().split(/\s+/).filter(Boolean)

  return articles.filter((article) => {
    if (category && article.category !== category) return false
    if (terms.length === 0) return true

    const searchableText = normalizeSearchText([
      article.title,
      article.category,
      article.summary,
      ...article.keywords,
      ...article.steps,
    ].join(' '))
    return terms.every((term) => searchableText.includes(term))
  })
}
