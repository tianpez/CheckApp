import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import Database from 'better-sqlite3'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import request from 'supertest'
import { createApp } from './app'
import { createDatabase, hashPin } from './database'
import { INITIAL_ACCOUNTS } from '../src/auth'
import { createChecklistSteps, dateKey } from '../src/calendar'
import { STOCK_CATEGORY_IMAGE, type StockProductInput } from '../src/stock'

describe('SQLite-backed application API', () => {
  const database = createDatabase(':memory:', new Date('2026-10-20T08:00:00.000Z'))
  const app = createApp(database)
  const admin = request.agent(app)
  const user = request.agent(app)

  beforeAll(async () => {
    await admin.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '123456' })
      .expect(200)
    await user.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '000000' })
      .expect(200)
  })

  afterAll(() => database.close())

  it('seeds tasks, hotel stock and library records in SQLite', async () => {
    const response = await admin.get('/api/bootstrap').expect(200)
    expect(response.body.tasks).toHaveLength(6)
    expect(response.body.stock).toHaveLength(25)
    expect(response.body.library).toHaveLength(8)
    expect(response.body.accounts).toEqual([
      { username: 'admin', employeeName: 'Administrador', role: 'admin' },
      { username: 'user', employeeName: 'Usuario', role: 'user' },
    ])
    expect(JSON.stringify(response.body)).not.toContain('pin_hash')
    expect(database.raw.prepare('SELECT COUNT(*) AS count FROM library_articles').get())
      .toMatchObject({ count: 8 })
  })

  it('authenticates the demo codes through the API and rejects invalid codes', async () => {
    const loginAgent = request.agent(app)
    await loginAgent.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '12345' })
      .expect(401, { error: 'Código incorrecto. Comprueba los seis dígitos.' })

    const adminLogin = await loginAgent.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '123456' })
      .expect(200)
    expect(adminLogin.body.user).toEqual({
      username: 'admin',
      employeeName: 'Administrador',
      role: 'admin',
    })
    expect(adminLogin.headers['set-cookie'][0]).toContain('HttpOnly')
    await loginAgent.get('/api/auth/session').expect(200, {
      user: { username: 'admin', employeeName: 'Administrador', role: 'admin' },
    })

    const userAgent = request.agent(app)
    const userLogin = await userAgent.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '000000' })
      .expect(200)
    expect(userLogin.body.user).toEqual({
      username: 'user',
      employeeName: 'Usuario',
      role: 'user',
    })
    await userAgent.get('/api/auth/session').expect(200, {
      user: { username: 'user', employeeName: 'Usuario', role: 'user' },
    })
  })

  it('enforces permissions on the server and lets users update task checklists only', async () => {
    await user.get('/api/stock').expect(403)
    await user.get('/api/accounts').expect(403)
    await user.put('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({ tasks: [] })
      .expect(403)
    await user.patch('/api/accounts/user/name')
      .set('X-CheckApp-Request', 'database-write')
      .send({ employeeName: 'Nombre no autorizado' })
      .expect(403)

    const today = dateKey(new Date())
    const taskResponse = await admin.post('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({
        task: {
          date: today,
          period: 'daily',
          title: 'Tarea para probar permisos',
          time: '08:00',
          status: 'Pendiente',
          completed: false,
          description: '',
          checklist: createChecklistSteps('Comprobar acceso'),
        },
      })
      .expect(201)
    const task = taskResponse.body.tasks.find((item: { title: string }) => item.title === 'Tarea para probar permisos')
    const changed = await user.patch(`/api/tasks/${task.id}/checklist/${task.checklist[0].id}`)
      .set('X-CheckApp-Request', 'database-write')
      .send({ completed: true })
      .expect(200)
    expect(changed.body.tasks.find((item: { id: number }) => item.id === task.id).checklist[0].completed)
      .toBe(true)

    await user.post('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({ task: {} })
      .expect(403)
  })

  it('assigns employee names to access codes and records the completing employee on each occurrence', async () => {
    const employee = request.agent(app)
    const created = await admin.post('/api/accounts')
      .set('X-CheckApp-Request', 'database-write')
      .send({
        username: '1042',
        employeeName: 'María López',
        pin: '456789',
        role: 'user',
      })
      .expect(201)
    expect(created.body.accounts).toContainEqual({
      username: '1042',
      employeeName: 'María López',
      role: 'user',
    })

    const renamed = await admin.patch('/api/accounts/1042/name')
      .set('X-CheckApp-Request', 'database-write')
      .send({ employeeName: 'María Ruiz' })
      .expect(200)
    expect(renamed.body.accounts).toContainEqual({
      username: '1042',
      employeeName: 'María Ruiz',
      role: 'user',
    })

    await employee.post('/api/auth/login')
      .set('X-CheckApp-Request', 'database-write')
      .send({ pin: '456789' })
      .expect(200)

    const today = dateKey(new Date())
    const taskResponse = await admin.post('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({
        task: {
          date: today,
          period: 'daily',
          title: 'Tarea de atribución',
          time: '09:00',
          status: 'Pendiente',
          completed: false,
          description: '',
          checklist: createChecklistSteps('Preparar\nRevisar'),
        },
      })
      .expect(201)
    const task = taskResponse.body.tasks.find((item: { title: string }) => item.title === 'Tarea de atribución')
    for (const step of task.checklist) {
      await employee.patch(`/api/tasks/${task.id}/occurrences/${today}/checklist/${step.id}`)
        .set('X-CheckApp-Request', 'database-write')
        .send({ completed: true })
        .expect(200)
    }

    const savedTask = database.getTaskOccurrences(today, today).find((item) => item.id === task.id)
    expect(savedTask).toMatchObject({
      completed: true,
      completedBy: '1042',
      completedByName: 'María Ruiz',
    })
    const adminView = await admin.get('/api/tasks/history').expect(200)
    expect(adminView.body.tasks.find((item: { id: number; date: string }) =>
      item.id === task.id && item.date === today))
      .toMatchObject({ completedBy: '1042', completedByName: 'María Ruiz' })
    expect(database.raw.prepare(
      'SELECT completed_by, completed_by_name FROM task_occurrences WHERE task_id = ? AND date = ?',
    ).get(task.id, today)).toEqual({ completed_by: '1042', completed_by_name: 'María Ruiz' })
  })

  it('keeps each recurrence independent and lets only admins reopen past checklists', async () => {
    const today = dateKey(new Date())
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterday = dateKey(yesterdayDate)
    const created = await admin.post('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({
        task: {
          date: yesterday,
          period: 'daily',
          title: 'Preparación recurrente',
          time: '08:00',
          status: 'Pendiente',
          completed: false,
          description: '',
          checklist: createChecklistSteps('Preparar\nVerificar'),
        },
      })
      .expect(201)
    const task = created.body.tasks.find((item: { title: string }) => item.title === 'Preparación recurrente')

    const history = await admin.get('/api/tasks/history').expect(200)
    expect(history.body.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: task.id, date: yesterday, completed: false }),
      expect.objectContaining({ id: task.id, date: today, completed: false }),
    ]))
    await user.get('/api/tasks/history').expect(403)
    await user.patch(`/api/tasks/${task.id}/occurrences/${yesterday}/checklist/1`)
      .set('X-CheckApp-Request', 'database-write')
      .send({ completed: true })
      .expect(403)

    const reopened = await admin.patch(`/api/tasks/${task.id}/occurrences/${yesterday}/checklist/1`)
      .set('X-CheckApp-Request', 'database-write')
      .send({ completed: true })
      .expect(200)
    expect(reopened.body.occurrences[0]).toMatchObject({
      id: task.id,
      date: yesterday,
      completed: false,
      checklist: [{ id: 1, completed: true }, { id: 2, completed: false }],
    })
    expect(database.getTaskOccurrences(today, today).find((item) => item.id === task.id))
      .toMatchObject({ completed: false, checklist: [{ completed: false }, { completed: false }] })
  })

  it('persists admin task and stock changes in the database', async () => {
    const taskResponse = await admin.post('/api/tasks')
      .set('X-CheckApp-Request', 'database-write')
      .send({
        task: {
          date: '2026-10-22',
          period: 'daily',
          title: 'Recuento de cámara',
          time: '08:30',
          status: 'Pendiente',
          completed: false,
          description: '',
          checklist: createChecklistSteps('Contar productos'),
        },
      })
      .expect(201)
    const createdTask = taskResponse.body.tasks.find((task: { title: string }) => task.title === 'Recuento de cámara')
    expect(createdTask.id).toBeGreaterThan(6)
    expect(database.getTasks().some((task) => task.id === createdTask.id)).toBe(true)

    const product: StockProductInput = {
      name: 'Producto de prueba',
      category: 'Bebidas',
      quantity: 4,
      unit: 'L',
      minimumQuantity: 1,
      location: 'Cámara',
      defaultImage: STOCK_CATEGORY_IMAGE.Bebidas,
      counted: true,
    }
    const stockResponse = await admin.post('/api/stock/products')
      .set('X-CheckApp-Request', 'database-write')
      .send({ product })
      .expect(201)
    const createdProduct = stockResponse.body.stock.find((item: { name: string }) => item.name === product.name)
    expect(createdProduct.quantity).toBe(4)

    const moved = await admin.post(`/api/stock/products/${createdProduct.id}/movements`)
      .set('X-CheckApp-Request', 'database-write')
      .send({ change: 2 })
      .expect(200)
    expect(moved.body.stock.find((item: { id: number }) => item.id === createdProduct.id).quantity).toBe(6)

    await admin.post(`/api/stock/products/${createdProduct.id}/movements`)
      .set('X-CheckApp-Request', 'database-write')
      .send({ change: -99 })
      .expect(400)
  })

  it('retains application data and sessions after reopening a file database', () => {
    const directory = mkdtempSync(join(tmpdir(), 'checkapp-sqlite-'))
    const path = join(directory, 'checkapp.sqlite')
    try {
      const firstDatabase = createDatabase(path, new Date('2026-10-20T08:00:00.000Z'))
      const session = firstDatabase.createSession('admin', 60_000)
      try {
        firstDatabase.replaceTasks(firstDatabase.getTasks().slice(0, 2), {
          username: 'admin',
          employeeName: 'Administrador',
          role: 'admin',
        })
        firstDatabase.replaceStock([{ ...firstDatabase.getStock()[0], counted: true }])
        firstDatabase.adjustStockProduct(firstDatabase.getStock()[0].id, 3)
      } finally {
        firstDatabase.close()
      }

      const reopenedDatabase = createDatabase(path, new Date('2026-10-20T08:00:00.000Z'))
      try {
        expect(reopenedDatabase.getTasks()).toHaveLength(2)
        expect(reopenedDatabase.getStock()[0].quantity).toBe(3)
        expect(reopenedDatabase.getSessionUser(session)).toEqual({
          username: 'admin',
          employeeName: 'Administrador',
          role: 'admin',
        })
      } finally {
        reopenedDatabase.close()
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('upgrades an existing SQLite schema without losing accounts or task completion records', () => {
    const directory = mkdtempSync(join(tmpdir(), 'checkapp-schema-'))
    const path = join(directory, 'checkapp.sqlite')
    try {
      const legacyDatabase = new Database(path)
      legacyDatabase.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          username TEXT NOT NULL COLLATE NOCASE UNIQUE,
          pin_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
        );
        CREATE TABLE tasks (
          id INTEGER PRIMARY KEY,
          date TEXT NOT NULL,
          period TEXT NOT NULL,
          title TEXT NOT NULL,
          time TEXT NOT NULL,
          status TEXT NOT NULL,
          completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
          completed_by TEXT,
          description TEXT NOT NULL,
          checklist_json TEXT NOT NULL
        );
      `)
      legacyDatabase.prepare(
        'INSERT INTO users (username, pin_hash, role) VALUES (?, ?, ?)',
      ).run('admin', hashPin('123456'), 'admin')
      legacyDatabase.prepare(`
        INSERT INTO tasks
          (id, date, period, title, time, status, completed, completed_by, description, checklist_json)
        VALUES (1, '2026-10-20', 'daily', 'Tarea anterior', '08:00', 'Listo', 1, '1042', '',
          '[{"id":1,"text":"Completar","completed":true}]')
      `).run()
      legacyDatabase.close()

      const upgradedDatabase = createDatabase(path)
      try {
        expect(upgradedDatabase.getUsers()).toContainEqual({
          username: 'admin',
          employeeName: 'admin',
          role: 'admin',
        })
        expect(upgradedDatabase.getTasks()[0]).toMatchObject({ title: 'Tarea anterior' })
        expect(upgradedDatabase.getTasks()[0].completedBy).toBeUndefined()
        expect(upgradedDatabase.getTaskHistory().find((task) => task.id === 1)).toMatchObject({
          title: 'Tarea anterior',
          completed: true,
          completedBy: '1042',
          checklist: [{ id: 1, text: 'Completar', completed: true }],
        })
        expect(upgradedDatabase.getTasks()[0].completedByName).toBeUndefined()
        expect(upgradedDatabase.raw.prepare('PRAGMA table_info(users)').all())
          .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'employee_name' })]))
        expect(upgradedDatabase.raw.prepare('PRAGMA table_info(tasks)').all())
          .toEqual(expect.arrayContaining([expect.objectContaining({ name: 'completed_by_name' })]))
      } finally {
        upgradedDatabase.close()
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('migrates browser data once and keeps an active admin session', async () => {
    const localTasks = database.getTasks()
    const localStock = database.getStock()
    const response = await admin.post('/api/migration/local')
      .set('X-CheckApp-Request', 'database-write')
      .send({ accounts: INITIAL_ACCOUNTS, tasks: localTasks, stock: localStock })
      .expect(200)
    expect(response.body.tasks).toHaveLength(localTasks.length)
    expect(response.body.stock).toHaveLength(localStock.length)
    await admin.get('/api/migration/status').expect(200, { pending: false })
    await admin.get('/api/bootstrap').expect(200)
    await admin.post('/api/migration/local')
      .set('X-CheckApp-Request', 'database-write')
      .send({ accounts: INITIAL_ACCOUNTS, tasks: localTasks, stock: localStock })
      .expect(409)
  })
})
