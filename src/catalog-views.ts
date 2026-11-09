import {
  LIBRARY_CATEGORIES,
  libraryArticleImages,
  searchLibraryArticles,
  type LibraryArticle,
} from './library'
import {
  STOCK_CATEGORIES,
  STOCK_UNIT_LABELS,
  filterStockProducts,
  type StockProduct,
} from './stock'
import { escapeHtml } from './html'

type LibraryViewElements = {
  articles: HTMLDivElement | null
  search: HTMLInputElement | null
  category: HTMLSelectElement | null
  resultCount: HTMLParagraphElement | null
}

export function renderLibraryView(
  data: LibraryArticle[],
  { articles, search, category, resultCount }: LibraryViewElements,
): void {
  if (!articles || !search || !category || !resultCount) return
  const selectedCategory = LIBRARY_CATEGORIES.find((item) => item === category.value) ?? ''
  const matches = searchLibraryArticles(data, search.value, selectedCategory)
  resultCount.textContent = `${matches.length} ${matches.length === 1 ? 'guía' : 'guías'}`
  articles.innerHTML = matches.length
    ? matches.map((article) => {
        const images = libraryArticleImages(article)
        const imageCount = images.length
        return `
          <article class="library-article">
            <button class="library-article-open" type="button" data-open-library-article="${escapeHtml(article.id)}">
              ${images[0]
                ? `<img class="library-article-image" src="${escapeHtml(images[0])}" alt="" loading="lazy" decoding="async" />`
                : ''}
              <span class="library-article-heading">
                <span class="library-category">${escapeHtml(article.category)}</span>
                <span class="library-article-title">${escapeHtml(article.title)}</span>
              </span>
              <span class="library-article-summary">${escapeHtml(article.summary)}</span>
              <span class="library-article-meta">${article.steps.length} pasos · ${imageCount} ${imageCount === 1 ? 'imagen' : 'imágenes'}</span>
              <span class="library-article-link">Ver tutorial <span aria-hidden="true">→</span></span>
            </button>
          </article>
        `
      }).join('')
    : '<p class="library-empty">No se encontraron guías. Prueba otras palabras o cambia la categoría.</p>'
}

export function renderLibraryArticleDetail(article: LibraryArticle, content: HTMLDivElement): void {
  const images = libraryArticleImages(article)
  content.innerHTML = `
    <div class="library-detail-content">
      <div class="dialog-heading">
        <div>
          <p class="eyebrow">Tutorial de Biblioteca</p>
          <h2 id="library-detail-title">${escapeHtml(article.title)}</h2>
        </div>
        <button class="dialog-close" type="button" data-close-library-detail aria-label="Cerrar tutorial">×</button>
      </div>
      <span class="library-category">${escapeHtml(article.category)}</span>
      <p class="library-detail-summary">${escapeHtml(article.summary)}</p>
      ${images.length
        ? `<div class="library-detail-images" aria-label="Imágenes del tutorial">
            ${images.map((image, index) => `
              <img src="${escapeHtml(image)}" alt="${escapeHtml(article.title)} · imagen ${index + 1}" loading="lazy" decoding="async" />
            `).join('')}
          </div>`
        : ''}
      <section class="library-detail-steps" aria-labelledby="library-detail-steps-title">
        <h3 id="library-detail-steps-title">Pasos</h3>
        <ol>${article.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
      </section>
      ${article.keywords.length
        ? `<div class="library-keywords" aria-label="Palabras clave">
            ${article.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}
          </div>`
        : ''}
    </div>
  `
}

type StockViewElements = {
  list: HTMLDivElement | null
  search: HTMLInputElement | null
  category: HTMLSelectElement | null
  statusFilter: HTMLSelectElement | null
  resultCount: HTMLParagraphElement | null
  uncountedCount: HTMLElement | null
  lowCount: HTMLElement | null
  outCount: HTMLElement | null
  initialNote: HTMLParagraphElement | null
}

