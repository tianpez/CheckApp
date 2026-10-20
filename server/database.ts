import { randomBytes, pbkdf2Sync, timingSafeEqual, createHash } from 'node:crypto'
import Database from 'better-sqlite3'
import {
  INITIAL_ACCOUNTS,
  parseAccountsJson,
  type AppAccount,
  type UserRole,
} from '../src/auth.ts'
import {
  createInitialTasks,
  dateKey,
  parseTasksJson,
  taskOccurrenceDates,
  updateChecklistStep as changeChecklistStep,
  updateTaskCompletion as setTaskCompletion,
  updateTaskDetails as changeTaskDetails,
  type CalendarTask,
} from '../src/calendar.ts'
import { LIBRARY_ARTICLES, type LibraryArticle } from '../src/library.ts'
import { createInitialStock } from '../src/stock-catalog.ts'
import {
  addStockProduct,
  adjustStockQuantity,
  parseStockJson,
  removeStockProduct,
  updateStockProduct,
  type StockProduct,
  type StockProductInput,
} from '../src/stock.ts'

export type PublicAccount = Pick<AppAccount, 'username' | 'employeeName' | 'role'>

export type SessionUser = PublicAccount

export type LocalMigration = {
  accounts?: unknown
  tasks?: unknown
  stock?: unknown
}

export type AppDatabase = ReturnType<typeof createDatabase>

