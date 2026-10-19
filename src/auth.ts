export type UserRole = 'admin' | 'user'

export type AppAccount = {
  username: string
  pin: string
  role: UserRole
}

export const ACCOUNTS_STORAGE_KEY = 'andy-app-accounts'

export const INITIAL_ACCOUNTS: AppAccount[] = [
  { username: 'admin', pin: '123456', role: 'admin' },
  { username: 'user', pin: '000000', role: 'user' },
]

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

export function parseAccountsJson(json: string): AppAccount[] {
  const parsed: unknown = JSON.parse(json)
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (account) =>
        account !== null &&
        typeof account === 'object' &&
        typeof account.username === 'string' &&
        /^[a-zA-Z0-9]{3,24}$/.test(account.username) &&
        isValidPin(account.pin) &&
        (account.role === 'admin' || account.role === 'user'),
    )
  ) {
    throw new Error('Los usuarios guardados no tienen un formato válido.')
  }

  const usernames = parsed.map((account) => account.username.toLocaleLowerCase())
  if (new Set(usernames).size !== usernames.length) {
    throw new Error('Hay nombres de usuario duplicados.')
  }
  const pins = parsed.map((account) => account.pin)
  if (new Set(pins).size !== pins.length) {
    throw new Error('Cada usuario debe tener un código de acceso distinto.')
  }
  if (!parsed.some((account) => account.role === 'admin')) {
    throw new Error('Debe existir al menos un usuario administrador.')
  }
  return parsed
}

export function loadAccounts(
  storage: Pick<Storage, 'getItem'>,
  initialAccounts: AppAccount[] = INITIAL_ACCOUNTS,
): AppAccount[] {
  const stored = storage.getItem(ACCOUNTS_STORAGE_KEY)
  return stored === null ? initialAccounts.map((account) => ({ ...account })) : parseAccountsJson(stored)
}

export function saveAccounts(storage: Pick<Storage, 'setItem'>, accounts: AppAccount[]): void {
  storage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

export function authenticate(accounts: AppAccount[], pin: string): AppAccount | null {
  if (!isValidPin(pin)) return null
  return accounts.find((account) => account.pin === pin) ?? null
}

export function addAccount(
  accounts: AppAccount[],
  username: string,
  pin: string,
  role: UserRole,
): AppAccount[] {
  const normalizedUsername = username.trim()
  if (!/^[a-zA-Z0-9]{3,24}$/.test(normalizedUsername)) {
    throw new Error('El usuario debe tener entre 3 y 24 caracteres alfanuméricos.')
  }
  if (!isValidPin(pin)) throw new Error('El PIN debe contener exactamente 6 números.')
  if (role !== 'admin' && role !== 'user') throw new Error('El rol seleccionado no es válido.')
  if (accounts.some((account) => account.username.toLocaleLowerCase() === normalizedUsername.toLocaleLowerCase())) {
    throw new Error('Ese nombre de usuario ya existe.')
  }
  if (accounts.some((account) => account.pin === pin)) {
    throw new Error('Ese código ya está asignado a otra cuenta.')
  }
  return [...accounts, { username: normalizedUsername, pin, role }]
}

export function updateAccountRole(accounts: AppAccount[], username: string, role: UserRole): AppAccount[] {
  const account = accounts.find((item) => item.username === username)
  if (!account) throw new Error('No se encontró el usuario.')
  if (role !== 'admin' && role !== 'user') throw new Error('El rol seleccionado no es válido.')
  if (account.role === 'admin' && role === 'user' && accounts.filter((item) => item.role === 'admin').length === 1) {
    throw new Error('Debe quedar al menos un usuario administrador.')
  }
  return accounts.map((item) => item.username === username ? { ...item, role } : item)
}

export function removeAccount(accounts: AppAccount[], username: string): AppAccount[] {
  const account = accounts.find((item) => item.username === username)
  if (!account) throw new Error('No se encontró el usuario.')
  if (account.role === 'admin' && accounts.filter((item) => item.role === 'admin').length === 1) {
    throw new Error('No se puede eliminar el último usuario administrador.')
  }
  return accounts.filter((item) => item.username !== username)
}
