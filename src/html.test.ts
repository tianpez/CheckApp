import { describe, expect, it } from 'vitest'
import { renderAppShell } from './app-shell'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml(`<script title="test">Tom & 'Ana'</script>`))
      .toBe('&lt;script title=&quot;test&quot;&gt;Tom &amp; &#39;Ana&#39;&lt;/script&gt;')
  })

  describe('admin panel navigation', () => {
    it('renders separate tabs and corresponding panels for tasks, history and users', () => {
      const shell = renderAppShell()

      expect(shell).toContain('role="tablist" aria-label="Secciones de administración"')
      expect(shell).toContain('data-admin-tab="tasks"')
      expect(shell).toContain('data-admin-tab="history"')
      expect(shell).toContain('data-admin-tab="users"')
      expect(shell).toContain('id="admin-panel-tasks" role="tabpanel"')
      expect(shell).toContain('id="admin-panel-history" role="tabpanel"')
      expect(shell).toContain('id="admin-panel-users" role="tabpanel"')
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

  it('does not render a legacy notification region or inline confirmation handlers', () => {
    const shell = renderAppShell()

    expect(shell).not.toContain('id="task-notification"')
    expect(shell).not.toContain('onclick=')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeHtml('Preparar desayuno')).toBe('Preparar desayuno')
  })
})