export function renderStockView(
  products: StockProduct[],
  isAdmin: boolean,
  {
    list,
    search,
    category,
    statusFilter,
    resultCount,
    uncountedCount,
    lowCount,
    outCount,
    initialNote,
  }: StockViewElements,
): void {
  if (!list || !search || !category || !statusFilter || !resultCount) return
  if (!isAdmin) {
    list.replaceChildren()
    if (uncountedCount) uncountedCount.textContent = '0'
    if (lowCount) lowCount.textContent = '0'
    if (outCount) outCount.textContent = '0'
    return
  }

  const uncountedStock = products.filter((product) => !product.counted).length
  const lowStock = products.filter((product) =>
    product.counted && product.quantity > 0 && product.quantity <= product.minimumQuantity,
  ).length
  const outOfStock = products.filter((product) => product.counted && product.quantity === 0).length
  if (uncountedCount) uncountedCount.textContent = String(uncountedStock)
  if (lowCount) lowCount.textContent = String(lowStock)
  if (outCount) outCount.textContent = String(outOfStock)
  if (initialNote) {
    initialNote.hidden = uncountedStock === 0
    initialNote.textContent = uncountedStock === 0
      ? ''
      : 'Catálogo inicial: las existencias están pendientes de recuento y los mínimos son orientativos. Comprueba las cantidades y ajusta los mínimos antes de usar el inventario.'
  }

  const selectedCategory = STOCK_CATEGORIES.find((item) => item === category.value) ?? ''
  const selectedStatus = (['all', 'low', 'out', 'uncounted'] as const)
    .find((item) => item === statusFilter.value) ?? 'all'
  const filteredProducts = filterStockProducts(products, search.value, selectedCategory, selectedStatus)
    .sort((first, second) =>
      first.category.localeCompare(second.category, 'es') || first.name.localeCompare(second.name, 'es'),
    )
  resultCount.textContent = `${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}`

  if (products.length === 0) {
    list.innerHTML = `
      <div class="stock-empty">
        <span aria-hidden="true">▧</span>
        <h3>El inventario está vacío</h3>
        <p>Añade tus productos, indica el stock mínimo y sube una foto para reconocerlos rápidamente.</p>
        <button class="primary-action" type="button" data-add-stock>Añadir primer producto</button>
      </div>
    `
    return
  }

  list.innerHTML = filteredProducts.length
    ? filteredProducts.map((product) => {
        const isOut = product.counted && product.quantity === 0
        const isLow = product.counted && !isOut && product.quantity <= product.minimumQuantity
        const stockState = !product.counted
          ? 'Pendiente de recuento'
          : isOut
            ? 'Agotado'
            : isLow
              ? 'Stock bajo'
              : ''
        const stateClass = !product.counted ? 'uncounted' : isOut ? 'out' : isLow ? 'low' : 'available'
        const quantity = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 })
        return `
          <article class="stock-item ${stateClass}" data-stock-card="${product.id}">
            <div class="stock-item-product">
              <div class="stock-product-photo">
                <img src="${escapeHtml(product.photo ?? `/${product.defaultImage}`)}" alt="Imagen de ${escapeHtml(product.name)}" loading="lazy" />
              </div>
              <div class="stock-product-description">
                <h3>${escapeHtml(product.name)}</h3>
                <span>${escapeHtml(product.category)}</span>
              </div>
            </div>
            <div class="stock-item-quantity">
              <strong>${product.counted
                ? `${quantity.format(product.quantity)} <span>${escapeHtml(STOCK_UNIT_LABELS[product.unit])}</span>`
                : '<span class="stock-unverified">Sin recuento</span>'}</strong>
              ${stockState && product.counted ? `<span class="stock-state ${stateClass}">${stockState}</span>` : ''}
            </div>
            <details class="stock-item-manage">
              <summary>Gestionar</summary>
              <div class="stock-item-manage-panel">
                <div class="stock-item-meta">
                  <span>Ubicación: ${escapeHtml(product.location || 'Sin indicar')}</span>
                  <span>Mínimo: ${quantity.format(product.minimumQuantity)} ${escapeHtml(STOCK_UNIT_LABELS[product.unit])}</span>
                </div>
                <div class="stock-movement-controls" aria-label="Registrar movimiento de stock de ${escapeHtml(product.name)}">
                  <label>
                    Cantidad
                    <input data-stock-adjustment type="number" min="0.001" step="0.001" value="1" aria-label="Cantidad a mover de ${escapeHtml(product.name)}" />
                  </label>

                </div>
                ${product.counted ? '' : '<small class="stock-count-required">Realiza el recuento antes de registrar movimientos.</small>'}
                <div class="stock-item-actions">
                  <button type="button" data-edit-stock="${product.id}">Editar</button>
                  <button type="button" class="admin-delete" data-delete-stock="${product.id}">Eliminar</button>
                </div>
              </div>
                </div>
              </div>
            </details>
          </article>
        `
      }).join('')
    : '<p class="stock-empty-filter">No hay productos que coincidan con esos filtros.</p>'
}
