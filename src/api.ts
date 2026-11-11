
import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

import type { UserRole } from './auth'
import type { CalendarTask } from './calendar'
import type { LibraryArticle } from './library'
import type { StockProduct } from './stock'

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '')

const SESSION_TOKEN_KEY = 'checkapp_session_token'

// Detectamos Android/iOS sin utilizar almacenamiento inseguro en web.
const isNative = Capacitor.isNativePlatform()

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

// Gestión del token exclusivamente en dispositivos nativos.
async function getSessionToken(): Promise<string | null> {
  if (!isNative) return null

  const token = await SecureStorage.get(SESSION_TOKEN_KEY, false)

  return typeof token === 'string' ? token : null
}

async function saveSessionToken(token: string): Promise<void> {
  if (!isNative) return

  await SecureStorage.set(SESSION_TOKEN_KEY, token)
}

async function removeSessionToken(): Promise<void> {
  if (!isNative) return

  await SecureStorage.remove(SESSION_TOKEN_KEY)
}

export async function apiRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const token = await getSessionToken()

  const response = await fetch(
    `${API_BASE_URL}/api${path}`,
    {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),

        ...(method === 'GET' || method === 'HEAD'
          ? {}
          : { 'X-CheckApp-Request': 'database-write' }),

        ...(isNative
          ? { 'X-CheckApp-Client': 'native' }
          : {}),

        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) }),
    },
  )

  // Si el servidor rechaza una sesión, eliminamos el token nativo.
  if (response.status === 401 && isNative) {
    await removeSessionToken()
  }

  if (response.status === 204 || response.status === 205) {
    if (isNative && path === '/auth/logout') {
      await removeSessionToken()
    }

    return undefined as T
  }

  const responseText = await response.text()

  if (!responseText.trim()) {
    if (!response.ok) {
      throw new Error(
        `El servidor respondió sin detalles (HTTP ${response.status}).`,
      )
    }

    throw new Error(
      `El servidor devolvió una respuesta vacía para ${path} (HTTP ${response.status}).`,
    )
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

  // El servidor devolverá el token únicamente a clientes nativos.
  if (
    isNative &&
    path === '/auth/login' &&
    result &&
    typeof result === 'object' &&
    'token' in result &&
    typeof result.token === 'string'
  ) {
    await saveSessionToken(result.token)
  }

  // Eliminamos el token después de cerrar sesión correctamente.
  if (isNative && path === '/auth/logout') {
    await removeSessionToken()
  }

  return result as T
}
