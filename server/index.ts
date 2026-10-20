import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.ts'
import { createDatabase } from './database.ts'

const isMain = process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const databasePath = resolve(process.env.CHECKAPP_DATABASE ?? 'data/checkapp.sqlite')
  mkdirSync(dirname(databasePath), { recursive: true })
  const database = createDatabase(databasePath)
  const staticDirectory = resolve('dist')
  const app = createApp(database, process.argv.includes('--production') ? staticDirectory : undefined)
  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'
  const server = app.listen(port, host, () => {
    console.log(`CheckApp API disponible en http://${host}:${port}`)
    console.log(`Base de datos SQLite: ${databasePath}`)
  })

  const shutdown = () => {
    server.close(() => {
      database.close()
      process.exit(0)
    })
  }
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
}
