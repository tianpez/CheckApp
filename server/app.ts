import { timingSafeEqual } from 'node:crypto'
import express, { type ErrorRequestHandler, type Request, type RequestHandler } from 'express'
import { dateKey, parseDateKey } from '../src/calendar.ts'
import type { AppDatabase, SessionUser } from './database.ts'

const SESSION_COOKIE = 'checkapp_session'
const SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000
const failedLogins = new Map<string, { count: number; resetAt: number }>()

class HttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  const entry = header?.split(';').map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
  return entry ? entry.slice(name.length + 1) : undefined
}

function hasRequestToken(request: Request): boolean {
  const supplied = request.get('X-CheckApp-Request') ?? ''
  const expected = 'database-write'
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)
  return suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
}

function requireRequestToken(request: Request): void {
  if (!hasRequestToken(request)) throw new HttpError(403, 'Solicitud no válida.')
}

function accountFromResponse(res: express.Response): SessionUser {
  return res.locals.user as SessionUser
}

function requireAdmin(user: SessionUser): void {
  if (user.role !== 'admin') throw new HttpError(403, 'Solo un administrador puede realizar esta acción.')
}

function parseOccurrenceDate(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'La fecha de la ocurrencia no es válida.')
  try {
    parseDateKey(value)
  } catch {
    throw new HttpError(400, 'La fecha de la ocurrencia no es válida.')
  }
  return value
}

function requireAdminForPastOccurrence(user: SessionUser, occurrenceDate: string): void {
  if (occurrenceDate < dateKey(new Date())) requireAdmin(user)
}

function isRole(value: unknown): value is SessionUser['role'] {
  return value === 'admin' || value === 'user'
}

function loginAllowed(address: string): boolean {
  const attempt = failedLogins.get(address)
  if (!attempt || attempt.resetAt <= Date.now()) {
    failedLogins.delete(address)
    return true
  }
  return attempt.count < 10
}

function recordFailedLogin(address: string): void {
  const current = failedLogins.get(address)
  if (!current || current.resetAt <= Date.now()) {
    failedLogins.set(address, { count: 1, resetAt: Date.now() + 15 * 60 * 1000 })
  } else {
    current.count += 1
  }
}