function hashPin(pin: string, salt = randomBytes(16).toString('hex')): string {
  const hash = pbkdf2Sync(pin, salt, 210_000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

function verifyPin(pin: string, encoded: string): boolean {
  const [salt, expectedHex] = encoded.split(':')
  if (!salt || !expectedHex) return false
  const actual = pbkdf2Sync(pin, salt, 210_000, 32, 'sha256')
  const expected = Buffer.from(expectedHex, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function parseTaskList(value: unknown): CalendarTask[] {
  return parseTasksJson(JSON.stringify(value))
}

function parseStockList(value: unknown): StockProduct[] {
  return parseStockJson(JSON.stringify(value))
}

export function createDatabase(path = 'data/checkapp.sqlite', now = new Date()) {
  const database = new Database(path)
  database.pragma('foreign_keys = ON')
  database.pragma('journal_mode = WAL')
  database.pragma('busy_timeout = 5000')
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL COLLATE NOCASE UNIQUE,
      employee_name TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      period TEXT NOT NULL,
      title TEXT NOT NULL,
      time TEXT NOT NULL,
      status TEXT NOT NULL,
      completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
      completed_by TEXT,
      completed_by_name TEXT,
      description TEXT NOT NULL,
      checklist_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS task_occurrences (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      status TEXT NOT NULL,
      completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
      completed_by TEXT,
      completed_by_name TEXT,
      checklist_json TEXT NOT NULL,
      PRIMARY KEY (task_id, date)
    );
    CREATE INDEX IF NOT EXISTS task_occurrences_date ON task_occurrences(date);
    CREATE TABLE IF NOT EXISTS stock_products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      minimum_quantity REAL NOT NULL,
      location TEXT NOT NULL,
      default_image TEXT NOT NULL,
      counted INTEGER NOT NULL CHECK (counted IN (0, 1)),
      photo TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS library_articles (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      keywords_json TEXT NOT NULL,
      steps_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const userColumns = database.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>
  if (!userColumns.some((column) => column.name === 'employee_name')) {
    database.exec("ALTER TABLE users ADD COLUMN employee_name TEXT NOT NULL DEFAULT ''")
  }
  database.exec("UPDATE users SET employee_name = username WHERE employee_name = ''")
  const taskColumns = database.prepare('PRAGMA table_info(tasks)').all() as Array<{ name: string }>
  if (!taskColumns.some((column) => column.name === 'completed_by_name')) {
    database.exec('ALTER TABLE tasks ADD COLUMN completed_by_name TEXT')
  }

  database.prepare(
    "INSERT OR IGNORE INTO app_meta (key, value) VALUES ('task_occurrence_migration_done', '0')",
  ).run()

  const count = (table: string) =>
    (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count

  if (count('users') === 0) {
    const insertUser = database.prepare(
      'INSERT INTO users (username, employee_name, pin_hash, role) VALUES (?, ?, ?, ?)',
    )
    const seedUsers = database.transaction((accounts: AppAccount[]) => {
      for (const account of accounts) {
        insertUser.run(account.username, account.employeeName, hashPin(account.pin), account.role)
      }
    })
    seedUsers(INITIAL_ACCOUNTS)
  }

  if (count('tasks') === 0) insertTasks(database, createInitialTasks(now))
  if (count('stock_products') === 0) insertStock(database, createInitialStock(now))
  if (count('library_articles') === 0) insertLibrary(database, LIBRARY_ARTICLES)
  database.prepare('INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)').run('local_migration_done', '0')

  const occurrenceMigrationDone = database.prepare(
    "SELECT value FROM app_meta WHERE key = 'task_occurrence_migration_done'",
  ).pluck().get() === '1'
  if (!occurrenceMigrationDone) {
    const legacyTasks = database.prepare(`
      SELECT id, date, status, completed, completed_by, completed_by_name, checklist_json
      FROM tasks
    `).all() as Array<Record<string, unknown>>
    const migrateOccurrences = database.transaction(() => {
      const insertOccurrence = database.prepare(`
        INSERT OR IGNORE INTO task_occurrences
          (task_id, date, status, completed, completed_by, completed_by_name, checklist_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const task of legacyTasks) {
        insertOccurrence.run(
          task.id,
          task.date,
          task.status,
          task.completed,
          task.completed_by,
          task.completed_by_name,
          task.checklist_json,
        )
      }
      database.prepare(`
        UPDATE tasks SET status = 'Pendiente', completed = 0, completed_by = NULL,
          completed_by_name = NULL
      `).run()
      for (const task of legacyTasks) {
        const checklist = JSON.parse(String(task.checklist_json)) as CalendarTask['checklist']
        database.prepare('UPDATE tasks SET checklist_json = ? WHERE id = ?')
          .run(JSON.stringify(checklist.map((step) => ({ ...step, completed: false }))), task.id)
      }
      database.prepare(
        "UPDATE app_meta SET value = '1' WHERE key = 'task_occurrence_migration_done'",
      ).run()
    })
    migrateOccurrences()
  }

  const materializeThrough = dateKey(now)
  for (const task of getTaskDefinitions(database)) {
    materializeTaskOccurrences(database, task, materializeThrough)
  }

  return {
    raw: database,
    close: () => database.close(),
    getUserByPin(pin: string): SessionUser | null {
      const row = database.prepare(
        'SELECT username, employee_name, role, pin_hash FROM users',
      ).all() as Array<{ username: string; employee_name: string; role: UserRole; pin_hash: string }>
      const match = row.find((user) => verifyPin(pin, user.pin_hash))
      return match
        ? { username: match.username, employeeName: match.employee_name, role: match.role }
        : null
    },
    createSession(username: string, lifetimeMs: number) {
      const token = randomBytes(32).toString('base64url')
      database.prepare(`
        INSERT INTO sessions (token_hash, user_id, expires_at)
        SELECT ?, id, ? FROM users WHERE username = ? COLLATE NOCASE
      `).run(tokenHash(token), Date.now() + lifetimeMs, username)
      return token
    },
    getSessionUser(token: string): SessionUser | null {
      const row = database.prepare(`
        SELECT users.username, users.employee_name AS employeeName, users.role
        FROM sessions JOIN users ON users.id = sessions.user_id
        WHERE sessions.token_hash = ? AND sessions.expires_at > ?
      `).get(tokenHash(token), Date.now()) as SessionUser | undefined
      return row ?? null
    },
    deleteSession(token: string) {
      database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token))
    },
    getTasks(): CalendarTask[] {
      return getTaskDefinitions(database)
    },
    getTaskOccurrences(from: string, to: string): CalendarTask[] {
      const dates = taskOccurrenceDates({ date: from, period: 'daily' }, from, to)
      if (!dates.length) return []
      const definitions = this.getTasks()
      const materialize = database.transaction(() => {
        for (const task of definitions) {
          for (const occurrenceDate of taskOccurrenceDates(task, from, to)) {
            insertPendingOccurrence(database, task, occurrenceDate)
          }
        }
      })
      materialize()
      return getOccurrenceRows(database, from, to)
    },
    getTaskHistory(): CalendarTask[] {
      const today = dateKey(new Date())
      const definitions = this.getTasks()
      database.transaction(() => {
        for (const task of definitions) materializeTaskOccurrences(database, task, today)
      })()
      return getOccurrenceRows(database, '0001-01-01', today)
    },
    updateTaskChecklistOccurrence(
      taskId: number,
      occurrenceDate: string,
      stepId: number,
      completed: boolean,
      username: string,
      employeeName: string,
    ): CalendarTask[] {
      const occurrence = this.getTaskOccurrences(occurrenceDate, occurrenceDate)
        .find((task) => task.id === taskId)
      if (!occurrence) throw new Error('No se encontró la ocurrencia de la tarea.')
      const updated = changeChecklistStep([occurrence], taskId, stepId, completed, username, employeeName)[0]
      saveOccurrence(database, updated)
      return this.getTaskOccurrences(occurrenceDate, occurrenceDate)
    },
    completeTaskOccurrence(
      taskId: number,
      occurrenceDate: string,
      completed: boolean,
      username: string,
      employeeName: string,
    ): CalendarTask[] {
      const occurrence = this.getTaskOccurrences(occurrenceDate, occurrenceDate)
        .find((task) => task.id === taskId)
      if (!occurrence) throw new Error('No se encontró la ocurrencia de la tarea.')
      const updated = setTaskCompletion([occurrence], taskId, completed, username, employeeName)[0]
      saveOccurrence(database, updated)
      return this.getTaskOccurrences(occurrenceDate, occurrenceDate)
    },
    replaceTasks(value: unknown, user: SessionUser): CalendarTask[] {
      const nextTasks = parseTaskList(value)
      if (user.role !== 'admin') {
        throw new Error('Solo un administrador puede reemplazar la lista de tareas.')
      }
      const transaction = database.transaction(() => {
        database.prepare('DELETE FROM tasks').run()
        insertTasks(database, nextTasks)
        for (const task of nextTasks) {
          saveOccurrence(database, task)
          materializeTaskOccurrences(database, task, dateKey(new Date()))
        }
      })
      transaction()
      return this.getTasks()
    },
    createTask(value: unknown): CalendarTask[] {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La tarea no es válida.')
      const tasks = this.getTasks()
      const nextId = tasks.reduce((highest, task) => Math.max(highest, task.id), 0) + 1
      const task = parseTaskList([{ ...value, id: nextId }])[0]
      database.transaction(() => {
        insertTasks(database, [task])
        saveOccurrence(database, task)
        materializeTaskOccurrences(database, task, dateKey(new Date()))
      })()
      return this.getTasks()
    },
    updateTask(id: number, value: unknown): CalendarTask[] {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La tarea no es válida.')
      const tasks = this.getTasks()
      const current = tasks.find((task) => task.id === id)
      if (!current) throw new Error('No se encontró la tarea.')
      const details = parseTaskList([{
        ...value,
        id,
        completed: false,
        completedBy: undefined,
        completedByName: undefined,
      }])[0]
      const updated = changeTaskDetails(tasks, id, details)
      database.transaction(() => {
        const updatedTask = updated.find((task) => task.id === id)
        if (!updatedTask) throw new Error('No se encontró la tarea.')
        updateTaskRow(database, updatedTask)
        database.prepare('DELETE FROM task_occurrences WHERE task_id = ? AND date > ?')
          .run(id, dateKey(new Date()))
        materializeTaskOccurrences(database, updatedTask, dateKey(new Date()))
      })()
      return this.getTasks()
    },
    deleteTask(id: number): CalendarTask[] {
      const tasks = this.getTasks()
      if (!tasks.some((task) => task.id === id)) throw new Error('No se encontró la tarea.')
      database.prepare('DELETE FROM tasks WHERE id = ?').run(id)
      return this.getTasks()
    },
    getStock(): StockProduct[] {
      const rows = database.prepare(`
        SELECT id, name, category, quantity, unit, minimum_quantity, location,
          default_image, counted, photo, updated_at
        FROM stock_products ORDER BY name COLLATE NOCASE, id
      `).all() as Array<Record<string, unknown>>
      return rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name),
        category: row.category as StockProduct['category'],
        quantity: Number(row.quantity),
        unit: row.unit as StockProduct['unit'],
        minimumQuantity: Number(row.minimum_quantity),
        location: String(row.location),
        defaultImage: String(row.default_image),
        counted: Boolean(row.counted),
        ...(row.photo ? { photo: String(row.photo) } : {}),
        updatedAt: String(row.updated_at),
      }))
    },
    replaceStock(value: unknown): StockProduct[] {
      const stock = parseStockList(value)
      database.transaction(() => {
        database.prepare('DELETE FROM stock_products').run()
        insertStock(database, stock)
      })()
      return this.getStock()
    },
    createStockProduct(input: StockProductInput): StockProduct[] {
      const stock = addStockProduct(this.getStock(), input)
      database.transaction(() => {
        database.prepare('DELETE FROM stock_products').run()
        insertStock(database, stock)
      })()
      return this.getStock()
    },
    updateStockProduct(id: number, input: StockProductInput): StockProduct[] {
      const stock = updateStockProduct(this.getStock(), id, input)
      database.transaction(() => {
        database.prepare('DELETE FROM stock_products').run()
        insertStock(database, stock)
      })()
      return this.getStock()
    },
    adjustStockProduct(id: number, change: number): StockProduct[] {
      const stock = adjustStockQuantity(this.getStock(), id, change)
      database.transaction(() => {
        database.prepare('DELETE FROM stock_products').run()
        insertStock(database, stock)
      })()
      return this.getStock()
    },
    deleteStockProduct(id: number): StockProduct[] {
      const stock = removeStockProduct(this.getStock(), id)
      database.transaction(() => {
        database.prepare('DELETE FROM stock_products').run()
        insertStock(database, stock)
      })()
      return this.getStock()
    },
    getLibrary(): LibraryArticle[] {
      const rows = database.prepare(`
        SELECT id, category, title, summary, keywords_json, steps_json
        FROM library_articles ORDER BY category, title COLLATE NOCASE
      `).all() as Array<Record<string, unknown>>
      return rows.map((row) => ({
        id: String(row.id),
        category: String(row.category) as LibraryArticle['category'],
        title: String(row.title),
        summary: String(row.summary),
        keywords: JSON.parse(String(row.keywords_json)) as string[],
        steps: JSON.parse(String(row.steps_json)) as string[],
      }))
    },
    getUsers(): PublicAccount[] {
      return database.prepare('SELECT username, employee_name AS employeeName, role FROM users ORDER BY username COLLATE NOCASE')
        .all() as PublicAccount[]
    },
    createUser(username: string, employeeName: string, pin: string, role: UserRole): PublicAccount[] {
      const normalizedUsername = username.trim()
      const normalizedEmployeeName = employeeName.trim()
      if (!/^[a-zA-Z0-9]{3,24}$/.test(normalizedUsername)) {
        throw new Error('El usuario debe tener entre 3 y 24 caracteres alfanuméricos.')
      }
      if (!normalizedEmployeeName || normalizedEmployeeName.length > 80) {
        throw new Error('El nombre del empleado debe tener entre 1 y 80 caracteres.')
      }
      if (!/^\d{6}$/.test(pin)) throw new Error('El PIN debe contener exactamente 6 números.')
      if (role !== 'admin' && role !== 'user') throw new Error('El rol seleccionado no es válido.')
      database.prepare('INSERT INTO users (username, employee_name, pin_hash, role) VALUES (?, ?, ?, ?)')
        .run(normalizedUsername, normalizedEmployeeName, hashPin(pin), role)
      return this.getUsers()
    },
    updateUserEmployeeName(username: string, employeeName: string): PublicAccount[] {
      const normalizedEmployeeName = employeeName.trim()
      if (!normalizedEmployeeName || normalizedEmployeeName.length > 80) {
        throw new Error('El nombre del empleado debe tener entre 1 y 80 caracteres.')
      }
      const result = database.prepare(
        'UPDATE users SET employee_name = ? WHERE username = ? COLLATE NOCASE',
      ).run(normalizedEmployeeName, username)
      if (result.changes === 0) throw new Error('No se encontró el usuario.')
      return this.getUsers()
    },
    updateUserRole(username: string, role: UserRole): PublicAccount[] {
      if (role !== 'admin' && role !== 'user') throw new Error('El rol seleccionado no es válido.')
      const existing = database.prepare('SELECT role FROM users WHERE username = ? COLLATE NOCASE')
        .get(username) as { role: UserRole } | undefined
      if (!existing) throw new Error('No se encontró el usuario.')
      const administrators = count('users') - (database.prepare(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'user'",
      ).get() as { count: number }).count
      if (existing.role === 'admin' && role === 'user' && administrators === 1) {
        throw new Error('Debe quedar al menos un usuario administrador.')
      }
      database.prepare('UPDATE users SET role = ? WHERE username = ? COLLATE NOCASE').run(role, username)
      return this.getUsers()
    },
    deleteUser(username: string, activeUsername: string): PublicAccount[] {
      if (username.toLocaleLowerCase() === activeUsername.toLocaleLowerCase()) {
        throw new Error('No puedes eliminar la cuenta de la sesión actual.')
      }
      const existing = database.prepare('SELECT role FROM users WHERE username = ? COLLATE NOCASE')
        .get(username) as { role: UserRole } | undefined
      if (!existing) throw new Error('No se encontró el usuario.')
      const administrators = database.prepare(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'admin'",
      ).get() as { count: number }
      if (existing.role === 'admin' && administrators.count === 1) {
        throw new Error('No se puede eliminar el último usuario administrador.')
      }
      database.prepare('DELETE FROM users WHERE username = ? COLLATE NOCASE').run(username)
      return this.getUsers()
    },
    migrationPending(): boolean {
      return database.prepare(
        "SELECT value FROM app_meta WHERE key = 'local_migration_done'",
      ).pluck().get() === '0'
    },
    migrateLocal(value: LocalMigration, activeUsername: string) {
      const accounts = value.accounts === undefined ? undefined : parseAccountsJson(JSON.stringify(value.accounts))
      const tasks = value.tasks === undefined ? undefined : parseTaskList(value.tasks)
      const stock = value.stock === undefined ? undefined : parseStockList(value.stock)
      if (!accounts && !tasks && !stock) throw new Error('No se recibieron datos locales para migrar.')
      const existingCurrent = database.prepare(
        'SELECT id FROM users WHERE username = ? COLLATE NOCASE',
      ).get(activeUsername) as { id: number } | undefined
      if (!existingCurrent) throw new Error('No se pudo conservar la sesión administrativa durante la migración.')
      const accountsToImport = accounts?.map((account) =>
        account.username.toLocaleLowerCase() === activeUsername.toLocaleLowerCase()
          ? { ...account, role: 'admin' as const }
          : account,
      )

      const transaction = database.transaction(() => {
        if (accountsToImport) {
          const upsertUser = database.prepare(`
            INSERT INTO users (username, employee_name, pin_hash, role) VALUES (?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET employee_name = excluded.employee_name,
              pin_hash = excluded.pin_hash, role = excluded.role
          `)
          for (const account of accountsToImport) {
            upsertUser.run(account.username, account.employeeName, hashPin(account.pin), account.role)
          }
          const usernames = [...new Set([
            ...accountsToImport.map((account) => account.username),
            activeUsername,
          ])]
          const placeholders = usernames.map(() => '?').join(', ')
          database.prepare(`DELETE FROM users WHERE username NOT IN (${placeholders})`).run(...usernames)
        }
        if (tasks) {
          database.prepare('DELETE FROM tasks').run()
          insertTasks(database, tasks)
        }
        if (stock) {
          database.prepare('DELETE FROM stock_products').run()
          insertStock(database, stock)
        }
        database.prepare("UPDATE app_meta SET value = '1' WHERE key = 'local_migration_done'").run()
      })
      transaction()
      return { tasks: this.getTasks(), stock: this.getStock(), users: this.getUsers() }
    },
  }
}

function insertTasks(database: Database.Database, tasks: CalendarTask[]): void {
  const insert = database.prepare(`
    INSERT INTO tasks (id, date, period, title, time, status, completed, completed_by, completed_by_name,
      description, checklist_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const task of tasks) {
    insert.run(
      task.id,
      task.date,
      task.period,
      task.title,
      task.time,
      task.status,
      task.completed ? 1 : 0,
      task.completedBy ?? null,
      task.completedByName ?? null,
      task.description,
      JSON.stringify(task.checklist),
    )
  }
}

function getTaskDefinitions(database: Database.Database): CalendarTask[] {
  const rows = database.prepare(`
    SELECT id, date, period, title, time, status, completed, completed_by, completed_by_name,
      description, checklist_json
    FROM tasks ORDER BY date, time, id
  `).all() as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: Number(row.id),
    date: String(row.date),
    period: row.period as CalendarTask['period'],
    title: String(row.title),
    time: String(row.time),
    status: row.status as CalendarTask['status'],
    completed: Boolean(row.completed),
    ...(row.completed_by ? { completedBy: String(row.completed_by) } : {}),
    ...(row.completed_by_name ? { completedByName: String(row.completed_by_name) } : {}),
    description: String(row.description),
    checklist: JSON.parse(String(row.checklist_json)) as CalendarTask['checklist'],
  }))
}

function insertPendingOccurrence(
  database: Database.Database,
  task: CalendarTask,
  occurrenceDate: string,
): void {
  const checklist = task.checklist.map((step) => ({ ...step, completed: false }))
  database.prepare(`
    INSERT OR IGNORE INTO task_occurrences
      (task_id, date, status, completed, completed_by, completed_by_name, checklist_json)
    VALUES (?, ?, 'Pendiente', 0, NULL, NULL, ?)
  `).run(task.id, occurrenceDate, JSON.stringify(checklist))
}

function materializeTaskOccurrences(
  database: Database.Database,
  task: CalendarTask,
  through: string,
): void {
  if (task.date > through) return
  for (const occurrenceDate of taskOccurrenceDates(task, task.date, through)) {
    insertPendingOccurrence(database, task, occurrenceDate)
  }
}

function getOccurrenceRows(
  database: Database.Database,
  from: string,
  to: string,
): CalendarTask[] {
  const rows = database.prepare(`
    SELECT tasks.id, task_occurrences.date, tasks.period, tasks.title, tasks.time,
      task_occurrences.status, task_occurrences.completed, task_occurrences.completed_by,
      task_occurrences.completed_by_name, tasks.description, task_occurrences.checklist_json
    FROM task_occurrences
    JOIN tasks ON tasks.id = task_occurrences.task_id
    WHERE task_occurrences.date BETWEEN ? AND ?
    ORDER BY task_occurrences.date, tasks.time, tasks.id
  `).all(from, to) as Array<Record<string, unknown>>
  return rows.map((row) => ({
    id: Number(row.id),
    date: String(row.date),
    period: row.period as CalendarTask['period'],
    title: String(row.title),
    time: String(row.time),
    status: row.status as CalendarTask['status'],
    completed: Boolean(row.completed),
    ...(row.completed_by ? { completedBy: String(row.completed_by) } : {}),
    ...(row.completed_by_name ? { completedByName: String(row.completed_by_name) } : {}),
    description: String(row.description),
    checklist: JSON.parse(String(row.checklist_json)) as CalendarTask['checklist'],
  }))
}

function saveOccurrence(database: Database.Database, occurrence: CalendarTask): void {
  database.prepare(`
    INSERT INTO task_occurrences
      (task_id, date, status, completed, completed_by, completed_by_name, checklist_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id, date) DO UPDATE SET
      status = excluded.status,
      completed = excluded.completed,
      completed_by = excluded.completed_by,
      completed_by_name = excluded.completed_by_name,
      checklist_json = excluded.checklist_json
  `).run(
    occurrence.id,
    occurrence.date,
    occurrence.status,
    occurrence.completed ? 1 : 0,
    occurrence.completedBy ?? null,
    occurrence.completedByName ?? null,
    JSON.stringify(occurrence.checklist),
  )
}

function updateTaskRow(database: Database.Database, task: CalendarTask): void {
  database.prepare(`
    UPDATE tasks SET date = ?, period = ?, title = ?, time = ?, status = ?, completed = ?,
      completed_by = ?, completed_by_name = ?, description = ?, checklist_json = ?
    WHERE id = ?
  `).run(
    task.date,
    task.period,
    task.title,
    task.time,
    task.status,
    task.completed ? 1 : 0,
    task.completedBy ?? null,
    task.completedByName ?? null,
    task.description,
    JSON.stringify(task.checklist.map((step) => ({ ...step, completed: false }))),
    task.id,
  )
}

function insertStock(database: Database.Database, stock: StockProduct[]): void {
  const insert = database.prepare(`
    INSERT INTO stock_products
      (id, name, category, quantity, unit, minimum_quantity, location, default_image, counted, photo, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  for (const product of stock) {
    insert.run(
      product.id,
      product.name,
      product.category,
      product.quantity,
      product.unit,
      product.minimumQuantity,
      product.location,
      product.defaultImage,
      product.counted ? 1 : 0,
      product.photo ?? null,
      product.updatedAt,
    )
  }
}

function insertLibrary(database: Database.Database, articles: LibraryArticle[]): void {
  const insert = database.prepare(`
    INSERT INTO library_articles (id, category, title, summary, keywords_json, steps_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  for (const article of articles) {
    insert.run(
      article.id,
      article.category,
      article.title,
      article.summary,
      JSON.stringify(article.keywords),
      JSON.stringify(article.steps),
    )
  }
}

export { hashPin, verifyPin, tokenHash }
