import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { renderAppShell } from './app-shell'
import { renderLibraryArticleDetail, renderStockView } from './catalog-views'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml(`<script title="test">Tom & 'Ana'</script>`))
      .toBe('&lt;script title=&quot;test&quot;&gt;Tom &amp; &#39;Ana&#39;&lt;/script&gt;')
  })

  describe('admin panel navigation', () => {
    it('renders separate tabs and corresponding panels for tasks, history, users and library', () => {
      const shell = renderAppShell()

      expect(shell).toContain('role="tablist" aria-label="Secciones de administración"')
      expect(shell).toContain('data-admin-tab="tasks"')
      expect(shell).toContain('data-admin-tab="history"')
      expect(shell).toContain('data-admin-tab="users"')
      expect(shell).toContain('data-admin-tab="library"')
      expect(shell).toContain('id="admin-panel-tasks" role="tabpanel"')
      expect(shell).toContain('id="admin-panel-history" role="tabpanel"')
      expect(shell).toContain('id="admin-panel-users" role="tabpanel"')
      expect(shell).toContain('id="admin-panel-library" role="tabpanel"')
      expect(shell).toContain('id="library-tutorial-form"')
      expect(shell).toContain('id="library-tutorial-image"')
      expect(shell).toContain('multiple required')
      expect(shell).toContain('id="library-detail-dialog"')
      expect(shell).toContain('id="library-detail-content"')
    })
  })

  it('renders the bulk stock count action and form', () => {
    const shell = renderAppShell()

    expect(shell).not.toContain('data-show-calendar')
    expect(shell).toContain('data-stock-count>Realizar control de stock</button>')
    expect(shell).toContain('id="stock-count-dialog"')
    expect(shell).toContain('id="stock-count-form"')
    expect(shell).toContain('id="stock-count-list"')
    expect(shell).toContain('Guardar control')
  })

  it('uses the Checkflow brand assets and includes persistent eventual reminders', () => {
    const shell = renderAppShell()
    const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    const styles = readFileSync(new URL('./style.css', import.meta.url), 'utf8')

    expect(shell).toContain('src="/brand-images/checkflow-logo.png"')
    expect(shell).toContain('src="/brand-images/checkflow-ico.png"')
    expect(shell).toContain('id="eventual-reminder-panel"')
    expect(page).toContain('href="/brand-images/checkflow-ico.png"')
    expect(styles).toContain('--brand-forest: #074540')
    expect(styles).toContain('--brand-green: #288c6a')
    expect(styles).toContain('--brand-light: #b5dab8')
    expect(existsSync(new URL('../public/brand-images/checkflow-logo.png', import.meta.url))).toBe(true)
    expect(existsSync(new URL('../public/brand-images/checkflow-ico.png', import.meta.url))).toBe(true)
  })

  it('shows stock edit and delete actions without a manage dropdown', () => {
    const list = { innerHTML: '' } as HTMLDivElement
    renderStockView([{
      id: 1,
      name: 'Pan blanco',
      category: 'Alimentos',
      subCategory: 'Salados',
      quantity: 3,
      unit: 'g',
      minimumQuantity: 1,
      location: 'Almacén',
      defaultImage: 'stock-images/bread.svg',
      counted: true,
      updatedAt: '',
    }], true, {
      list,
      search: { value: '' } as HTMLInputElement,
      category: { value: '' } as HTMLSelectElement,
      statusFilter: { value: 'all' } as HTMLSelectElement,
      resultCount: { textContent: '' } as HTMLParagraphElement,
      uncountedCount: null,
      lowCount: null,
      outCount: null,
      initialNote: null,
    })

    expect(list.innerHTML).toContain('data-edit-stock="1">Editar</button>')
    expect(list.innerHTML).toContain('data-delete-stock="1">Eliminar</button>')
    expect(list.innerHTML).not.toContain('Gestionar')
    expect(list.innerHTML).not.toContain('<details')
  })

  it('renders all tutorial images and steps in the individual library detail', () => {
    const content = { innerHTML: '' } as HTMLDivElement
    renderLibraryArticleDetail({
      id: 'tutorial-1',
      category: 'Sala',
      title: 'Preparar estación',
      summary: 'Organización del servicio.',
      keywords: ['sala', 'servicio'],
      steps: ['Limpiar la superficie.', 'Reponer utensilios.'],
      images: ['/api/library/tutorial-1/image/0', '/api/library/tutorial-1/image/1'],
    }, content)

    expect(content.innerHTML.match(/<img /g)).toHaveLength(2)
    expect(content.innerHTML).toContain('Limpiar la superficie.')
    expect(content.innerHTML).toContain('Reponer utensilios.')
    expect(content.innerHTML).toContain('sala')
  })

  it('does not render a legacy notification region or inline confirmation handlers', () => {
    const shell = renderAppShell()

    expect(shell).not.toContain('id="task-notification"')
    expect(shell).not.toContain('onclick=')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeHtml('Preparar desayuno')).toBe('Preparar desayuno')
  })
})