export function createApp(database: AppDatabase, staticDirectory?: string) {
  const app = express()
  app.disable('x-powered-by')
  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'same-origin')
    response.setHeader('X-Frame-Options', 'DENY')
    next()
  })
  app.use(express.json({ limit: '3mb', strict: true }))

  const authenticate: RequestHandler = (request, response, next) => {
    const token = parseCookie(request.headers.cookie, SESSION_COOKIE)
    const user = token ? database.getSessionUser(token) : null
    if (!user) {
      next(new HttpError(401, 'Inicia sesión para continuar.'))
      return
    }
    response.locals.user = user
    next()
  }

  app.post('/api/auth/login', (request, response, next) => {
    try {
      requireRequestToken(request)
      const address = request.ip ?? 'unknown'
      if (!loginAllowed(address)) throw new HttpError(429, 'Demasiados intentos. Prueba de nuevo en 15 minutos.')
      const pin = typeof request.body?.pin === 'string' ? request.body.pin : ''
      const user = /^\d{6}$/.test(pin) ? database.getUserByPin(pin) : null
      if (!user) {
        recordFailedLogin(address)
        throw new HttpError(401, 'Código incorrecto. Comprueba los seis dígitos.')
      }
      failedLogins.delete(address)
      const token = database.createSession(user.username, SESSION_LIFETIME_MS)
      response.cookie(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: request.secure,
        path: '/',
        maxAge: SESSION_LIFETIME_MS,
      })
      response.json({ user })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/auth/session', (request, response) => {
    const token = parseCookie(request.headers.cookie, SESSION_COOKIE)
    response.json({ user: token ? database.getSessionUser(token) : null })
  })

  app.post('/api/auth/logout', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const token = parseCookie(request.headers.cookie, SESSION_COOKIE)
      if (token) database.deleteSession(token)
      response.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'strict', secure: request.secure, path: '/' })
      response.status(204).end()
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/bootstrap', authenticate, (_request, response) => {
    const user = accountFromResponse(response)
    response.json({
      user,
      tasks: database.getTasks(),
      library: database.getLibrary(),
      ...(user.role === 'admin'
        ? { stock: database.getStock(), accounts: database.getUsers() }
        : {}),
    })
  })

  app.get('/api/migration/status', authenticate, (_request, response) => {
    requireAdmin(accountFromResponse(response))
    response.json({ pending: database.migrationPending() })
  })

  app.post('/api/migration/local', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const user = accountFromResponse(response)
      requireAdmin(user)
      if (!database.migrationPending()) throw new HttpError(409, 'La migración local ya se completó.')
      const result = database.migrateLocal(request.body, user.username)
      response.json({ ...result, accounts: result.users })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/tasks', authenticate, (_request, response) => {
    response.json({ tasks: database.getTasks() })
  })

  app.get('/api/tasks/occurrences', authenticate, (request, response, next) => {
    try {
      const from = request.query.from
      const to = request.query.to
      if (typeof from !== 'string' || typeof to !== 'string') {
        throw new HttpError(400, 'Indica un intervalo de fechas válido.')
      }
      response.json({ tasks: database.getTaskOccurrences(from, to) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/tasks/history', authenticate, (_request, response) => {
    requireAdmin(accountFromResponse(response))
    const tasks = database.getTaskHistory().map(({ checklist: _checklist, ...task }) => task)
    response.json({ tasks })
  })

  app.put('/api/tasks', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const tasks = database.replaceTasks(request.body?.tasks, accountFromResponse(response))
      response.json({ tasks })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/tasks', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      response.status(201).json({ tasks: database.createTask(request.body?.task) })
    } catch (error) {
      next(error)
    }
  })

  app.put('/api/tasks/:id', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'El identificador de tarea no es válido.')
      response.json({ tasks: database.updateTask(id, request.body?.task) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/tasks/:id/completion', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1 || typeof request.body?.completed !== 'boolean') {
        throw new HttpError(400, 'El cambio de estado no es válido.')
      }
      const user = accountFromResponse(response)
      const occurrences = database.completeTaskOccurrence(
        id,
        dateKey(new Date()),
        request.body.completed,
        user.username,
        user.employeeName,
      )
      response.json({ tasks: occurrences, occurrences })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/tasks/:id/checklist/:stepId', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const id = Number(request.params.id)
      const stepId = Number(request.params.stepId)
      if (!Number.isInteger(id) || id < 1 || !Number.isInteger(stepId) || stepId < 1 ||
        typeof request.body?.completed !== 'boolean') {
        throw new HttpError(400, 'El cambio del paso no es válido.')
      }
      const user = accountFromResponse(response)
      const occurrences = database.updateTaskChecklistOccurrence(
        id,
        dateKey(new Date()),
        stepId,
        request.body.completed,
        user.username,
        user.employeeName,
      )
      response.json({ tasks: occurrences, occurrences })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/tasks/:id/occurrences/:date/completion', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const id = Number(request.params.id)
      const occurrenceDate = parseOccurrenceDate(request.params.date)
      if (!Number.isInteger(id) || id < 1 ||
        typeof request.body?.completed !== 'boolean') {
        throw new HttpError(400, 'El cambio de estado no es válido.')
      }
      const user = accountFromResponse(response)
      requireAdminForPastOccurrence(user, occurrenceDate)
      if (occurrenceDate < dateKey(new Date()) && !request.body.completed) {
        const occurrence = database.getTaskOccurrences(occurrenceDate, occurrenceDate)
          .find((task) => task.id === id)
        if (occurrence?.completed) {
          throw new HttpError(403, 'No se puede cambiar una tarea completada a no realizada.')
        }
      }
      response.json({
        occurrences: database.completeTaskOccurrence(
          id,
          occurrenceDate,
          request.body.completed,
          user.username,
          user.employeeName,
        ),
      })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/tasks/:id/occurrences/:date/checklist/:stepId', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const id = Number(request.params.id)
      const stepId = Number(request.params.stepId)
      const occurrenceDate = parseOccurrenceDate(request.params.date)
      if (!Number.isInteger(id) || id < 1 || !Number.isInteger(stepId) || stepId < 1 ||
        typeof request.body?.completed !== 'boolean') {
        throw new HttpError(400, 'El cambio del paso no es válido.')
      }
      const user = accountFromResponse(response)
      if (occurrenceDate < dateKey(new Date())) {
        throw new HttpError(403, 'No se pueden editar checklists de fechas pasadas.')
      }
      response.json({
        occurrences: database.updateTaskChecklistOccurrence(
          id,
          occurrenceDate,
          stepId,
          request.body.completed,
          user.username,
          user.employeeName,
        ),
      })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/tasks/:id', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'El identificador de tarea no es válido.')
      response.json({ tasks: database.deleteTask(id) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/library', authenticate, (_request, response) => {
    response.json({ articles: database.getLibrary() })
  })

  app.get('/api/stock', authenticate, (_request, response) => {
    requireAdmin(accountFromResponse(response))
    response.json({ stock: database.getStock() })
  })

  app.put('/api/stock/count', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      response.json({ stock: database.updateStockCounts(request.body?.counts) })
    } catch (error) {
      next(error)
    }
  })

  app.put('/api/stock', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      response.json({ stock: database.replaceStock(request.body?.stock) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/stock/products', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      response.status(201).json({ stock: database.createStockProduct(request.body?.product) })
    } catch (error) {
      next(error)
    }
  })

  app.put('/api/stock/products/:id', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'El identificador de producto no es válido.')
      response.json({ stock: database.updateStockProduct(id, request.body?.product) })
    } catch (error) {
      next(error)
    }
  })

  app.post('/api/stock/products/:id/movements', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const id = Number(request.params.id)
      const change = request.body?.change
      if (!Number.isInteger(id) || id < 1 || typeof change !== 'number' || !Number.isFinite(change)) {
        throw new HttpError(400, 'El movimiento de stock no es válido.')
      }
      response.json({ stock: database.adjustStockProduct(id, change) })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/stock/products/:id', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      const id = Number(request.params.id)
      if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'El identificador de producto no es válido.')
      response.json({ stock: database.deleteStockProduct(id) })
    } catch (error) {
      next(error)
    }
  })

  app.get('/api/accounts', authenticate, (_request, response) => {
    requireAdmin(accountFromResponse(response))
    response.json({ accounts: database.getUsers() })
  })

  app.post('/api/accounts', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      if (!isRole(request.body?.role) || typeof request.body?.username !== 'string' ||
        typeof request.body?.employeeName !== 'string' || typeof request.body?.pin !== 'string') {
        throw new HttpError(400, 'Los datos de la cuenta no son válidos.')
      }
      response.status(201).json({
        accounts: database.createUser(
          request.body.username,
          request.body.employeeName,
          request.body.pin,
          request.body.role,
        ),
      })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/accounts/:username/name', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      if (typeof request.body?.employeeName !== 'string') {
        throw new HttpError(400, 'El nombre del empleado no es válido.')
      }
      const username = request.params.username
      if (typeof username !== 'string') throw new HttpError(400, 'El usuario indicado no es válido.')
      response.json({ accounts: database.updateUserEmployeeName(username, request.body.employeeName) })
    } catch (error) {
      next(error)
    }
  })

  app.patch('/api/accounts/:username/role', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      requireAdmin(accountFromResponse(response))
      if (!isRole(request.body?.role)) throw new HttpError(400, 'El rol seleccionado no es válido.')
      const username = request.params.username
      if (typeof username !== 'string') throw new HttpError(400, 'El usuario indicado no es válido.')
      response.json({ accounts: database.updateUserRole(username, request.body.role) })
    } catch (error) {
      next(error)
    }
  })

  app.delete('/api/accounts/:username', authenticate, (request, response, next) => {
    try {
      requireRequestToken(request)
      const user = accountFromResponse(response)
      requireAdmin(user)
      const username = request.params.username
      if (typeof username !== 'string') throw new HttpError(400, 'El usuario indicado no es válido.')
      response.json({ accounts: database.deleteUser(username, user.username) })
    } catch (error) {
      next(error)
    }
  })

  if (staticDirectory) {
    app.use(express.static(staticDirectory, { index: false }))
    app.get(/.*/, (_request, response, next) => {
      response.sendFile('index.html', { root: staticDirectory }, (error) => {
        if (error) next(error)
      })
    })
  }

  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof HttpError) {
      response.status(error.status).json({ error: error.message })
      return
    }
    if (error instanceof SyntaxError && 'body' in error) {
      response.status(400).json({ error: 'El cuerpo de la solicitud no contiene JSON válido.' })
      return
    }
    if (error && typeof error === 'object' && 'code' in error &&
      (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY')) {
      response.status(409).json({ error: 'Ya existe un registro con esos datos.' })
      return
    }
    if (error instanceof Error && error.name === 'Error') {
      response.status(error.message.includes('No se encontró') ? 404 : 400)
        .json({ error: error.message })
      return
    }
    console.error('Error en la API de CheckApp:', error)
    response.status(500).json({ error: 'No se pudo completar la operación en la base de datos.' })
  }
  app.use(errorHandler)
  return app
}

export { SESSION_COOKIE }
