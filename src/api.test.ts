import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiRequest } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('apiRequest response handling', () => {
  it('returns parsed JSON from a successful response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 42 }), { status: 200 }),
    ))

    await expect(apiRequest<{ value: number }>('/bootstrap')).resolves.toEqual({ value: 42 })
  })

  it.each([204, 205])('returns undefined for an empty HTTP %i response', async (status) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status })))

    await expect(apiRequest<void>('/auth/logout', 'POST', {})).resolves.toBeUndefined()
  })

  it('reports a successful empty response without exposing a JSON parser error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 200 })))

    await expect(apiRequest('/bootstrap'))
      .rejects.toThrow('El servidor devolvió una respuesta vacía para /bootstrap (HTTP 200).')
  })

  it('reports an empty error response with its HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 502 })))

    await expect(apiRequest('/bootstrap'))
      .rejects.toThrow('El servidor respondió sin detalles (HTTP 502).')
  })

  it('reports malformed JSON without leaking the native parser error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response('{"error":', { status: 200 }),
    ))

    await expect(apiRequest('/bootstrap'))
      .rejects.toThrow('El servidor devolvió datos no válidos para /bootstrap (HTTP 200).')
  })

  it('preserves server-provided errors from valid JSON responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Inicia sesión para continuar.' }), { status: 401 }),
    ))

    await expect(apiRequest('/bootstrap')).rejects.toThrow('Inicia sesión para continuar.')
  })
})
