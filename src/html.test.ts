import { describe, expect, it } from 'vitest'
import { renderAppShell } from './app-shell'
import { renderLibraryArticleDetail } from './catalog-views'
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

    expect(shell).toContain('data-stock-count>Realizar control de stock</button>')
    expect(shell).toContain('id="stock-count-dialog"')
    expect(shell).toContain('id="stock-count-form"')
    expect(shell).toContain('id="stock-count-list"')
    expect(shell).toContain('Guardar control')
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
