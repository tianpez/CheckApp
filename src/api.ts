import type { UserRole } from './auth'
import type { CalendarTask } from './calendar'
import type { LibraryArticle } from './library'
import type { StockProduct } from './stock'

export type PublicAccount = {
  username: string
  employeeName: string
  role: UserRole
}

export type SessionUser = PublicAccount

export type BootstrapData = {
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
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(method === 'GET' || method === 'HEAD' ? {} : { 'X-CheckApp-Request': 'database-write' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (response.status === 204) return undefined as T
  const result: unknown = await response.json()
  if (!response.ok) {
    const message = result && typeof result === 'object' && 'error' in result &&
      typeof result.error === 'string'
      ? result.error
      : `La solicitud falló (${response.status}).`
    throw new Error(message)
  }
  return result as T
}
