
import type { UserRole } from './auth'
import type { CalendarTask } from './calendar'
import type { LibraryArticle } from './library'
import type { StockProduct } from './stock'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '')

export interface PublicAccount {
  username: string
  employeeName: string
  role: UserRole
}

export type SessionUser = PublicAccount

export interface BootstrapData {
  user: SessionUser
  tasks: CalendarTask[]
  library: LibraryArticle[]
  stock?: StockProduct[]
  accounts?: PublicAccount[]
}

export async function apiRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/api${path}`,
    {
      method,
      credentials: API_BASE_URL
        ? 'include'
        : 'same-origin',
      cache: 'no-store',
      headers: {
        ...(body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(method === 'GET' || method === 'HEAD'
          ? {}
          : { 'X-CheckApp-Request': 'database-write' }),
      },
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) }),
    },
  )

  if (response.status === 204 || response.status === 205) return undefined as T

  const responseText = await response.text()
  if (!responseText.trim()) {
    if (!response.ok) {
      throw new Error(`El servidor respondió sin detalles (HTTP ${response.status}).`)
    }
    throw new Error(`El servidor devolvió una respuesta vacía para ${path} (HTTP ${response.status}).`)
  }

  let result: unknown
  try {
    result = JSON.parse(responseText) as unknown
  } catch {
    throw new Error(
      response.ok
        ? `El servidor devolvió datos no válidos para ${path} (HTTP ${response.status}).`
        : `El servidor devolvió una respuesta no válida (HTTP ${response.status}).`,
    )
  }

  if (!response.ok) {
    const message =
      result &&
      typeof result === 'object' &&
      'error' in result &&
      typeof result.error === 'string'
        ? result.error
        : `La solicitud falló (${response.status}).`

    throw new Error(message)
  }

  return result as T
}
