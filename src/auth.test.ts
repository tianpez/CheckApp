import { describe, expect, it } from 'vitest'
import {
  ACCOUNTS_STORAGE_KEY,
  INITIAL_ACCOUNTS,
  addAccount,
  authenticate,
  isValidPin,
  loadAccounts,
  parseAccountsJson,
  removeAccount,
  saveAccounts,
  updateAccountRole,
} from './auth'

describe('local demo accounts', () => {
  it('provides the requested initial admin and user accounts', () => {
    expect(INITIAL_ACCOUNTS).toEqual([
      { username: 'admin', pin: '123456', role: 'admin' },
      { username: 'user', pin: '000000', role: 'user' },
    ])
  })

  it('accepts only six numeric PIN digits', () => {
    expect(isValidPin('123456')).toBe(true)
    expect(isValidPin('12345')).toBe(false)
    expect(isValidPin('12345a')).toBe(false)
  })

  it('loads default accounts and persists account changes', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const accounts = loadAccounts(storage)

    expect(accounts).toEqual(INITIAL_ACCOUNTS)
    saveAccounts(storage, accounts)
    expect(values.has(ACCOUNTS_STORAGE_KEY)).toBe(true)
    expect(loadAccounts(storage)).toEqual(accounts)
  })

  it('restores assigned PINs and roles on the next app load', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    }
    const configuredAccounts = updateAccountRole(
      addAccount(INITIAL_ACCOUNTS, 'manager', '246810', 'user'),
      'manager',
      'admin',
    )

    saveAccounts(storage, configuredAccounts)

    expect(loadAccounts(storage)).toEqual(configuredAccounts)
    expect(authenticate(loadAccounts(storage), '246810')?.role).toBe('admin')
  })

  it('authenticates with the six-digit code only and rejects wrong PINs', () => {
    expect(authenticate(INITIAL_ACCOUNTS, '123456')?.role).toBe('admin')
    expect(authenticate(INITIAL_ACCOUNTS, '000000')?.role).toBe('user')
    expect(authenticate(INITIAL_ACCOUNTS, '654321')).toBeNull()
    expect(authenticate(INITIAL_ACCOUNTS, 'bad')).toBeNull()
  })

  it('adds unique accounts with a valid six-digit PIN and selected role', () => {
    const accounts = addAccount(INITIAL_ACCOUNTS, 'supervisor', '456789', 'admin')

    expect(accounts[2]).toEqual({ username: 'supervisor', pin: '456789', role: 'admin' })
    expect(() => addAccount(accounts, 'ADMIN', '123456', 'user')).toThrow('ya existe')
    expect(() => addAccount(accounts, 'another', '12345', 'user')).toThrow('6 números')
    expect(() => addAccount(accounts, 'otheruser', '456789', 'user')).toThrow('ya está asignado')
    expect(() => addAccount(accounts, 'bad name', '123456', 'user')).toThrow('alfanuméricos')
  })

  it('allows admins to choose other admins but keeps at least one admin', () => {
    const promoted = updateAccountRole(INITIAL_ACCOUNTS, 'user', 'admin')
    expect(promoted.find((account) => account.username === 'user')?.role).toBe('admin')

    const onlyAdmin = [{ username: 'admin', pin: '123456', role: 'admin' as const }]
    expect(() => updateAccountRole(onlyAdmin, 'admin', 'user')).toThrow('al menos un usuario administrador')
    expect(() => removeAccount(onlyAdmin, 'admin')).toThrow('último usuario administrador')
  })

  it('rejects malformed account data and duplicate usernames when loading', () => {
    expect(() => parseAccountsJson('[{"username":"admin","pin":"12345","role":"admin"}]')).toThrow('formato válido')
    expect(() =>
      parseAccountsJson(JSON.stringify([
        { username: 'admin', pin: '123456', role: 'admin' },
        { username: 'ADMIN', pin: '654321', role: 'user' },
      ])),
    ).toThrow('duplicados')
    expect(() =>
      parseAccountsJson(JSON.stringify([
        { username: 'admin', pin: '123456', role: 'admin' },
        { username: 'member', pin: '123456', role: 'user' },
      ])),
    ).toThrow('código de acceso distinto')
  })
})
