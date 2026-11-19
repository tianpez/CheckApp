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
  updateAccountEmployeeName,
  updateAccountRole,
} from './auth'

describe('local demo accounts', () => {
  it('provides the requested initial admin and user accounts', () => {
    expect(INITIAL_ACCOUNTS).toEqual([
      { username: 'admin', employeeName: 'Administrador', pin: '12345', role: 'admin' },
      { username: 'user', employeeName: 'Usuario', pin: '00000', role: 'user' },
    ])
  })

  it('accepts only five numeric PIN digits', () => {
    expect(isValidPin('12345')).toBe(true)
    expect(isValidPin('1234')).toBe(false)
    expect(isValidPin('123456')).toBe(false)
    expect(isValidPin('1234a')).toBe(false)
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
      addAccount(INITIAL_ACCOUNTS, 'manager', 'María López', '24681', 'user'),
      'manager',
      'admin',
    )

    saveAccounts(storage, configuredAccounts)

    expect(loadAccounts(storage)).toEqual(configuredAccounts)
    expect(authenticate(loadAccounts(storage), '24681')?.role).toBe('admin')
  })

  it('authenticates with the five-digit code only and rejects wrong PINs', () => {
    expect(authenticate(INITIAL_ACCOUNTS, '12345')).toEqual({
      username: 'admin',
      employeeName: 'Administrador',
      pin: '12345',
      role: 'admin',
    })
    expect(authenticate(INITIAL_ACCOUNTS, '00000')).toEqual({
      username: 'user',
      employeeName: 'Usuario',
      pin: '00000',
      role: 'user',
    })
    expect(authenticate(INITIAL_ACCOUNTS, '65432')).toBeNull()
    expect(authenticate(INITIAL_ACCOUNTS, '123456')).toBeNull()
    expect(authenticate(INITIAL_ACCOUNTS, '12a45')).toBeNull()
  })

  it('adds unique accounts with a valid five-digit PIN and selected role', () => {
    const accounts = addAccount(INITIAL_ACCOUNTS, 'supervisor', 'Ana García', '45678', 'admin')

    expect(accounts[2]).toEqual({
      username: 'supervisor',
      employeeName: 'Ana García',
      pin: '45678',
      role: 'admin',
    })
    expect(() => addAccount(accounts, 'ADMIN', 'Otro nombre', '12345', 'user')).toThrow('ya existe')
    expect(() => addAccount(accounts, 'another', 'Nombre', '1234', 'user')).toThrow('5 números')
    expect(() => addAccount(accounts, 'otheruser', 'Nombre', '45678', 'user')).toThrow('ya está asignado')
    expect(() => addAccount(accounts, 'bad name', 'Nombre', '12345', 'user')).toThrow('alfanuméricos')
    expect(() => addAccount(accounts, 'validuser', ' ', '65432', 'user')).toThrow('nombre del empleado')
    expect(updateAccountEmployeeName(accounts, 'supervisor', 'Ana Pérez')[2].employeeName).toBe('Ana Pérez')
  })

  it('allows admins to choose other admins but keeps at least one admin', () => {
    const promoted = updateAccountRole(INITIAL_ACCOUNTS, 'user', 'admin')
    expect(promoted.find((account) => account.username === 'user')?.role).toBe('admin')

    const onlyAdmin = [{ username: 'admin', employeeName: 'Admin', pin: '12345', role: 'admin' as const }]
    expect(() => updateAccountRole(onlyAdmin, 'admin', 'user')).toThrow('al menos un usuario administrador')
    expect(() => removeAccount(onlyAdmin, 'admin')).toThrow('último usuario administrador')
  })

  it('rejects malformed account data and duplicate usernames when loading', () => {
    expect(() => parseAccountsJson('[{"username":"admin","pin":"1234","role":"admin"}]')).toThrow('formato válido')
    expect(() =>
      parseAccountsJson(JSON.stringify([
        { username: 'admin', pin: '12345', role: 'admin' },
        { username: 'ADMIN', pin: '65432', role: 'user' },
      ])),
    ).toThrow('duplicados')
    expect(() =>
      parseAccountsJson(JSON.stringify([
        { username: 'admin', pin: '12345', role: 'admin' },
        { username: 'member', pin: '12345', role: 'user' },
      ])),
    ).toThrow('código de acceso distinto')
  })

  it('fills the employee name with the account id when upgrading a legacy account file', () => {
    const legacy = parseAccountsJson(JSON.stringify([
      { username: '1042', pin: '12345', role: 'admin' },
    ]))

    expect(legacy).toEqual([
      { username: '1042', employeeName: '1042', pin: '12345', role: 'admin' },
    ])
  })
})
