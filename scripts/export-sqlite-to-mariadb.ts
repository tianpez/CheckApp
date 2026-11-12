import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Database from 'better-sqlite3'

type SqliteRow = Record<string, string | number | bigint | Uint8Array | null>

const sourcePath = resolve(process.argv[2] ?? process.env.CHECKAPP_DATABASE ?? 'data/checkapp.sqlite')
const outputPath = resolve(process.argv[3] ?? 'data/checkapp-mariadb.sql')

const tableDefinitions = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(24) COLLATE utf8mb4_unicode_ci NOT NULL,
    employee_name VARCHAR(80) NOT NULL,
    pin_hash VARCHAR(100) NOT NULL,
    role ENUM('admin', 'user') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY users_username (username)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash CHAR(64) NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    expires_at BIGINT NOT NULL,
    PRIMARY KEY (token_hash),
    KEY sessions_expiry (expires_at),
    CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    date CHAR(10) NOT NULL,
    period ENUM('daily', 'weekly', 'monthly', 'eventual') NOT NULL,
    title VARCHAR(120) NOT NULL,
    time CHAR(5) NOT NULL,
    status ENUM('Pendiente', 'En curso', 'Listo') NOT NULL,
    completed TINYINT(1) NOT NULL,
    completed_by VARCHAR(24) NULL,
    completed_by_name VARCHAR(80) NULL,
    description TEXT NOT NULL,
    checklist_json LONGTEXT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT tasks_completed_check CHECK (completed IN (0, 1))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS task_occurrences (
    task_id INT UNSIGNED NOT NULL,
    date CHAR(10) NOT NULL,
    status ENUM('Pendiente', 'En curso', 'Listo') NOT NULL,
    completed TINYINT(1) NOT NULL,
    completed_by VARCHAR(24) NULL,
    completed_by_name VARCHAR(80) NULL,
    checklist_json LONGTEXT NOT NULL,
    PRIMARY KEY (task_id, date),
    KEY task_occurrences_date (date),
    CONSTRAINT task_occurrences_task_fk FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT task_occurrences_completed_check CHECK (completed IN (0, 1))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS stock_products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(80) NOT NULL,
    category VARCHAR(30) NOT NULL,
    quantity DOUBLE NOT NULL,
    unit VARCHAR(10) NOT NULL,
    minimum_quantity DOUBLE NOT NULL,
    location VARCHAR(80) NOT NULL,
    default_image VARCHAR(100) NOT NULL,
    counted TINYINT(1) NOT NULL,
    photo LONGTEXT NULL,
    updated_at VARCHAR(35) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT stock_products_counted_check CHECK (counted IN (0, 1))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS library_articles (
    id VARCHAR(100) NOT NULL,
    category VARCHAR(40) NOT NULL,
    title VARCHAR(90) NOT NULL,
    summary VARCHAR(280) NOT NULL,
    keywords_json LONGTEXT NOT NULL,
    steps_json LONGTEXT NOT NULL,
    image LONGTEXT NULL,
    images_json LONGTEXT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  `CREATE TABLE IF NOT EXISTS app_meta (
    \`key\` VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    PRIMARY KEY (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
]

const insertColumns: Record<string, string[]> = {
  users: ['id', 'username', 'employee_name', 'pin_hash', 'role'],
  sessions: ['token_hash', 'user_id', 'expires_at'],
  tasks: [
    'id',
    'date',
    'period',
    'title',
    'time',
    'status',
    'completed',
    'completed_by',
    'completed_by_name',
    'description',
    'checklist_json',
  ],
  task_occurrences: [
    'task_id',
    'date',
    'status',
    'completed',
    'completed_by',
    'completed_by_name',
    'checklist_json',
  ],
  stock_products: [
    'id',
    'name',
    'category',
    'quantity',
    'unit',
    'minimum_quantity',
    'location',
    'default_image',
    'counted',
    'photo',
    'updated_at',
  ],
  library_articles: [
    'id',
    'category',
    'title',
    'summary',
    'keywords_json',
    'steps_json',
    'image',
    'images_json',
  ],
  app_meta: ['key', 'value'],
}

function quoteIdentifier(identifier: string): string {
  return `\`${identifier.replaceAll('`', '``')}\``
}

function sqlValue(value: SqliteRow[string]): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('SQLite contiene un valor numérico no válido.')
    return String(value)
  }
  if (typeof value === 'bigint') return value.toString()
  const hex = Buffer.from(value).toString('hex')
  return `CONVERT(X'${hex}' USING utf8mb4)`
}

function toMariaDbRow(table: string, row: SqliteRow): SqliteRow {
  if (table === 'users' && !('employee_name' in row)) {
    return { ...row, employee_name: row.username ?? null }
  }
  if (table === 'tasks' && !('completed_by_name' in row)) {
    return { ...row, completed_by_name: null }
  }
  if (table === 'library_articles') {
    return {
      ...row,
      image: row.image ?? null,
      images_json: row.images_json ?? null,
    }
  }
  return row
}

const database = new Database(sourcePath, { readonly: true })

try {
  const integrity = database.pragma('integrity_check') as Array<{ integrity_check: string }>
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
    throw new Error('La comprobación de integridad de SQLite ha fallado.')
  }
  const foreignKeyErrors = database.pragma('foreign_key_check') as unknown[]
  if (foreignKeyErrors.length > 0) throw new Error('SQLite contiene relaciones foráneas inválidas.')

  const knownTables = new Set(
    (database.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
    ).all() as Array<{ name: string }>).map(({ name }) => name),
  )
  const expectedTables = new Set(Object.keys(insertColumns))
  if (knownTables.size !== expectedTables.size ||
    [...knownTables].some((table) => !expectedTables.has(table))) {
    throw new Error('El esquema SQLite no coincide con las tablas conocidas de CheckApp.')
  }
  for (const table of Object.keys(insertColumns)) {
    if (!knownTables.has(table)) throw new Error(`No se encontró la tabla SQLite ${table}.`)
  }

  const output = [
    '-- CheckApp SQLite data export for import into a newly-created MariaDB database.',
    '-- Select the target database in phpMyAdmin before importing this file.',
    'SET NAMES utf8mb4;',
    'SET FOREIGN_KEY_CHECKS = 0;',
    ...tableDefinitions,
    'START TRANSACTION;',
  ]
  const counts: Record<string, number> = {}

  for (const [table, columns] of Object.entries(insertColumns)) {
    const sourceRows = database.prepare(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY rowid`).all() as SqliteRow[]
    const rows = sourceRows.map((row) => toMariaDbRow(table, row))
    counts[table] = rows.length

    for (let offset = 0; offset < rows.length; offset += 50) {
      const batch = rows.slice(offset, offset + 50)
      const values = batch.map((row) =>
        `(${columns.map((column) => sqlValue(row[column] ?? null)).join(', ')})`,
      )
      output.push(
        `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')}) VALUES\n${values.join(',\n')};`,
      )
    }
  }

  output.splice(1, 0, `-- Expected source row counts: ${Object.entries(counts)
    .map(([table, count]) => `${table}=${count}`)
    .join(', ')}`)
  output.push('COMMIT;', 'SET FOREIGN_KEY_CHECKS = 1;', '')
  writeFileSync(outputPath, output.join('\n'), { encoding: 'utf8', flag: 'wx' })
  console.log(JSON.stringify({ outputPath, bytes: Buffer.byteLength(output.join('\n')), counts }, null, 2))
} finally {
  database.close()
}
