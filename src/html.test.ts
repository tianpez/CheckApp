import { describe, expect, it } from 'vitest'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('escapes HTML-sensitive characters', () => {
    expect(escapeHtml(`<script title="test">Tom & 'Ana'</script>`))
      .toBe('&lt;script title=&quot;test&quot;&gt;Tom &amp; &#39;Ana&#39;&lt;/script&gt;')
  })

  it('leaves ordinary text unchanged', () => {
    expect(escapeHtml('Preparar desayuno')).toBe('Preparar desayuno')
  })
})
